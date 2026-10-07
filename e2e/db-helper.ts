import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

export interface LeakCounts {
  assessment_sessions: number;
  assessments: number;
  assessment_reports: number;
  analysis_results: number;
  ai_usage_logs: number;
  speech_profiles: number;
  exercise_recommendations: number;
  user_exercise_history: number;
  practice_sessions: number;
  drill_attempts: number;
  profiles: number;
  auth_users: number;
  generated_passages: number;
  passage_pool: number;
  storage_objects: number;
  daily_tips: number;
  notifications: number;
  notification_preferences: number;
  security_logs: number;
  user_stats: number;
}

export interface SeededPassage {
  passageId: string;
  poolId: string;
  topic: string;
  difficulty: string;
  passageText: string;
}

export interface CreatedUser {
  id: string;
  email: string;
  password: string;
}

export interface CapturedIds {
  sessionId?: string;
  assessmentId?: string;
  reportId?: string;
  recommendationIds?: string[];
  recommendationsReady?: boolean;
}

export interface E2EState {
  runId: string;
  createdAt: string;
  testUser: CreatedUser;
  seededPassage: SeededPassage;
  beforeCounts: LeakCounts;
  observed?: CapturedIds;
}

// -----------------------------------------------------------------------------
// Safety Guards & Sanitization
// -----------------------------------------------------------------------------

export function assertLocalDevHost(urlStr: string): void {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname;
    if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) {
      throw new Error(`[SAFETY TRIPWIRE] Refusing execution on non-local Supabase host: "${hostname}"`);
    }
  } catch (err: any) {
    if (err.message.includes('[SAFETY TRIPWIRE]')) throw err;
    throw new Error(`[SAFETY TRIPWIRE] Invalid Supabase URL: "${urlStr}"`);
  }
}

export function assertValidFilterValue(val: unknown, paramName: string): void {
  if (val === undefined || val === null || val === '' || val === 'undefined' || val === 'null') {
    throw new Error(`[SAFETY GUARD] Invalid empty filter value for '${paramName}': "${String(val)}"`);
  }
  if (Array.isArray(val) && val.length === 0) {
    throw new Error(`[SAFETY GUARD] Empty array filter value for '${paramName}'`);
  }
}

export function assertE2EEmailPattern(email: string): void {
  if (!/^e2e-.*@example\.invalid$/i.test(email)) {
    throw new Error(`[SAFETY GUARD] Refusing action on non-E2E email: "${email}". Must match e2e-*@example.invalid`);
  }
}

export function redact(text: string): string {
  if (!text) return '';
  return text
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[REDACTED_JWT]')
    .replace(/(Authorization:\s*Bearer\s+)[^\s,]+/gi, '$1[REDACTED]')
    .replace(/(apikey:\s*)[^\s,]+/gi, '$1[REDACTED]');
}

export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !key.trim()) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for E2E database helper.');
  }
  return key.trim();
}

export function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const cleanUrl = url.replace(/\/$/, '');
  assertLocalDevHost(cleanUrl);
  return cleanUrl;
}

function getAuthHeaders(serviceKey: string, prefer = 'return=representation'): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}

// -----------------------------------------------------------------------------
// Validated REST Operations
// -----------------------------------------------------------------------------

