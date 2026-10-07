import {
  getSupabaseUrl,
  getServiceRoleKey,
  assertLocalDevHost,
  assertE2EEmailPattern,
  cleanupUserData,
  redact,
} from './db-helper';

export async function cleanupAllOrphanE2EUsers(): Promise<number> {
  const supabaseUrl = getSupabaseUrl();
  assertLocalDevHost(supabaseUrl);
  const serviceKey = getServiceRoleKey();

  console.log('\n[CLEANUP ORPHANS] Querying GoTrue Admin API for orphan E2E test users...');

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[CLEANUP ORPHANS ERROR] Failed to fetch users from GoTrue [${res.status}]: ${redact(errText)}`);
  }

  const data = await res.json();
  const allUsers: any[] = Array.isArray(data?.users) ? data.users : [];

  const orphanUsers = allUsers.filter((u) => {
    return u.email && /^e2e-.*@example\.invalid$/i.test(u.email);
  });

  console.log(`[CLEANUP ORPHANS] Found ${orphanUsers.length} orphan E2E user(s) matching e2e-*@example.invalid.`);

  let cleanedCount = 0;
  for (const user of orphanUsers) {
    try {
      assertE2EEmailPattern(user.email);
      console.log(`\n[CLEANUP ORPHANS] Cleaning orphan user ${user.id} (${user.email})...`);
      const result = await cleanupUserData(user.id, { skipQuiesce: true });
      console.log(`[CLEANUP ORPHANS] ✓ Cleaned user ${user.id}. Deleted entities:`, result.deleted);
      cleanedCount++;
    } catch (err: any) {
      console.error(`[CLEANUP ORPHANS ERROR] Failed cleaning user ${user.id}:`, err);
    }
  }

  console.log(`\n[CLEANUP ORPHANS] Completed. Successfully cleaned ${cleanedCount} orphan user(s).\n`);
  return cleanedCount;
}

if (require.main === module) {
  cleanupAllOrphanE2EUsers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
