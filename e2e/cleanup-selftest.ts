import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  captureLeakCounts,
  createTestUser,
  insertDeterministicPassage,
  cleanupUserData,
  sweepAssertZeroRowsForUser,
  listStorageObjects,
  getSupabaseUrl,
  getServiceRoleKey,
  assertLocalDevHost,
  restDelete,
  LeakCounts,
  E2EState,
} from './db-helper';
import globalTeardown from './global-teardown';

const STATE_FILE = path.resolve(__dirname, '.state.json');

async function uploadSyntheticStorageObject(userId: string, filename: string): Promise<void> {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();

  const res = await fetch(`${supabaseUrl}/storage/v1/object/assessment-recordings/${userId}/${filename}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'video/webm',
    },
    body: 'RIFF....WEBM synthetic test audio data',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[SELFTEST ERROR] Failed to upload synthetic storage object: ${err}`);
  }
}

async function insertSyntheticRows(userId: string) {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  const sessionId = crypto.randomUUID();
  const assessmentId = crypto.randomUUID();
  const reportId = crypto.randomUUID();
  const speechProfileId = crypto.randomUUID();
  const recId = crypto.randomUUID();
  const historyId = crypto.randomUUID();
  const aiLog1Id = crypto.randomUUID();
  const aiLog2Id = crypto.randomUUID();

  // 1. assessment_sessions
  const sessionRes = await fetch(`${supabaseUrl}/rest/v1/assessment_sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: sessionId,
      user_id: userId,
      topic_id: 'workplace',
      status: 'completed',
      duration_seconds: 15,
      created_at: new Date().toISOString(),
    }),
  });
  if (!sessionRes.ok) throw new Error(`Failed to insert synthetic session: ${await sessionRes.text()}`);

  // 2. assessments
  const assessRes = await fetch(`${supabaseUrl}/rest/v1/assessments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: assessmentId,
      user_id: userId,
      overall_score: 85,
      wpm: 125,
      created_at: new Date().toISOString(),
    }),
  });
  if (!assessRes.ok) throw new Error(`Failed to insert synthetic assessment: ${await assessRes.text()}`);

  // 3. assessment_reports
  const reportRes = await fetch(`${supabaseUrl}/rest/v1/assessment_reports`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: reportId,
      assessment_session_id: sessionId,
      overall_score: 85,
      cefr_level: 'B2',
      created_at: new Date().toISOString(),
    }),
  });
  if (!reportRes.ok) throw new Error(`Failed to insert synthetic report: ${await reportRes.text()}`);

  // 4. speech_profiles
  const spRes = await fetch(`${supabaseUrl}/rest/v1/speech_profiles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: speechProfileId,
      user_id: userId,
      profile_version: 1,
      weakness_priority_1: 'pronunciation',
      created_at: new Date().toISOString(),
    }),
  });
  if (!spRes.ok) throw new Error(`Failed to insert synthetic speech profile: ${await spRes.text()}`);

  // 5. exercise_recommendations
  const recRes = await fetch(`${supabaseUrl}/rest/v1/exercise_recommendations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: recId,
      user_id: userId,
      priority_rank: 1,
      is_active: true,
      created_at: new Date().toISOString(),
    }),
  });
  if (!recRes.ok) throw new Error(`Failed to insert synthetic recommendation: ${await recRes.text()}`);

  // 6. user_exercise_history
  const histRes = await fetch(`${supabaseUrl}/rest/v1/user_exercise_history`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: historyId,
      user_id: userId,
      recommendation_id: recId,
      score: 90,
      completed_at: new Date().toISOString(),
    }),
  });
  if (!histRes.ok) throw new Error(`Failed to insert synthetic exercise history: ${await histRes.text()}`);

  // 7. ai_usage_logs with assessment_id
  const aiLog1Res = await fetch(`${supabaseUrl}/rest/v1/ai_usage_logs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: aiLog1Id,
      user_id: userId,
      assessment_id: assessmentId,
      provider: 'groq',
      model: 'llama3-70b',
      purpose: 'diagnostic_tier',
      input_tokens: 100,
      output_tokens: 200,
      estimated_cost_usd: 0.0005,
      created_at: new Date().toISOString(),
    }),
  });
  if (!aiLog1Res.ok) throw new Error(`Failed to insert synthetic AI log 1: ${await aiLog1Res.text()}`);

  // 8. ai_usage_logs with ONLY user_id (assessment_id NULL)
  const aiLog2Res = await fetch(`${supabaseUrl}/rest/v1/ai_usage_logs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: aiLog2Id,
      user_id: userId,
      assessment_id: null,
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      purpose: 'volume_tier',
      input_tokens: 50,
      output_tokens: 100,
      estimated_cost_usd: 0.0001,
      created_at: new Date().toISOString(),
    }),
  });
  if (!aiLog2Res.ok) throw new Error(`Failed to insert synthetic AI log 2: ${await aiLog2Res.text()}`);

  return {
    sessionId,
    assessmentId,
    reportId,
    speechProfileId,
    recId,
    historyId,
    aiLog1Id,
    aiLog2Id,
  };
}

