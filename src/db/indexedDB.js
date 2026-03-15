import { openDB } from 'idb';

const DB_NAME = 'gym-system-offline';
const DB_VERSION = 1;

const STORES = {
  members: 'members',
  subscriptions: 'subscriptions',
  attendance: 'attendance',
  payments: 'payments',
  membership_plans: 'membership_plans',
  membership_months: 'membership_months',
  membership_violations: 'membership_violations',
  pending_sync: 'pending_sync',
};

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Members store
      if (!db.objectStoreNames.contains(STORES.members)) {
        const store = db.createObjectStore(STORES.members, { keyPath: 'member_id' });
        store.createIndex('phone_number', 'phone_number', { unique: true });
        store.createIndex('name', 'name');
        store.createIndex('status', 'status');
      }
      // Subscriptions
      if (!db.objectStoreNames.contains(STORES.subscriptions)) {
        const store = db.createObjectStore(STORES.subscriptions, { keyPath: 'subscription_id' });
        store.createIndex('member_id', 'member_id');
      }
      // Attendance
      if (!db.objectStoreNames.contains(STORES.attendance)) {
        const store = db.createObjectStore(STORES.attendance, { keyPath: 'attendance_id' });
        store.createIndex('member_id', 'member_id');
        store.createIndex('check_in_time', 'check_in_time');
      }
      // Payments
      if (!db.objectStoreNames.contains(STORES.payments)) {
        const store = db.createObjectStore(STORES.payments, { keyPath: 'payment_id' });
        store.createIndex('member_id', 'member_id');
      }
      // Plans
      if (!db.objectStoreNames.contains(STORES.membership_plans)) {
        db.createObjectStore(STORES.membership_plans, { keyPath: 'plan_id' });
      }
      // Membership months
      if (!db.objectStoreNames.contains(STORES.membership_months)) {
        const store = db.createObjectStore(STORES.membership_months, { keyPath: 'id' });
        store.createIndex('subscription_id', 'subscription_id');
      }
      // Violations
      if (!db.objectStoreNames.contains(STORES.membership_violations)) {
        const store = db.createObjectStore(STORES.membership_violations, { keyPath: 'violation_id' });
        store.createIndex('member_id', 'member_id');
      }
      // Pending sync queue
      if (!db.objectStoreNames.contains(STORES.pending_sync)) {
        const store = db.createObjectStore(STORES.pending_sync, { keyPath: 'id', autoIncrement: true });
        store.createIndex('table_name', 'table_name');
        store.createIndex('created_at', 'created_at');
      }
    },
  });
}

// Generic CRUD operations
export async function getAll(storeName) {
  const db = await getDB();
  return db.getAll(storeName);
}

export async function getByKey(storeName, key) {
  const db = await getDB();
  return db.get(storeName, key);
}

export async function putRecord(storeName, record) {
  const db = await getDB();
  return db.put(storeName, record);
}

export async function deleteRecord(storeName, key) {
  const db = await getDB();
  return db.delete(storeName, key);
}

export async function getByIndex(storeName, indexName, value) {
  const db = await getDB();
  return db.getAllFromIndex(storeName, indexName, value);
}

// Add to sync queue for offline operations
export async function addToSyncQueue(action, tableName, record) {
  const db = await getDB();
  await db.add(STORES.pending_sync, {
    action, // 'insert', 'update', 'delete'
    table_name: tableName,
    record,
    created_at: new Date().toISOString(),
  });
}

// Get all pending sync items
export async function getPendingSyncItems() {
  const db = await getDB();
  return db.getAll(STORES.pending_sync);
}

// Clear sync queue after successful sync
export async function clearSyncQueue() {
  const db = await getDB();
  const tx = db.transaction(STORES.pending_sync, 'readwrite');
  await tx.store.clear();
  await tx.done;
}

// Remove a single sync item by id
export async function removeSyncItem(id) {
  const db = await getDB();
  return db.delete(STORES.pending_sync, id);
}

// Bulk put records (for initial cache load)
export async function bulkPut(storeName, records) {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  for (const record of records) {
    await tx.store.put(record);
  }
  await tx.done;
}

// Search members by name or phone
export async function searchMembersOffline(query) {
  const db = await getDB();
  const all = await db.getAll(STORES.members);
  const q = query.toLowerCase();
  return all.filter(
    (m) =>
      m.member_id?.toLowerCase().includes(q) ||
      m.name?.toLowerCase().includes(q) ||
      m.phone_number?.includes(q)
  );
}

// Get attendance for a specific date
export async function getAttendanceForDate(dateStr) {
  const db = await getDB();
  const all = await db.getAll(STORES.attendance);
  return all.filter((a) => a.check_in_time?.startsWith(dateStr));
}

// Check if member has attendance today
export async function hasTodayAttendance(memberId) {
  const todayStr = new Date().toISOString().split('T')[0];
  const db = await getDB();
  const all = await db.getAllFromIndex(STORES.attendance, 'member_id', memberId);
  return all.some((a) => a.check_in_time?.startsWith(todayStr));
}

export { STORES };
