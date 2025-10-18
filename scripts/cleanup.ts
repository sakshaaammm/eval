/*
  Data cleanup script for EvalGuard dashboard.
  Provides utilities to clean up synthetic data and reset the database state.
*/

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface CleanupOptions {
  userId?: string;
  olderThanDays?: number;
  keepCount?: number;
  dryRun?: boolean;
}

class DataCleanup {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getAllUsers(): Promise<Array<{id: string, email: string}>> {
    const { data, error } = await this.supabase.auth.admin.listUsers();
    if (error) throw error;
    
    return data.users.map(user => ({
      id: user.id,
      email: user.email || 'unknown@example.com'
    }));
  }

  async getEvaluationStats(userId?: string): Promise<{
    totalEvaluations: number;
    oldestEvaluation: string | null;
    newestEvaluation: string | null;
    averageScore: number | null;
    averageLatency: number | null;
  }> {
    let query = this.supabase
      .from('evaluations')
      .select('created_at, score, latency_ms');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        totalEvaluations: 0,
        oldestEvaluation: null,
        newestEvaluation: null,
        averageScore: null,
        averageLatency: null
      };
    }

    const scores = data.filter(d => d.score !== null).map(d => d.score!);
    const latencies = data.map(d => d.latency_ms);
    const dates = data.map(d => d.created_at).sort();

    return {
      totalEvaluations: data.length,
      oldestEvaluation: dates[0] || null,
      newestEvaluation: dates[dates.length - 1] || null,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length
    };
  }

  async cleanupEvaluations(options: CleanupOptions): Promise<number> {
    const { userId, olderThanDays, keepCount, dryRun = false } = options;

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No data will be deleted');
    }

    let query = this.supabase.from('evaluations').select('id, created_at');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (olderThanDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      query = query.lt('created_at', cutoffDate.toISOString());
    }

    // Order by created_at descending to keep the newest records
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('No evaluations found matching the criteria.');
      return 0;
    }

    let recordsToDelete = data;

    // If keepCount is specified, keep the newest records
    if (keepCount && keepCount > 0) {
      recordsToDelete = data.slice(keepCount);
    }

    if (recordsToDelete.length === 0) {
      console.log('No records to delete after applying keep count filter.');
      return 0;
    }

    console.log(`Found ${recordsToDelete.length} evaluations to delete`);

    if (dryRun) {
      console.log('Records that would be deleted:');
      recordsToDelete.slice(0, 10).forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id}, Created: ${record.created_at}`);
      });
      if (recordsToDelete.length > 10) {
        console.log(`  ... and ${recordsToDelete.length - 10} more records`);
      }
      return recordsToDelete.length;
    }

    // Delete records in batches to avoid overwhelming the database
    const batchSize = 100;
    let deletedCount = 0;

    for (let i = 0; i < recordsToDelete.length; i += batchSize) {
      const batch = recordsToDelete.slice(i, i + batchSize);
      const ids = batch.map(record => record.id);

      const { error: deleteError } = await this.supabase
        .from('evaluations')
        .delete()
        .in('id', ids);

      if (deleteError) {
        throw new Error(`Failed to delete batch: ${deleteError.message}`);
      }

      deletedCount += batch.length;
      console.log(`✅ Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records (${deletedCount}/${recordsToDelete.length} total)`);
    }

    return deletedCount;
  }

  async resetUserData(userId: string, dryRun = false): Promise<void> {
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No data will be deleted');
    }

    // Get evaluation count for this user
    const { count, error: countError } = await this.supabase
      .from('evaluations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) throw countError;

    console.log(`User ${userId} has ${count || 0} evaluations`);

    if (count === 0) {
      console.log('No evaluations found for this user.');
      return;
    }

    if (dryRun) {
      console.log(`Would delete ${count} evaluations for user ${userId}`);
      return;
    }

    // Delete all evaluations for this user
    const { error: deleteError } = await this.supabase
      .from('evaluations')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Failed to delete user evaluations: ${deleteError.message}`);
    }

    console.log(`✅ Deleted ${count} evaluations for user ${userId}`);
  }

  async resetAllData(dryRun = false): Promise<void> {
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No data will be deleted');
    }

    // Get total evaluation count
    const { count, error: countError } = await this.supabase
      .from('evaluations')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    console.log(`Total evaluations in database: ${count || 0}`);

    if (count === 0) {
      console.log('No evaluations found in the database.');
      return;
    }

    if (dryRun) {
      console.log(`Would delete all ${count} evaluations`);
      return;
    }

    // Delete all evaluations
    const { error: deleteError } = await this.supabase
      .from('evaluations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) {
      throw new Error(`Failed to delete all evaluations: ${deleteError.message}`);
    }

    console.log(`✅ Deleted all ${count} evaluations from the database`);
  }
}

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL as string;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const cleanup = new DataCleanup(supabase);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'stats';

  try {
    switch (command) {
      case 'stats':
        console.log('📊 Database Statistics:');
        const users = await cleanup.getAllUsers();
        console.log(`Total users: ${users.length}`);
        
        for (const user of users) {
          const stats = await cleanup.getEvaluationStats(user.id);
          console.log(`\nUser: ${user.email} (${user.id})`);
          console.log(`  Evaluations: ${stats.totalEvaluations}`);
          console.log(`  Date range: ${stats.oldestEvaluation || 'N/A'} to ${stats.newestEvaluation || 'N/A'}`);
          console.log(`  Average score: ${stats.averageScore ? stats.averageScore.toFixed(2) : 'N/A'}`);
          console.log(`  Average latency: ${stats.averageLatency ? Math.round(stats.averageLatency) : 'N/A'}ms`);
        }
        break;

      case 'cleanup':
        const olderThanDays = parseInt(args[1]) || undefined;
        const keepCount = parseInt(args[2]) || undefined;
        const dryRun = args.includes('--dry-run');
        
        console.log('🧹 Cleaning up evaluations...');
        const deletedCount = await cleanup.cleanupEvaluations({
          olderThanDays,
          keepCount,
          dryRun
        });
        
        if (!dryRun) {
          console.log(`✅ Cleanup completed. Deleted ${deletedCount} evaluations.`);
        } else {
          console.log(`🔍 Dry run completed. Would delete ${deletedCount} evaluations.`);
        }
        break;

      case 'reset-user':
        const userId = args[1];
        const userDryRun = args.includes('--dry-run');
        
        if (!userId) {
          console.error('Please provide a user ID: npm run cleanup reset-user <user-id>');
          process.exit(1);
        }
        
        console.log(`🔄 Resetting data for user ${userId}...`);
        await cleanup.resetUserData(userId, userDryRun);
        break;

      case 'reset-all':
        const allDryRun = args.includes('--dry-run');
        
        console.log('🔄 Resetting all evaluation data...');
        await cleanup.resetAllData(allDryRun);
        break;

      default:
        console.log('Available commands:');
        console.log('  stats                    - Show database statistics');
        console.log('  cleanup [days] [keep]   - Clean up old evaluations (optional: older than X days, keep Y newest)');
        console.log('  reset-user <user-id>     - Reset all data for a specific user');
        console.log('  reset-all                - Reset all evaluation data');
        console.log('');
        console.log('Add --dry-run to any command to preview changes without executing them');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
