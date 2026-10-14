import {
  getSupabaseUrl,
  getServiceRoleKey,
  assertLocalDevHost,
  assertE2EEmailPattern,
  cleanupUserData,
  redact,
} from './db-helper';

export interface OrphanSweepOptions {
  maxAgeMinutes?: number;
  dryRun?: boolean;
}

export async function cleanupAllOrphanE2EUsers(options: OrphanSweepOptions = {}): Promise<string[]> {
  const supabaseUrl = getSupabaseUrl();
  assertLocalDevHost(supabaseUrl);
  const serviceKey = getServiceRoleKey();

  const isDryRun = Boolean(options.dryRun);
  const maxAgeMinutes = options.maxAgeMinutes;

  console.log(
    `\n[CLEANUP ORPHANS] Scanning GoTrue Admin API for orphan E2E users${
      maxAgeMinutes ? ` older than ${maxAgeMinutes} minutes` : ''
    }${isDryRun ? ' [DRY-RUN MODE: ZERO DELETIONS]' : ''}...`
  );

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

  const now = Date.now();
  const cutoffTime = maxAgeMinutes ? now - maxAgeMinutes * 60 * 1000 : Infinity;

  const candidateOrphans = allUsers.filter((u) => {
    if (!u.email || !/^e2e-.*@example\.invalid$/i.test(u.email)) {
      return false;
    }
    if (maxAgeMinutes) {
      const createdAt = new Date(u.created_at).getTime();
      return createdAt <= cutoffTime;
    }
    return true;
  });

  console.log(`[CLEANUP ORPHANS] Found ${candidateOrphans.length} orphan E2E user(s) matching criteria.`);

  if (isDryRun) {
    for (const u of candidateOrphans) {
      console.log(`[CLEANUP ORPHANS DRY RUN] Would clean orphan: id=${u.id}, email=${u.email}, created_at=${u.created_at}`);
    }
    return candidateOrphans.map((u) => u.id);
  }

  const cleanedUserIds: string[] = [];
  for (const user of candidateOrphans) {
    assertE2EEmailPattern(user.email);
    console.log(`\n[CLEANUP ORPHANS] Cleaning orphan user ${user.id} (${user.email}, created ${user.created_at})...`);
    try {
      const result = await cleanupUserData(user.id, { skipQuiesce: true });
      console.log(`[CLEANUP ORPHANS] ✓ Successfully cleaned user ${user.id}. Entities removed:`, result.deleted);
      cleanedUserIds.push(user.id);
    } catch (err: any) {
      const errMsg = `[CLEANUP ORPHANS FATAL ERROR] Failed to clean orphan user ${user.id}: ${err.message}`;
      console.error(errMsg);
      throw new Error(errMsg);
    }
  }

  console.log(`\n[CLEANUP ORPHANS] Sweep finished. Successfully cleaned ${cleanedUserIds.length} orphan user(s).\n`);
  return cleanedUserIds;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  cleanupAllOrphanE2EUsers({ dryRun })
    .then((users) => {
      console.log(`[CLEANUP ORPHANS CLI] Done. Matched ${users.length} user(s).`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[CLEANUP ORPHANS CLI FATAL]', err.message);
      process.exit(1);
    });
}