export async function restGet(table: string, query: string): Promise<any[]> {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();
  const url = `${supabaseUrl}/rest/v1/${table}?${query}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(serviceKey, 'count=exact'),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[REST GET ERROR] GET ${table}?${query} failed [${res.status}]: ${redact(errText)}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function restDelete(
  table: string,
  filterCol: string,
  filterVal: string | string[],
  options: { allowZero?: boolean } = { allowZero: true }
): Promise<number> {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();

  assertValidFilterValue(filterCol, 'filterCol');
  assertValidFilterValue(filterVal, 'filterVal');

  let filterQuery = '';
  if (Array.isArray(filterVal)) {
    filterQuery = `${filterCol}=in.(${filterVal.map((v) => {
      assertValidFilterValue(v, `${filterCol} element`);
      return encodeURIComponent(v);
    }).join(',')})`;
  } else {
    filterQuery = `${filterCol}=eq.${encodeURIComponent(filterVal)}`;
  }

  const url = `${supabaseUrl}/rest/v1/${table}?${filterQuery}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(serviceKey, 'return=representation'),
  });

  if (!res.ok) {
    const errText = await res.text();
    const errMsg = `[REST DELETE ERROR] DELETE ${table}?${filterQuery} returned status ${res.status}: ${redact(errText)}`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  const deletedRows = await res.json();
  const count = Array.isArray(deletedRows) ? deletedRows.length : 0;
  console.log(`[REST DELETE] ${table}: deleted ${count} row(s) where ${filterCol}=${Array.isArray(filterVal) ? filterVal.join(',') : filterVal}`);

  if (!options.allowZero && count === 0) {
    throw new Error(`[REST DELETE ERROR] Expected to delete rows from ${table} where ${filterQuery}, but deleted 0 rows.`);
  }

  return count;
}

// -----------------------------------------------------------------------------
// Storage API Operations (Direct /storage/v1 API)
// -----------------------------------------------------------------------------

