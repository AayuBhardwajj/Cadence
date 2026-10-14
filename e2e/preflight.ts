import http from 'http';
import net from 'net';
import { execSync } from 'child_process';

export interface PreflightOptions {
  supabaseUrl?: string;
  frontendUrl?: string;
  cadenceEnv?: string;
}

export interface QueueStats {
  messages: number;
  messages_ready: number;
  messages_unacknowledged: number;
  consumers: number;
}

export interface QueueConsumerRequirement {
  queue: string;
  expectedService: string;
  remedy: string;
}

export const REQUIRED_QUEUES: QueueConsumerRequirement[] = [
  {
    queue: 'analysis.requested',
    expectedService: 'ml-audio',
    remedy: 'ml-audio is likely running in HTTP-only mode. Ensure RabbitMQ is up and restart ml-audio: npm run dev:ml-audio',
  },
  {
    queue: 'analysis.audio.completed',
    expectedService: 'ml-analysis',
    remedy: 'ml-analysis is likely running in HTTP-only mode. Ensure RabbitMQ is up and restart ml-analysis: npm run dev:ml-analysis',
  },
  {
    queue: 'report-service.analysis.completed',
    expectedService: 'report-service',
    remedy: 'report-service has not connected to RabbitMQ. Restart report-service: npm run dev:report-service',
  },
  {
    queue: 'ml-recommendation.analysis.completed',
    expectedService: 'ml-recommendation',
    remedy: 'ml-recommendation is likely running in HTTP-only mode. Ensure RabbitMQ is up and restart ml-recommendation: npm run dev:ml-recommendation',
  },
  {
    queue: 'recommendations.updated',
    expectedService: 'report-service',
    remedy: 'report-service has not bound to recommendations.updated. Restart report-service: npm run dev:report-service',
  },
];

export async function getRabbitMQQueueStats(): Promise<Record<string, QueueStats>> {
  const host = process.env.RABBITMQ_HOST || '127.0.0.1';
  const port = parseInt(process.env.RABBITMQ_MGMT_PORT || '15672', 10);
  const user = process.env.RABBITMQ_USERNAME || process.env.RABBITMQ_DEFAULT_USER || 'cadence';
  const pass = process.env.RABBITMQ_PASSWORD || process.env.RABBITMQ_DEFAULT_PASS || '';

  // 1. Try RabbitMQ Management API with credentials from env vars only (no literals)
  if (pass) {
    try {
      const stats = await new Promise<Record<string, QueueStats>>((resolve, reject) => {
        const auth = Buffer.from(`${user}:${pass}`).toString('base64');
        const req = http.request(
          {
            hostname: host,
            port: port,
            path: '/api/queues/%2F',
            method: 'GET',
            headers: {
              Authorization: `Basic ${auth}`,
            },
            timeout: 3000,
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
              if (res.statusCode === 200) {
                try {
                  const parsed = JSON.parse(body);
                  if (Array.isArray(parsed)) {
                    const map: Record<string, QueueStats> = {};
                    for (const q of parsed) {
                      if (q && q.name) {
                        map[q.name] = {
                          messages: q.messages ?? 0,
                          messages_ready: q.messages_ready ?? 0,
                          messages_unacknowledged: q.messages_unacknowledged ?? 0,
                          consumers: q.consumers ?? 0,
                        };
                      }
                    }
                    resolve(map);
                    return;
                  }
                } catch {}
              }
              reject(new Error(`Management API responded with status ${res.statusCode}`));
            });
          }
        );
        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Management API request timed out'));
        });
        req.end();
      });
      return stats;
    } catch {
      // Fallback to docker exec below
    }
  }

  // 2. Fallback: docker exec <container> rabbitmqctl list_queues
  try {
    const container = process.env.RABBITMQ_CONTAINER || 'cadence-rabbitmq';
    const raw = execSync(
      `docker exec ${container} rabbitmqctl list_queues name messages consumers messages_ready messages_unacknowledged --formatter json`,
      { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const map: Record<string, QueueStats> = {};
      for (const q of parsed) {
        if (q && q.name) {
          map[q.name] = {
            messages: q.messages ?? 0,
            messages_ready: q.messages_ready ?? 0,
            messages_unacknowledged: q.messages_unacknowledged ?? 0,
            consumers: q.consumers ?? 0,
          };
        }
      }
      return map;
    }
  } catch {
    // If fallback fails as well, return empty map
  }

  return {};
}

export async function checkHttpEndpoint(urlStr: string, timeoutMs = 3000): Promise<{ ok: boolean; status?: number; error?: string }> {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'GET',
          timeout: timeoutMs,
        },
        (res) => {
          resolve({ ok: (res.statusCode ?? 500) < 500, status: res.statusCode });
        }
      );
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'Timed out' });
      });
      req.end();
    } catch (e: any) {
      resolve({ ok: false, error: e?.message || 'Invalid URL' });
    }
  });
}

export async function checkTcpPort(host: string, port: number, timeoutMs = 2000): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      resolve({ ok: true });
    });
    socket.on('error', (err) => {
      socket.destroy();
      resolve({ ok: false, error: err.message });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ ok: false, error: 'Connection timed out' });
    });
    socket.connect(port, host);
  });
}

