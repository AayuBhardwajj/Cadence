import {
  getSupabaseUrl,
  getServiceRoleKey,
  assertLocalDevHost,
  assertE2EEmailPattern,
  captureLeakCounts,
  cleanupUserData,
  deleteStorageObjects,
  restDelete,
  restGet,
} from './db-helper';

const BASELINE_USER_ID = '6cecd582-299d-4baa-b512-d8e738cd383d';

export async function cleanPreviousRunResidue() {
  const supabaseUrl = getSupabaseUrl();
  assertLocalDevHost(supabaseUrl);
  const serviceKey = getServiceRoleKey();

  console.log('\n======================================================');
  console.log('>>> CLEANING APPROVED PREVIOUS-RUN RESIDUE <<<');
  console.log('======================================================');

  // 1. Capture Initial Counts
  console.log('\n[RESIDUE CLEANUP] Capturing initial counts...');
  const beforeCounts = await captureLeakCounts();
  console.log('[RESIDUE CLEANUP] Initial table counts:');
  console.table(beforeCounts);

  // 2. Clean Approved Users
  const usersToClean = [
    'fea1b42a-4a4c-4846-9fba-1159a9eda31d',
    '7aefa6dc-91c6-45be-8efb-da7db4a16b68',
  ];

  for (const userId of usersToClean) {
    if (userId === BASELINE_USER_ID) {
      throw new Error(`[CRITICAL TRIPWIRE] Refusing to touch baseline user ${BASELINE_USER_ID}!`);
    }

    // Verify user exists and email matches e2e pattern
    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (authRes.ok) {
      const u = await authRes.json();
      assertE2EEmailPattern(u.email);
      console.log(`\n[RESIDUE CLEANUP] Verified E2E email "${u.email}" for user ${userId}. Cleaning...`);
      const res = await cleanupUserData(userId, { skipQuiesce: true });
      console.log(`[RESIDUE CLEANUP] ✓ Successfully cleaned user ${userId}. Deleted:`, res.deleted);
    } else {
      console.log(`[RESIDUE CLEANUP] User ${userId} not found in auth.users (already removed). Sweeping dependent tables...`);
      const res = await cleanupUserData(userId, { skipQuiesce: true });
      console.log(`[RESIDUE CLEANUP] ✓ Swept user ${userId}. Deleted:`, res.deleted);
    }
  }

  // 3. Clean Seeded Passages
  const seededPassages = [
    { poolId: '21760e72-e83b-4b89-a317-e83e519508db', passageId: '1f4bbbf4-0ef0-4ade-a051-24037e467ea1' },
    { poolId: 'cbd4a00e-300c-4bf5-84a7-7b2a93c905f7', passageId: 'd3aecc31-03a3-4f66-94d9-a2ebd23a8962' },
  ];

  for (const sp of seededPassages) {
    try {
      console.log(`\n[RESIDUE CLEANUP] Deleting seeded passage ${sp.passageId} & pool ${sp.poolId}...`);
      await restDelete('passage_pool', 'id', sp.poolId);
      await restDelete('generated_passages', 'id', sp.passageId);
      console.log(`[RESIDUE CLEANUP] ✓ Seeded passage cleaned.`);
    } catch (err: any) {
      console.warn(`[RESIDUE CLEANUP WARNING] Passage cleanup note: ${err.message}`);
    }
  }

  // 4. Clean Storage Object for 2c91e504 (proven E2E user in auth audit logs)
  const orphanStoragePath = '2c91e504-e489-4450-b0ad-f62dd2381ef9/b76e438d-293f-4e26-8a9c-efd762d9a5f9.webm';
  console.log(`\n[RESIDUE CLEANUP] Deleting proven E2E storage object: ${orphanStoragePath}...`);
  try {
    await deleteStorageObjects([orphanStoragePath]);
    console.log(`[RESIDUE CLEANUP] ✓ Proven E2E storage object deleted.`);
  } catch (err: any) {
    console.warn(`[RESIDUE CLEANUP WARNING] Storage delete note: ${err.message}`);
  }

  // 5. Verify Baseline User Rows are Untouched
  console.log(`\n[RESIDUE CLEANUP] Verifying baseline user ${BASELINE_USER_ID} is 100% intact...`);
  const baselineProfile = await restGet('profiles', `id=eq.${BASELINE_USER_ID}`);
  if (baselineProfile.length === 0) {
    throw new Error(`[CRITICAL ERROR] Baseline profile ${BASELINE_USER_ID} was damaged!`);
  }
  const baselineSessions = await restGet('assessment_sessions', `user_id=eq.${BASELINE_USER_ID}`);
  if (baselineSessions.length !== 4) {
    throw new Error(`[CRITICAL ERROR] Baseline sessions changed! Expected 4, found ${baselineSessions.length}`);
  }
  console.log(`[RESIDUE CLEANUP] ✓ Baseline user ${BASELINE_USER_ID} verified intact (profile present, 4 sessions intact).`);

  // 6. Capture Post-Cleanup Counts and Display Deltas
  console.log('\n[RESIDUE CLEANUP] Capturing post-cleanup counts...');
  const afterCounts = await captureLeakCounts();
  console.log('[RESIDUE CLEANUP] Post-cleanup table counts:');
  console.table(afterCounts);

  const deltas: Record<string, { before: number; after: number; delta: number }> = {};
  for (const key of Object.keys(afterCounts) as Array<keyof typeof afterCounts>) {
    const b = beforeCounts[key] ?? 0;
    const a = afterCounts[key] ?? 0;
    deltas[key] = { before: b, after: a, delta: a - b };
  }

  console.log('\n[RESIDUE CLEANUP] Residue Cleanup Deltas:');
  console.table(deltas);
  console.log('[RESIDUE CLEANUP] Residue cleanup successfully finished.\n');
}

if (require.main === module) {
  cleanPreviousRunResidue()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
