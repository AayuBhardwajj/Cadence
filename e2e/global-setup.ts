import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { runPreflight } from './preflight';
import {
  captureLeakCounts,
  createTestUser,
  insertDeterministicPassage,
  E2EState,
} from './db-helper';

const STATE_FILE = path.resolve(__dirname, '.state.json');

export default async function globalSetup() {
  console.log('\n======================================================');
  console.log('>>> [GLOBAL SETUP] E2E PREFLIGHT & SETUP STARTING <<<');
  console.log('======================================================');

  // 1. Delete any stale state file from previous runs
  if (fs.existsSync(STATE_FILE)) {
    try {
      fs.unlinkSync(STATE_FILE);
      console.log('[GLOBAL SETUP] Cleaned up stale .state.json file.');
    } catch (err) {
      console.warn('[GLOBAL SETUP] Warning removing stale .state.json:', err);
    }
  }

  // 2. Generate unique Run ID for this test invocation
  const runId = crypto.randomUUID();
  process.env.E2E_RUN_ID = runId;
  console.log(`[GLOBAL SETUP] Initialized Run ID: ${runId}`);

  // 3. Run Preflight Safety Checks
  await runPreflight();

  // 4. Pre-run Leak Check
  console.log('[GLOBAL SETUP] Capturing baseline database & storage counts...');
  const beforeCounts = await captureLeakCounts();
  console.log('[GLOBAL SETUP] Baseline counts:');
  console.table(beforeCounts);

  // 5. Create Fresh E2E Test User
  console.log('[GLOBAL SETUP] Creating isolated test user via GoTrue Admin API...');
  const testUser = await createTestUser();
  console.log(`[GLOBAL SETUP] User created: ${testUser.email} (ID: ${testUser.id})`);

  // 6. Seed Deterministic Assessment Passage
  console.log('[GLOBAL SETUP] Seeding deterministic passage into passage_pool...');
  const seededPassage = await insertDeterministicPassage('workplace_communication', 'medium');
  console.log(`[GLOBAL SETUP] Seeded passage ID: ${seededPassage.passageId}, pool ID: ${seededPassage.poolId}`);

  // 7. Persist state for test runner and global teardown
  const state: E2EState = {
    runId,
    createdAt: new Date().toISOString(),
    testUser,
    seededPassage,
    beforeCounts,
    observed: {},
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');

  // Pass credentials via environment variables for workers
  process.env.E2E_USER_ID = testUser.id;
  process.env.E2E_USER_EMAIL = testUser.email;
  process.env.E2E_USER_PASSWORD = testUser.password;
  process.env.E2E_SEEDED_PASSAGE_ID = seededPassage.passageId;
  process.env.E2E_SEEDED_POOL_ID = seededPassage.poolId;

  console.log('[GLOBAL SETUP] Setup completed successfully.\n');
}
