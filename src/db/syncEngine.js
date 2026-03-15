import { supabase } from '../config/supabase';
import {
  getAll,
  putRecord,
  bulkPut,
  getPendingSyncItems,
  removeSyncItem,
  STORES,
} from './indexedDB';

// Tables to sync
const SYNC_TABLES = [
  { name: 'members', store: STORES.members, key: 'member_id' },
  { name: 'membership_plans', store: STORES.membership_plans, key: 'plan_id' },
  { name: 'subscriptions', store: STORES.subscriptions, key: 'subscription_id' },
  { name: 'membership_months', store: STORES.membership_months, key: 'id' },
  { name: 'attendance', store: STORES.attendance, key: 'attendance_id' },
  { name: 'payments', store: STORES.payments, key: 'payment_id' },
  { name: 'membership_violations', store: STORES.membership_violations, key: 'violation_id' },
];

// Pull data from Supabase into IndexedDB (last 3 months of operational data)
export async function pullFromSupabase() {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const cutoff = threeMonthsAgo.toISOString();

  for (const table of SYNC_TABLES) {
    try {
      let query = supabase.from(table.name).select('*');

      // For members, get all (they're the core reference)
      // For other tables, filter by recent data
      if (table.name !== 'members' && table.name !== 'membership_plans') {
        query = query.gte('created_at', cutoff);
      }

      const { data, error } = await query;
      if (error) {
        console.error(`Error pulling ${table.name}:`, error);
        continue;
      }
      if (data && data.length > 0) {
        await bulkPut(table.store, data);
      }
    } catch (err) {
      console.error(`Error syncing ${table.name}:`, err);
    }
  }
}

// Push pending offline changes to Supabase
export async function pushToSupabase() {
  const pendingItems = await getPendingSyncItems();

  for (const item of pendingItems) {
    try {
      const { action, table_name, record } = item;

      if (action === 'insert') {
        // Check if record already exists (conflict resolution)
        const tableConfig = SYNC_TABLES.find((t) => t.name === table_name);
        if (tableConfig) {
          const { data: existing } = await supabase
            .from(table_name)
            .select('updated_at')
            .eq(tableConfig.key, record[tableConfig.key])
            .single();

          if (existing) {
            // Record exists - use last-update-wins
            if (new Date(record.updated_at) > new Date(existing.updated_at)) {
              await supabase.from(table_name).upsert(record);
            }
          } else {
            await supabase.from(table_name).insert(record);
          }
        }
      } else if (action === 'update') {
        const tableConfig = SYNC_TABLES.find((t) => t.name === table_name);
        if (tableConfig) {
          const { data: existing } = await supabase
            .from(table_name)
            .select('updated_at')
            .eq(tableConfig.key, record[tableConfig.key])
            .single();

          // Last-update-wins conflict resolution
          if (!existing || new Date(record.updated_at) > new Date(existing.updated_at)) {
            await supabase.from(table_name).upsert(record);
          }
        }
      } else if (action === 'delete') {
        const tableConfig = SYNC_TABLES.find((t) => t.name === table_name);
        if (tableConfig) {
          await supabase
            .from(table_name)
            .update({ deleted_at: new Date().toISOString() })
            .eq(tableConfig.key, record[tableConfig.key]);
        }
      }

      // Remove from sync queue after successful processing
      await removeSyncItem(item.id);
    } catch (err) {
      console.error('Sync push error for item:', item, err);
    }
  }
}

// Full sync: push first, then pull
export async function fullSync() {
  await pushToSupabase();
  await pullFromSupabase();
}
