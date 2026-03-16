import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useOnline } from '../contexts/OnlineContext';
import { useAuth } from '../contexts/AuthContext';
import { getAll, getByIndex, deleteRecord, STORES } from '../db/indexedDB';
import { v4 as uuidv4 } from 'uuid';

export function useViolations() {
  const { isOnline } = useOnline();
  const { user } = useAuth();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchViolations = useCallback(async (memberId = null) => {
    setLoading(true);
    try {
      if (isOnline) {
        let query = supabase
          .from('membership_violations')
          .select('*, members(name), subscriptions(start_date, end_date)')
          .order('recorded_date', { ascending: false });
        if (memberId) query = query.eq('member_id', memberId);
        const { data, error } = await query;
        if (error) throw error;
        setViolations(data || []);
        return data || [];
      } else {
        let data = await getAll(STORES.membership_violations);
        if (memberId) data = data.filter((v) => v.member_id === memberId);
        setViolations(data);
        return data;
      }
    } catch (err) {
      console.error('Error fetching violations:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  const addViolation = useCallback(async (violationData) => {
    const now = new Date().toISOString();
    const record = {
      violation_id: uuidv4(),
      ...violationData,
      recorded_by_admin: user?.id,
      recorded_date: new Date().toISOString().split('T')[0],
      created_at: now,
    };

    if (isOnline) {
      const { data, error } = await supabase.from('membership_violations').insert(record).select().single();
      if (error) throw error;
      return data;
    } else {
      return record;
    }
  }, [isOnline, user]);

  const resolveViolations = useCallback(async (memberId) => {
    if (!memberId) return 0;
    if (isOnline) {
      const { data: rows, error: fetchErr } = await supabase
        .from('membership_violations')
        .select('violation_id')
        .eq('member_id', memberId);
      if (fetchErr) throw fetchErr;
      if (!rows?.length) return 0;
      const ids = rows.map((r) => r.violation_id);
      const { error } = await supabase
        .from('membership_violations')
        .delete()
        .in('violation_id', ids);
      if (error) throw error;
      return ids.length;
    }
    const local = await getByIndex(STORES.membership_violations, 'member_id', memberId);
    for (const row of local) {
      await deleteRecord(STORES.membership_violations, row.violation_id);
    }
    return local.length;
  }, [isOnline]);

  const dismissViolation = useCallback(async (violationId) => {
    if (isOnline) {
      const { error } = await supabase.from('membership_violations').delete().eq('violation_id', violationId);
      if (error) throw error;
    } else {
      await deleteRecord(STORES.membership_violations, violationId);
    }
  }, [isOnline]);

  return { violations, loading, fetchViolations, addViolation, resolveViolations, dismissViolation };
}
