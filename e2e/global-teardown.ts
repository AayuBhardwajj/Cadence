import fs from 'fs';
import path from 'path';
import {
  captureLeakCounts,
  cleanupUserData,
  assertE2EEmailPattern,
  E2EState,
  LeakCounts,
} from './db-helper';

const STATE_FILE = path.resolve(__dirname, '.state.json');

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
    let hasLeak = false;

    for (const key of Object.keys(afterCounts) as Array<keyof LeakCounts>) {
      const b = before[key] ?? 0;
      const a = afterCounts[key] ?? 0;
      const d = a - b;
      deltas[key] = { before: b, after: a, delta: d };
      if (d !== 0) {
        hasLeak = true;
      }
    }

    console.log('\n[GLOBAL TEARDOWN] Leak Check Delta Summary:');
    console.table(deltas);

    if (hasLeak) {
      throw new Error(
        `[GLOBAL TEARDOWN FAILURE] Non-zero count delta detected in database/storage! See table above.`
      );
    } else {
      console.log('[GLOBAL TEARDOWN] ✓ All deltas are 0. No leaks detected.');
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
