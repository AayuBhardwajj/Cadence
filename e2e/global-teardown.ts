import fs from 'fs';
import path from 'path';
import {
  captureLeakCounts,
  cleanupUserData,
  assertE2EEmailPattern,
  restGet,
  E2EState,
  LeakCounts,
} from './db-helper';

const STATE_FILE = path.resolve(__dirname, '.state.json');

// -----------------------------------------------------------------------------
// GLOBAL DELTA POLICY SPECIFICATION:
// 1. User-Owned Tables (Hard Failure on any non-zero delta):
//    Tables where the E2E user's data exclusively lives. Any delta !== 0 indicates
//    an orphaned record or damaged baseline data.
// 2. Background-Written Tables (generated_passages, passage_pool, ai_usage_logs, daily_tips):
//    - Delta < 0: Hard failure (indicates unintended deletion of baseline/cron data).
//    - Delta > 0: Inspect every extra row created since test setup timestamp:
//      * Attributable to test user -> HARD FAILURE (leak).
//      * Unattributable to test user (e.g. cron refill, system jobs) -> WARNING (advisory).
// -----------------------------------------------------------------------------

const USER_OWNED_TABLES: Array<keyof LeakCounts> = [
  'assessment_sessions',
  'assessments',
  'assessment_reports',
  'analysis_results',
  'speech_profiles',
  'exercise_recommendations',
  'user_exercise_history',
  'practice_sessions',
  'drill_attempts',
  'profiles',
  'auth_users',
  'storage_objects',
  'notifications',
  'notification_preferences',
  'security_logs',
  'user_stats',
];

const BACKGROUND_WRITTEN_TABLES: Array<keyof LeakCounts> = [
  'generated_passages',
  'passage_pool',
  'ai_usage_logs',
  'daily_tips',
];

export async function inspectBackgroundTableExtras(
  table: keyof LeakCounts,
  createdAtIso: string,
  testUserId: string,
  seededPassageId?: string
): Promise<{ attributableLeaks: string[]; unattributableNotes: string[] }> {
  const attributableLeaks: string[] = [];
  const unattributableNotes: string[] = [];

  try {
    if (table === 'ai_usage_logs') {
      const rows = await restGet(
        'ai_usage_logs',
        `created_at=gte.${encodeURIComponent(createdAtIso)}&select=id,created_at,user_id,assessment_id,purpose`
      );
      for (const r of rows) {
        if (r.user_id === testUserId) {
          attributableLeaks.push(`ai_usage_logs row attributable to test user: id=${r.id}, purpose=${r.purpose}`);
        } else {
          unattributableNotes.push(
            `ai_usage_logs background row: id=${r.id}, purpose=${r.purpose}, user_id=${r.user_id ?? 'null'}`
          );
        }
      }
    } else if (table === 'daily_tips') {
      const rows = await restGet(
        'daily_tips',
        `generated_at=gte.${encodeURIComponent(createdAtIso)}&select=id,user_id,generated_at`
      );
      for (const r of rows) {
        if (r.user_id === testUserId) {
          attributableLeaks.push(`daily_tips row attributable to test user: id=${r.id}`);
        } else {
          unattributableNotes.push(`daily_tips background row: id=${r.id}, user_id=${r.user_id}`);
        }
      }
    } else if (table === 'generated_passages') {
      const rows = await restGet(
        'generated_passages',
        `generated_at=gte.${encodeURIComponent(createdAtIso)}&select=id,topic,difficulty,generated_at`
      );
      for (const r of rows) {
        if (r.id === seededPassageId) {
          attributableLeaks.push(`generated_passages row attributable to seeded passage: id=${r.id}`);
        } else {
          unattributableNotes.push(`generated_passages cron-refilled passage: id=${r.id}, topic=${r.topic}`);
        }
      }
    } else if (table === 'passage_pool') {
      const rows = await restGet(
        'passage_pool',
        `created_at=gte.${encodeURIComponent(createdAtIso)}&select=id,passage_id,topic,created_at`
      );
      for (const r of rows) {
        if (r.passage_id === seededPassageId) {
          attributableLeaks.push(`passage_pool row attributable to seeded passage: id=${r.id}`);
        } else {
          unattributableNotes.push(`passage_pool cron-refilled pool row: id=${r.id}, topic=${r.topic}`);
        }
      }
    }
  } catch (err: any) {
    unattributableNotes.push(`Could not query details for ${table}: ${err.message}`);
  }

  return { attributableLeaks, unattributableNotes };
}

