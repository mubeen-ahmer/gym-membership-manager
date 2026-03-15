import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useOnline } from '../contexts/OnlineContext';
import { useAuth } from '../contexts/AuthContext';
import { useAuditLog } from './useAuditLog';
import { getAll, putRecord, addToSyncQueue, getByIndex, STORES } from '../db/indexedDB';
import { v4 as uuidv4 } from 'uuid';

export function usePayments() {
  const { isOnline } = useOnline();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPayments = useCallback(async (memberId = null) => {
    setLoading(true);
    try {
      if (isOnline) {
        let query = supabase
          .from('payments')
          .select('*, members(name)')
          .is('deleted_at', null)
          .order('payment_date', { ascending: false });
        if (memberId) query = query.eq('member_id', memberId);
        const { data, error } = await query;
        if (error) throw error;
        setPayments(data || []);
        return data || [];
      } else {
        let data = await getAll(STORES.payments);
        if (memberId) data = data.filter((p) => p.member_id === memberId);
        data = data.filter((p) => !p.deleted_at).sort((a, b) => b.payment_date?.localeCompare(a.payment_date));
        setPayments(data);
        return data;
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  const addPayment = useCallback(async (paymentData) => {
    const now = new Date().toISOString();
    const record = {
      payment_id: uuidv4(),
      ...paymentData,
      recorded_by_admin: user?.id,
      created_at: now,
    };

    if (isOnline) {
      const { data, error } = await supabase.from('payments').insert(record).select().single();
      if (error) throw error;
      await log('INSERT', 'payments', record.payment_id, null, record);
      return data;
    } else {
      await putRecord(STORES.payments, record);
      await addToSyncQueue('insert', 'payments', record);
      return record;
    }
  }, [isOnline, user, log]);

  return { payments, loading, fetchPayments, addPayment };
}