export async function listStorageObjects(prefix = ''): Promise<Array<{ name: string; id: string | null }>> {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();

  const res = await fetch(`${supabaseUrl}/storage/v1/object/list/assessment-recordings`, {
    method: 'POST',
    headers: getAuthHeaders(serviceKey),
    body: JSON.stringify({ prefix, limit: 1000 }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[STORAGE LIST ERROR] POST /storage/v1/object/list/assessment-recordings prefix="${prefix}" failed [${res.status}]: ${redact(errText)}`);
  }

  const items = await res.json();
  if (!Array.isArray(items)) return [];
  return items.map((item: any) => ({ name: item.name, id: item.id ?? null }));
}

export async function countAllStorageObjects(): Promise<number> {
  const topLevel = await listStorageObjects('');
  let total = 0;
  for (const item of topLevel) {
    if (item.id !== null) {
      total += 1;
    } else {
      // Folder: list contents
      const subItems = await listStorageObjects(item.name);
      for (const sub of subItems) {
        if (sub.id !== null) {
          total += 1;
        }
      }
    }
  }
  return total;
}

export async function deleteStorageObjects(paths: string[]): Promise<number> {
  if (!paths || paths.length === 0) return 0;
  for (const p of paths) {
    assertValidFilterValue(p, 'storage path');
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();

  const res = await fetch(`${supabaseUrl}/storage/v1/object/assessment-recordings`, {
    method: 'DELETE',
    headers: getAuthHeaders(serviceKey),
    body: JSON.stringify({ prefixes: paths }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[STORAGE DELETE ERROR] DELETE /storage/v1/object/assessment-recordings failed [${res.status}]: ${redact(errText)}`);
  }

  const data = await res.json();
  const deletedCount = Array.isArray(data) ? data.length : paths.length;
  console.log(`[STORAGE DELETE] Deleted ${deletedCount} storage object(s): ${paths.join(', ')}`);
  return deletedCount;
}

// -----------------------------------------------------------------------------
// Database Count & Leak Capture
// -----------------------------------------------------------------------------

async function fetchTableCount(tableName: string, supabaseUrl: string, serviceKey: string): Promise<number> {
  const res = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=*`, {
    method: 'HEAD',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'count=exact',
    },
  });

  if (!res.ok) {
    throw new Error(`[FETCH COUNT ERROR] HEAD ${tableName} failed [${res.status}]`);
  }

  const contentRange = res.headers.get('content-range');
  if (contentRange) {
    const parts = contentRange.split('/');
    if (parts.length === 2 && !isNaN(Number(parts[1]))) {
      return Number(parts[1]);
    }
  }
  return 0;
}

async function fetchAuthUsersCount(supabaseUrl: string, serviceKey: string): Promise<number> {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!res.ok) {
    throw new Error(`[AUTH COUNT ERROR] GET /auth/v1/admin/users failed [${res.status}]`);
  }
  const data = await res.json();
  return Array.isArray(data?.users) ? data.users.length : 0;
}

export async function captureLeakCounts(): Promise<LeakCounts> {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();

  const [
    assessment_sessions,
    assessments,
    assessment_reports,
    analysis_results,
    ai_usage_logs,
    speech_profiles,
    exercise_recommendations,
    user_exercise_history,
    practice_sessions,
    drill_attempts,
    profiles,
    auth_users,
    generated_passages,
    passage_pool,
    storage_objects,
    daily_tips,
    notifications,
    notification_preferences,
    security_logs,
    user_stats,
  ] = await Promise.all([
    fetchTableCount('assessment_sessions', supabaseUrl, serviceKey),
    fetchTableCount('assessments', supabaseUrl, serviceKey),
    fetchTableCount('assessment_reports', supabaseUrl, serviceKey),
    fetchTableCount('analysis_results', supabaseUrl, serviceKey),
    fetchTableCount('ai_usage_logs', supabaseUrl, serviceKey),
    fetchTableCount('speech_profiles', supabaseUrl, serviceKey),
    fetchTableCount('exercise_recommendations', supabaseUrl, serviceKey),
    fetchTableCount('user_exercise_history', supabaseUrl, serviceKey),
    fetchTableCount('practice_sessions', supabaseUrl, serviceKey),
    fetchTableCount('drill_attempts', supabaseUrl, serviceKey),
    fetchTableCount('profiles', supabaseUrl, serviceKey),
    fetchAuthUsersCount(supabaseUrl, serviceKey),
    fetchTableCount('generated_passages', supabaseUrl, serviceKey),
    fetchTableCount('passage_pool', supabaseUrl, serviceKey),
    countAllStorageObjects(),
    fetchTableCount('daily_tips', supabaseUrl, serviceKey),
    fetchTableCount('notifications', supabaseUrl, serviceKey),
    fetchTableCount('notification_preferences', supabaseUrl, serviceKey),
    fetchTableCount('security_logs', supabaseUrl, serviceKey),
    fetchTableCount('user_stats', supabaseUrl, serviceKey),
  ]);

  return {
    assessment_sessions,
    assessments,
    assessment_reports,
    analysis_results,
    ai_usage_logs,
    speech_profiles,
    exercise_recommendations,
    user_exercise_history,
    practice_sessions,
    drill_attempts,
    profiles,
    auth_users,
    generated_passages,
    passage_pool,
    storage_objects,
    daily_tips,
    notifications,
    notification_preferences,
    security_logs,
    user_stats,
  };
}

// -----------------------------------------------------------------------------
// Test User Lifecycle
// -----------------------------------------------------------------------------

export async function createTestUser(): Promise<CreatedUser> {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();

  const timestamp = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  const email = `e2e-${timestamp}-${rand}@example.invalid`;
  const password = `TestP@ss-${crypto.randomBytes(8).toString('hex')}`;

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: getAuthHeaders(serviceKey),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Cadence E2E Tester' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[CREATE USER ERROR] Failed to create E2E test user via admin API [${res.status}]: ${redact(errText)}`);
  }

  const data = await res.json();
  const userId = data.id || data.user?.id;
  assertValidFilterValue(userId, 'created userId');

  // Pre-fill profile row if not auto-created
  try {
    await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: getAuthHeaders(serviceKey, 'resolution=merge-duplicates'),
      body: JSON.stringify({
        id: userId,
        full_name: 'Cadence E2E Tester',
        username: `e2e_${rand}`,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn('[E2E DB] Warning while ensuring profile exists:', err);
  }

  return { id: userId, email, password };
}

// -----------------------------------------------------------------------------
// Deterministic Passages
// -----------------------------------------------------------------------------

export const SEEDED_PASSAGE_TEXT =
  'Effective communication in the workplace requires careful listening and thoughtful collaboration. When team members share their perspectives with clarity and empathy, projects advance smoothly and solve complex problems. Constructive feedback helps colleagues refine their skills and build professional confidence. Maintaining open dialogue across diverse teams inspires creative solutions and ensures everyone stays aligned with organizational goals.';

export async function insertDeterministicPassage(
  topic = 'workplace_communication',
  difficulty = 'medium'
): Promise<SeededPassage> {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();
  const passageId = crypto.randomUUID();
  const poolId = crypto.randomUUID();

  const gpRow = {
    id: passageId,
    passage_text: SEEDED_PASSAGE_TEXT,
    difficulty,
    topic,
    target_words: [
      { bucket: 'th_sound', word: 'thoughtful', word_code: 'th_thoughtful', char_start: 78, char_end: 88, issue_type: 'pronunciation' },
      { bucket: 'vowel_shift', word: 'clarity', word_code: 'vowel_clarity', char_start: 147, char_end: 154, issue_type: 'pronunciation' },
      { bucket: 'general', word: 'communication', word_code: 'gen_communication', char_start: 10, char_end: 23, issue_type: 'fluency' },
    ],
    word_count: SEEDED_PASSAGE_TEXT.split(/\s+/).filter(Boolean).length,
    generated_at: new Date().toISOString(),
  };

  const gpRes = await fetch(`${supabaseUrl}/rest/v1/generated_passages`, {
    method: 'POST',
    headers: getAuthHeaders(serviceKey, 'return=minimal'),
    body: JSON.stringify(gpRow),
  });

  if (!gpRes.ok) {
    const err = await gpRes.text();
    throw new Error(`[SEED PASSAGE ERROR] Failed to insert generated_passage [${gpRes.status}]: ${redact(err)}`);
  }

  const ppRow = {
    id: poolId,
    passage_id: passageId,
    topic,
    difficulty,
    status: 'available',
    created_at: new Date().toISOString(),
  };

  const ppRes = await fetch(`${supabaseUrl}/rest/v1/passage_pool`, {
    method: 'POST',
    headers: getAuthHeaders(serviceKey, 'return=minimal'),
    body: JSON.stringify(ppRow),
  });

  if (!ppRes.ok) {
    const err = await ppRes.text();
    throw new Error(`[SEED PASSAGE ERROR] Failed to insert passage_pool row [${ppRes.status}]: ${redact(err)}`);
  }

  return {
    passageId,
    poolId,
    topic,
    difficulty,
    passageText: SEEDED_PASSAGE_TEXT,
  };
}

export async function deleteDeterministicPassage(seeded: SeededPassage): Promise<void> {
  assertValidFilterValue(seeded?.poolId, 'seeded.poolId');
  assertValidFilterValue(seeded?.passageId, 'seeded.passageId');

  await restDelete('passage_pool', 'id', seeded.poolId);
  await restDelete('generated_passages', 'id', seeded.passageId);
}

// -----------------------------------------------------------------------------
// Dynamic Discovery of Entity IDs by Test User
// -----------------------------------------------------------------------------

export interface DiscoveredEntities {
  sessionIds: string[];
  assessmentIds: string[];
  reportIds: string[];
  speechProfileIds: string[];
  recommendationIds: string[];
  historyIds: string[];
  aiLogIds: string[];
  storagePaths: string[];
}

export async function discoverUserEntityIds(userId: string): Promise<DiscoveredEntities> {
  assertValidFilterValue(userId, 'userId');

  // 1. Sessions for user
  const sessionRows = await restGet('assessment_sessions', `user_id=eq.${userId}&select=id`);
  const sessionIds = sessionRows.map((r: any) => r.id);

  // 2. Assessments for user
  const assessmentRows = await restGet('assessments', `user_id=eq.${userId}&select=id`);
  const assessmentIds = assessmentRows.map((r: any) => r.id);

  // 3. Reports for sessions (assessment_reports has NO user_id column)
  let reportIds: string[] = [];
  if (sessionIds.length > 0) {
    const reportRows = await restGet('assessment_reports', `assessment_session_id=in.(${sessionIds.join(',')})&select=id`);
    reportIds = reportRows.map((r: any) => r.id);
  }

  // 4. Speech profiles
  const spRows = await restGet('speech_profiles', `user_id=eq.${userId}&select=id`);
  const speechProfileIds = spRows.map((r: any) => r.id);

  // 5. Recommendations
  const recRows = await restGet('exercise_recommendations', `user_id=eq.${userId}&select=id`);
  const recommendationIds = recRows.map((r: any) => r.id);

  // 6. User exercise history
  const histRows = await restGet('user_exercise_history', `user_id=eq.${userId}&select=id`);
  const historyIds = histRows.map((r: any) => r.id);

  // 7. AI usage logs (query both user_id and assessment_ids)
  const aiLogIdsSet = new Set<string>();
  const userAiLogs = await restGet('ai_usage_logs', `user_id=eq.${userId}&select=id`);
  for (const r of userAiLogs) aiLogIdsSet.add(r.id);

  if (assessmentIds.length > 0) {
    const assessAiLogs = await restGet('ai_usage_logs', `assessment_id=in.(${assessmentIds.join(',')})&select=id`);
    for (const r of assessAiLogs) aiLogIdsSet.add(r.id);
  }
  const aiLogIds = Array.from(aiLogIdsSet);

  // 8. Storage objects under userId/
  const storageObjs = await listStorageObjects(userId);
  const storagePaths = storageObjs.filter((o) => o.id !== null).map((o) => `${userId}/${o.name}`);

  return {
    sessionIds,
    assessmentIds,
    reportIds,
    speechProfileIds,
    recommendationIds,
    historyIds,
    aiLogIds,
    storagePaths,
  };
}

// -----------------------------------------------------------------------------
// Dynamic Sweep for All Public Tables with user_id
// -----------------------------------------------------------------------------

export function getPublicTablesWithUserId(): string[] {
  try {
    const out = execFileSync(
      'psql',
      [
        'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
        '-t',
        '-A',
        '-c',
        "SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'user_id' ORDER BY table_name;",
      ],
      { encoding: 'utf-8' }
    );
    const tables = out.trim().split('\n').filter(Boolean);
    if (tables.length > 0) return tables;
  } catch {}

  // Verified fallback if psql command line is not directly invoked
  return [
    'ai_usage_logs',
    'assessment_sessions',
    'assessments',
    'daily_tips',
    'exercise_recommendations',
    'notification_preferences',
    'notifications',
    'practice_sessions',
    'security_logs',
    'speech_profiles',
    'user_exercise_history',
    'user_stats',
  ];
}

export async function sweepAssertZeroRowsForUser(userId: string): Promise<void> {
  assertValidFilterValue(userId, 'userId');
  const tables = getPublicTablesWithUserId();
  const failures: Array<{ table: string; count: number }> = [];

  for (const table of tables) {
    try {
      const rows = await restGet(table, `user_id=eq.${userId}&select=user_id`);
      if (rows.length > 0) {
        failures.push({ table, count: rows.length });
      }
    } catch (err: any) {
      console.warn(`[SWEEP WARNING] Failed to sweep ${table}: ${err.message}`);
    }
  }

  // Also check profiles (keyed by id)
  const profileRows = await restGet('profiles', `id=eq.${userId}&select=id`);
  if (profileRows.length > 0) {
    failures.push({ table: 'profiles (id)', count: profileRows.length });
  }

  // Also check follows
  try {
    const followRows = await restGet('follows', `or=(follower_id.eq.${userId},following_id.eq.${userId})&select=follower_id`);
    if (followRows.length > 0) {
      failures.push({ table: 'follows', count: followRows.length });
    }
  } catch {}

  if (failures.length > 0) {
    const report = failures.map((f) => `${f.table}: ${f.count} row(s)`).join(', ');
    throw new Error(`[SWEEP VERIFICATION FAILED] Orphan rows detected for user ${userId} -> [${report}]`);
  }
}

// -----------------------------------------------------------------------------
// Quiesce Logic
// -----------------------------------------------------------------------------

export async function quiesceUserData(
  userId: string,
  options: { requireRecommendations?: boolean; stableWindowMs?: number; timeoutMs?: number } = {}
): Promise<void> {
  const stableWindowMs = options.stableWindowMs ?? 10_000;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const startTime = Date.now();

  console.log(`[QUIESCE] Waiting for pipeline quiescence for user ${userId} (stable window: ${stableWindowMs}ms, timeout: ${timeoutMs}ms)...`);

  let lastSignature = '';
  let stableSince = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const entities = await discoverUserEntityIds(userId);
    const signature = `${entities.sessionIds.length}:${entities.assessmentIds.length}:${entities.reportIds.length}:${entities.recommendationIds.length}:${entities.aiLogIds.length}`;

    if (signature !== lastSignature) {
      lastSignature = signature;
      stableSince = Date.now();
    } else {
      if (Date.now() - stableSince >= stableWindowMs) {
        console.log(`[QUIESCE] ✓ Pipeline state stable for ${stableWindowMs}ms. Ready to clean.`);
        return;
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  console.warn(`[QUIESCE WARNING] Quiescence window timed out after ${timeoutMs}ms. Proceeding with cleanup.`);
}

// -----------------------------------------------------------------------------
// Complete Dependency-Aware Cleanup
// -----------------------------------------------------------------------------

export interface CleanupResult {
  userId: string;
  deleted: Record<string, number>;
}

export async function cleanupUserData(
  userId: string,
  options: {
    seededPassage?: SeededPassage;
    expectedIds?: Partial<CapturedIds>;
    requireRecommendations?: boolean;
    skipQuiesce?: boolean;
  } = {}
): Promise<CleanupResult> {
  assertValidFilterValue(userId, 'userId');
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();

  // 1. Quiesce unless explicitly skipped (e.g. test crash or selftest)
  if (!options.skipQuiesce) {
    await quiesceUserData(userId, { requireRecommendations: options.requireRecommendations });
  }

  // 2. Discover all exact IDs
  const entities = await discoverUserEntityIds(userId);
  const deleted: Record<string, number> = {};

  // Cross-check against browser observed IDs
  if (options.expectedIds) {
    if (options.expectedIds.sessionId && !entities.sessionIds.includes(options.expectedIds.sessionId)) {
      console.warn(`[CLEANUP CROSS-CHECK MISMATCH] Browser observed sessionId ${options.expectedIds.sessionId} not found in DB!`);
    }
    if (options.expectedIds.reportId && !entities.reportIds.includes(options.expectedIds.reportId)) {
      console.warn(`[CLEANUP CROSS-CHECK MISMATCH] Browser observed reportId ${options.expectedIds.reportId} not found in DB!`);
    }
  }

  // 3. Delete ai_usage_logs FIRST (BEFORE deleting assessments/user, so ON DELETE SET NULL does not orphan)
  if (entities.aiLogIds.length > 0) {
    deleted.ai_usage_logs = await restDelete('ai_usage_logs', 'id', entities.aiLogIds);
  }

  // Also sweep any ai_usage_logs with user_id just in case
  await restDelete('ai_usage_logs', 'user_id', userId);

  // 4. Delete user_exercise_history (references exercise_recommendations with NO ACTION)
  if (entities.historyIds.length > 0) {
    deleted.user_exercise_history = await restDelete('user_exercise_history', 'id', entities.historyIds);
  } else {
    await restDelete('user_exercise_history', 'user_id', userId);
  }

  // 5. Delete exercise_recommendations
  if (entities.recommendationIds.length > 0) {
    deleted.exercise_recommendations = await restDelete('exercise_recommendations', 'id', entities.recommendationIds);
  } else {
    await restDelete('exercise_recommendations', 'user_id', userId);
  }

  // 6. Delete speech_profiles
  if (entities.speechProfileIds.length > 0) {
    deleted.speech_profiles = await restDelete('speech_profiles', 'id', entities.speechProfileIds);
  } else {
    await restDelete('speech_profiles', 'user_id', userId);
  }

  // 7. Delete assessment_reports by exact IDs / session IDs (remember: NO user_id column)
  if (entities.reportIds.length > 0) {
    deleted.assessment_reports = await restDelete('assessment_reports', 'id', entities.reportIds);
  } else if (entities.sessionIds.length > 0) {
    deleted.assessment_reports = await restDelete('assessment_reports', 'assessment_session_id', entities.sessionIds);
  }

  // 8. Delete analysis_results
  if (entities.assessmentIds.length > 0) {
    deleted.analysis_results = await restDelete('analysis_results', 'assessment_id', entities.assessmentIds);
  }

  // 9. Delete assessments
  if (entities.assessmentIds.length > 0) {
    deleted.assessments = await restDelete('assessments', 'id', entities.assessmentIds);
  } else {
    await restDelete('assessments', 'user_id', userId);
  }

  // 10. Delete assessment_sessions
  if (entities.sessionIds.length > 0) {
    deleted.assessment_sessions = await restDelete('assessment_sessions', 'id', entities.sessionIds);
  } else {
    await restDelete('assessment_sessions', 'user_id', userId);
  }

  // 11. Delete storage objects under userId/
  if (entities.storagePaths.length > 0) {
    deleted.storage_objects = await deleteStorageObjects(entities.storagePaths);
  } else {
    const remainingUserObjects = await listStorageObjects(userId);
    const remainingPaths = remainingUserObjects.filter((o) => o.id !== null).map((o) => `${userId}/${o.name}`);
    if (remainingPaths.length > 0) {
      deleted.storage_objects = await deleteStorageObjects(remainingPaths);
    }
  }

  // 12. Delete seeded passages if provided
  if (options.seededPassage) {
    await deleteDeterministicPassage(options.seededPassage);
    deleted.seeded_passages = 1;
  }

  // 13. Sweep delete any remaining rows in public tables with user_id
  const sweepTables = getPublicTablesWithUserId();
  for (const t of sweepTables) {
    if (!['ai_usage_logs', 'assessment_sessions', 'assessments', 'speech_profiles', 'exercise_recommendations', 'user_exercise_history'].includes(t)) {
      try {
        await restDelete(t, 'user_id', userId);
      } catch (err: any) {
        console.warn(`[CLEANUP SWEEP WARNING] Could not clean ${t}: ${err.message}`);
      }
    }
  }

  // 14. Delete profile row
  try {
    await restDelete('profiles', 'id', userId);
    deleted.profiles = 1;
  } catch {}

  // 15. Delete user from auth.users via GoTrue Admin API
  const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(serviceKey),
  });

  if (!authRes.ok) {
    const errText = await authRes.text();
    throw new Error(`[DELETE AUTH USER ERROR] DELETE /auth/v1/admin/users/${userId} failed [${authRes.status}]: ${redact(errText)}`);
  }
  deleted.auth_users = 1;
  console.log(`[AUTH DELETE] Deleted user ${userId} from auth.users`);

  // 16. Post-cleanup delay (1500ms) to detect late async writes
  await new Promise((r) => setTimeout(r, 1500));

  // 17. Run sweep verification
  await sweepAssertZeroRowsForUser(userId);

  return { userId, deleted };
}