export default async function globalTeardown() {
  console.log('\n======================================================');
  console.log('>>> [GLOBAL TEARDOWN] E2E CLEANUP & LEAK CHECK <<<');
  console.log('======================================================');

  // 1. Verify State File
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error(
      '[GLOBAL TEARDOWN ERROR] State file .state.json is missing! Refusing cleanup to prevent deleting arbitrary data.'
    );
  }

  let state: E2EState;
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch (err: any) {
    throw new Error(`[GLOBAL TEARDOWN ERROR] Failed to parse .state.json: ${err.message}. Aborting.`);
  }

  if (!state?.runId || !state?.testUser?.id) {
    throw new Error(
      '[GLOBAL TEARDOWN ERROR] State file is missing required fields (runId, testUser.id). Aborting.'
    );
  }

  // 2. Validate Run ID consistency against process environment
  const envRunId = process.env.E2E_RUN_ID;
  if (envRunId && envRunId !== state.runId) {
    throw new Error(
      `[GLOBAL TEARDOWN ERROR] Run ID mismatch! Environment E2E_RUN_ID="${envRunId}" !== State runId="${state.runId}". Aborting.`
    );
  }
  console.log(`[GLOBAL TEARDOWN] Validated Run ID: ${state.runId}`);

  // 3. Safety Check: Verify User Email is an E2E Test Email
  if (state.testUser.email) {
    assertE2EEmailPattern(state.testUser.email);
  }

  // 4. Execute Dependency-Aware Cleanup
  console.log(`[GLOBAL TEARDOWN] Cleaning up test user ${state.testUser.id} and dependent entities...`);
  const cleanupResult = await cleanupUserData(state.testUser.id, {
    seededPassage: state.seededPassage,
    expectedIds: state.observed,
    requireRecommendations: Boolean(state.observed?.recommendationsReady),
  });
  console.log('[GLOBAL TEARDOWN] Cleanup completed. Entities removed:', cleanupResult.deleted);

  // 5. Post-run Leak Check
  console.log('[GLOBAL TEARDOWN] Capturing post-run database & storage counts...');
  const afterCounts = await captureLeakCounts();
  console.log('[GLOBAL TEARDOWN] Post-run counts:');
  console.table(afterCounts);

  if (state.beforeCounts) {
    const before: LeakCounts = state.beforeCounts;
    const deltas: Record<string, { before: number; after: number; delta: number }> = {};
    const hardFailures: string[] = [];
    const advisoryWarnings: string[] = [];

    for (const key of Object.keys(afterCounts) as Array<keyof LeakCounts>) {
      const b = before[key] ?? 0;
      const a = afterCounts[key] ?? 0;
      const d = a - b;
      deltas[key] = { before: b, after: a, delta: d };

      // Apply Global Delta Policy:
      if (USER_OWNED_TABLES.includes(key)) {
        if (d !== 0) {
          hardFailures.push(`User-owned table ${key} non-zero delta: ${d > 0 ? `+${d}` : d} (before: ${b}, after: ${a})`);
        }
      } else if (BACKGROUND_WRITTEN_TABLES.includes(key)) {
        if (d < 0) {
          hardFailures.push(`Background table ${key} negative delta: ${d} (unexpected deletion of baseline data)`);
        } else if (d > 0) {
          // Inspect extra rows
          const { attributableLeaks, unattributableNotes } = await inspectBackgroundTableExtras(
            key,
            state.createdAt,
            state.testUser.id,
            state.seededPassage?.passageId
          );

          if (attributableLeaks.length > 0) {
            hardFailures.push(
              `Background table ${key} has +${d} delta with E2E leaks: ${attributableLeaks.join('; ')}`
            );
          } else {
            advisoryWarnings.push(
              `Background table ${key} has +${d} delta (unattributable background activity): ${unattributableNotes.join('; ')}`
            );
          }
        }
      }
    }

    console.log('\n[GLOBAL TEARDOWN] Leak Check Delta Summary:');
    console.table(deltas);

    if (advisoryWarnings.length > 0) {
      console.log('\n[GLOBAL TEARDOWN ADVISORY WARNINGS]');
      for (const w of advisoryWarnings) console.warn(`- ${w}`);
    }

    if (hardFailures.length > 0) {
      console.error('\n[GLOBAL TEARDOWN HARD FAILURES DETECTED]');
      for (const f of hardFailures) console.error(`✖ ${f}`);
      throw new Error(
        `[GLOBAL TEARDOWN FAILURE] Violations of Global Delta Policy detected:\n${hardFailures.join('\n')}`
      );
    } else {
      console.log('[GLOBAL TEARDOWN] ✓ All deltas satisfy the Global Delta Policy. No leaks detected.');
    }
  }

  // 6. Clean up state file on successful teardown
  if (fs.existsSync(STATE_FILE)) {
    try {
      fs.unlinkSync(STATE_FILE);
      console.log('[GLOBAL TEARDOWN] Unlinked .state.json');
    } catch {}
  }

  console.log('[GLOBAL TEARDOWN] Teardown complete.\n');
}
