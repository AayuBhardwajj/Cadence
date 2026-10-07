import http from 'http';
import net from 'net';

export interface PreflightOptions {
  supabaseUrl?: string;
  frontendUrl?: string;
  cadenceEnv?: string;
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
      console.error(`[PREFLIGHT] ✗ ${item.name} unreachable (${res.error ?? `status ${res.status}`})`);
      failed.push(`${item.name}: ${res.error ?? `status ${res.status}`}`);
    }
  }

  if (failed.length > 0) {
    throw new Error(
      `[PREFLIGHT FAILED] The following prerequisites are unreachable:\n  - ${failed.join('\n  - ')}\nEnsure all required services and the local dev stack are running before running E2E.`
    );
  }

  console.log('[PREFLIGHT] All safety guards and service health checks passed.');
}

if (require.main === module) {
  runPreflight()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