export async function runSelfTest() {
  console.log('\n======================================================');
  console.log('>>> [SELF-TEST] STARTING E2E CLEANUP SELF-TEST <<<');
  console.log('======================================================\n');

  assertLocalDevHost(getSupabaseUrl());

  // =========================================================================
  // TEST 1: POSITIVE TEST — COMPLETE SYNTHETIC DATA LIFECYCLE
  // =========================================================================
  console.log('--- [TEST 1: POSITIVE TEST — SYNTHETIC ROW CREATION & CLEANUP] ---');

  // 1. Capture baseline counts
  console.log('[TEST 1] Capturing baseline database counts...');
  const baselineCounts = await captureLeakCounts();
  console.table(baselineCounts);

  // 2. Create throwaway user
  console.log('[TEST 1] Creating throwaway user...');
  const testUser = await createTestUser();
  console.log(`[TEST 1] Throwaway user created: ${testUser.id} (${testUser.email})`);

  // 3. Seed passage
  console.log('[TEST 1] Seeding deterministic passage...');
  const seededPassage = await insertDeterministicPassage('workplace_communication', 'medium');

  // 4. Insert synthetic rows across all tables
  console.log('[TEST 1] Inserting synthetic rows in all target tables...');
  const ids = await insertSyntheticRows(testUser.id);
  console.log('[TEST 1] Synthetic rows inserted:', ids);

  // 5. Upload synthetic storage object & PROVE list works
  console.log('[TEST 1] Uploading synthetic storage object...');
  await uploadSyntheticStorageObject(testUser.id, 'selftest-recording.webm');

  console.log('[TEST 1] Proving storage listing endpoint by discovering uploaded object...');
  const storageListBefore = await listStorageObjects(testUser.id);
  const foundObject = storageListBefore.find((o) => o.name === 'selftest-recording.webm');
  if (!foundObject) {
    throw new Error('[TEST 1 FAILURE] Storage list failed to find synthetic object! Listing endpoint broken.');
  }
  console.log(`[TEST 1] ✓ Proved storage listing: found "${foundObject.name}" (ID: ${foundObject.id})`);

  // 6. Run complete cleanup
  console.log('[TEST 1] Running cleanupUserData()...');
  const cleanupRes = await cleanupUserData(testUser.id, {
    seededPassage,
    skipQuiesce: true,
  });
  console.log('[TEST 1] Cleanup summary:', cleanupRes.deleted);

  // 7. Verify dynamic sweep asserts 0 rows for user
  console.log('[TEST 1] Running dynamic sweep verification...');
  await sweepAssertZeroRowsForUser(testUser.id);
  console.log('[TEST 1] ✓ Dynamic sweep passed: 0 rows found across all tables for user.');

  // 8. Verify storage object is gone
  const storageListAfter = await listStorageObjects(testUser.id);
  if (storageListAfter.length > 0) {
    throw new Error(`[TEST 1 FAILURE] Storage objects remained for user: ${JSON.stringify(storageListAfter)}`);
  }
  console.log('[TEST 1] ✓ Storage verification passed: 0 objects remaining for user.');

  // 9. Verify global count delta is exactly 0
  console.log('[TEST 1] Capturing post-cleanup global counts...');
  const postCounts = await captureLeakCounts();
  let hasDelta = false;
  const deltas: Record<string, { before: number; after: number; delta: number }> = {};

  for (const k of Object.keys(postCounts) as Array<keyof LeakCounts>) {
    const b = baselineCounts[k] ?? 0;
    const a = postCounts[k] ?? 0;
    const d = a - b;
    deltas[k] = { before: b, after: a, delta: d };
    if (d !== 0) hasDelta = true;
  }
  console.table(deltas);

  if (hasDelta) {
    throw new Error('[TEST 1 FAILURE] Global count delta is not 0 after cleanup!');
  }
  console.log('[TEST 1] ✓ POSITIVE TEST PASSED: All synthetic data cleanly purged, global deltas = 0.\n');

  // =========================================================================
  // TEST 2: NEGATIVE TEST — FORCED DELETION FAILURE PROPAGATES
  // =========================================================================
  console.log('--- [TEST 2: NEGATIVE TEST — FORCED DELETION FAILURE MUST THROW] ---');
  let threwExpected = false;
  try {
    // Attempt to delete with an empty filter value or invalid column to trigger safety guard / HTTP 400
    await restDelete('assessment_reports', 'user_id', 'non-existent-user-id');
  } catch (err: any) {
    threwExpected = true;
    console.log(`[TEST 2] ✓ Expected failure caught: "${err.message}"`);
  }

  if (!threwExpected) {
    throw new Error('[TEST 2 FAILURE] restDelete did not throw on invalid column! Failures are being swallowed.');
  }
  console.log('[TEST 2] ✓ NEGATIVE TEST PASSED: Failures propagate as hard errors.\n');

  // =========================================================================
  // TEST 3: NEGATIVE TEST — STALE / MISMATCHED STATE FILE CAUSES LOUD ABORT
  // =========================================================================
  console.log('--- [TEST 3: NEGATIVE TEST — RUN_ID MISMATCH CAUSES LOUD ABORT] ---');
  // Write a mock .state.json with mismatched runId
  const mockState: E2EState = {
    runId: 'mock-run-id-12345',
    createdAt: new Date().toISOString(),
    testUser: {
      id: crypto.randomUUID(),
      email: 'e2e-mock@example.invalid',
      password: 'password',
    },
    seededPassage: {
      passageId: crypto.randomUUID(),
      poolId: crypto.randomUUID(),
      topic: 'test',
      difficulty: 'easy',
      passageText: 'test text',
    },
    beforeCounts: baselineCounts,
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(mockState, null, 2), 'utf-8');

  // Set environment variable to a different runId
  process.env.E2E_RUN_ID = 'different-run-id-99999';

  let teardownAborted = false;
  try {
    await globalTeardown();
  } catch (err: any) {
    teardownAborted = true;
    console.log(`[TEST 3] ✓ Teardown aborted loudly as expected: "${err.message}"`);
  } finally {
    delete process.env.E2E_RUN_ID;
    if (fs.existsSync(STATE_FILE)) {
      try { fs.unlinkSync(STATE_FILE); } catch {}
    }
  }

  if (!teardownAborted) {
    throw new Error('[TEST 3 FAILURE] globalTeardown did not abort when runId mismatched! Guard is missing.');
  }
  console.log('[TEST 3] ✓ NEGATIVE TEST PASSED: State mismatch successfully aborts with zero deletions.\n');

  console.log('======================================================');
  console.log('>>> ALL 3 SELF-TEST CHECKS PASSED SUCCESSFULLY <<<');
  console.log('======================================================\n');
}

if (require.main === module) {
  runSelfTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n[SELF-TEST FATAL ERROR]', err.message);
      process.exit(1);
    });
}