export async function runPreflight(options: PreflightOptions = {}) {
  const env = options.cadenceEnv ?? process.env.CADENCE_ENV;
  console.log('[PREFLIGHT] Checking safety guards and dev environment...');

  // 1. Guard: CADENCE_ENV must be 'dev'
  if (env !== 'dev') {
    throw new Error(`[PREFLIGHT SAFETY REFUSAL] CADENCE_ENV must be 'dev'. Current value: ${env ? `'${env}'` : 'UNSET'}. Aborting E2E run.`);
  }

  // 2. Guard: SUPABASE_URL must target 127.0.0.1 or localhost
  const supabaseUrlStr = options.supabaseUrl ?? process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
  let supabaseHost = '';
  try {
    const parsed = new URL(supabaseUrlStr);
    supabaseHost = parsed.hostname;
  } catch (err: any) {
    throw new Error(`[PREFLIGHT SAFETY REFUSAL] Invalid SUPABASE_URL '${supabaseUrlStr}': ${err.message}`);
  }

  if (!['127.0.0.1', 'localhost'].includes(supabaseHost)) {
    throw new Error(
      `[PREFLIGHT SAFETY REFUSAL] SUPABASE_URL host '${supabaseHost}' is forbidden. E2E tests are strictly prohibited from targeting external/prod URLs. Expected 127.0.0.1 or localhost.`
    );
  }

  // 3. Check API keys presence (names only, NEVER print values)
  const hasGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  console.log(`[PREFLIGHT] API key checks: GROQ_API_KEY present: ${hasGroq}, GEMINI_API_KEY present: ${hasGemini}`);
  if (!hasGroq && !hasGemini) {
    console.warn('[PREFLIGHT WARNING] Neither GROQ_API_KEY nor GEMINI_API_KEY is present in environment.');
  }

  // 4. Reachability checks
  const frontendUrl = options.frontendUrl ?? 'http://localhost:5173';
  const checks = [
    { name: 'Frontend (:5173)', check: () => checkHttpEndpoint(frontendUrl) },
    { name: 'Supabase API (:54321)', check: () => checkHttpEndpoint(`${supabaseUrlStr}/auth/v1/health`) },
    { name: 'content-service (:8084)', check: () => checkHttpEndpoint('http://127.0.0.1:8084/actuator/health') },
    { name: 'session-service (:8082)', check: () => checkHttpEndpoint('http://127.0.0.1:8082/actuator/health') },
    { name: 'report-service (:8083)', check: () => checkHttpEndpoint('http://127.0.0.1:8083/actuator/health') },
    { name: 'practice-game-service (:8085)', check: () => checkHttpEndpoint('http://127.0.0.1:8085/actuator/health') },
    { name: 'auth-service (:8081)', check: () => checkHttpEndpoint('http://127.0.0.1:8081/actuator/health') },
    { name: 'ml-audio (:9001)', check: () => checkHttpEndpoint('http://127.0.0.1:9001/health') },
    { name: 'ml-analysis (:9002)', check: () => checkHttpEndpoint('http://127.0.0.1:9002/health') },
    { name: 'ml-recommendation (:9003)', check: () => checkHttpEndpoint('http://127.0.0.1:9003/health') },
    { name: 'RabbitMQ (:5672)', check: () => checkTcpPort('127.0.0.1', 5672) },
    { name: 'Redis (:6379)', check: () => checkTcpPort('127.0.0.1', 6379) },
  ];

  const failed: string[] = [];
  for (const item of checks) {
    const res = await item.check();
    if (res.ok) {
      console.log(`[PREFLIGHT] ✓ ${item.name} is healthy`);
    } else {
      const statusDetail = res.error ?? ('status' in res ? `status ${(res as any).status}` : 'failed');
      console.error(`[PREFLIGHT] ✗ ${item.name} unreachable (${statusDetail})`);
      failed.push(`${item.name}: ${statusDetail}`);
    }
  }

  if (failed.length > 0) {
    throw new Error(
      `[PREFLIGHT FAILED] The following prerequisites are unreachable:\n  - ${failed.join('\n  - ')}\nEnsure all required services and the local dev stack are running before running E2E.`
    );
  }

  // 5. Verify RabbitMQ consumer counts for required queues
  console.log('[PREFLIGHT] Checking RabbitMQ consumer counts for required pipeline queues...');
  const queueStats = await getRabbitMQQueueStats();
  const queueFailures: string[] = [];

  for (const req of REQUIRED_QUEUES) {
    const stat = queueStats[req.queue];
    const consumerCount = stat ? stat.consumers : 0;
    if (consumerCount >= 1) {
      console.log(`[PREFLIGHT] ✓ Queue '${req.queue}' has active consumer (${consumerCount})`);
    } else {
      const detail = stat
        ? `has 0 consumers (messages ready: ${stat.messages_ready}, total: ${stat.messages})`
        : 'queue was not found or broker returned no data';
      console.error(
        `[PREFLIGHT] ✗ Queue '${req.queue}' ${detail}.\n` +
        `  -> Missing service: ${req.expectedService}\n` +
        `  -> Cause: ${req.expectedService} is likely running in HTTP-only mode.\n` +
        `  -> Remedy: ${req.remedy}`
      );
      queueFailures.push(
        `Queue '${req.queue}' (expected: ${req.expectedService}, consumers: ${consumerCount}): ${req.remedy}`
      );
    }
  }

  if (queueFailures.length > 0) {
    throw new Error(
      `[PREFLIGHT FAILED] Missing RabbitMQ consumers detected:\n  - ${queueFailures.join('\n  - ')}\n` +
      `Ensure RabbitMQ is running and listening on port 5672 BEFORE starting the ML services so they connect to AMQP instead of degrading to HTTP-only mode.`
    );
  }

  console.log('[PREFLIGHT] All safety guards, service health checks, and queue consumer checks passed.');
}

if (require.main === module) {
  runPreflight()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}

