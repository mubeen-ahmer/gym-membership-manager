import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useOnline } from '../contexts/OnlineContext';
import { useAuditLog } from './useAuditLog';
import { getAll, putRecord, addToSyncQueue, STORES } from '../db/indexedDB';
import { v4 as uuidv4 } from 'uuid';

export function usePlans() {
  const { isOnline } = useOnline();
  const { log } = useAuditLog();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('membership_plans')
          .select('*')
          .is('deleted_at', null)
          .order('plan_class')
          .order('duration_months');
        if (error) throw error;
        setPlans(data || []);
      } else {
        const data = await getAll(STORES.membership_plans);
        setPlans(data.filter((p) => !p.deleted_at));
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  const addPlan = useCallback(async (planData) => {
    const now = new Date().toISOString();
    const record = {
      plan_id: uuidv4(),
      ...planData,
      created_at: now,
      updated_at: now,
    };

    if (isOnline) {
      const { data, error } = await supabase.from('membership_plans').insert(record).select().single();
      if (error) throw error;
      await log('INSERT', 'membership_plans', record.plan_id, null, record);
      return data;
    } else {
      await putRecord(STORES.membership_plans, record);
      await addToSyncQueue('insert', 'membership_plans', record);
      return record;
    }
  }, [isOnline, log]);

  const updatePlan = useCallback(async (planId, updates) => {
    const now = new Date().toISOString();
    const updatedRecord = { ...updates, updated_at: now };

    if (isOnline) {
      const { data: oldData } = await supabase.from('membership_plans').select('*').eq('plan_id', planId).single();
      const { data, error } = await supabase
        .from('membership_plans')
        .update(updatedRecord)
        .eq('plan_id', planId)
        .select()
        .single();
      if (error) throw error;
      await log('UPDATE', 'membership_plans', planId, oldData, data);
      return data;
    } else {
      const existing = await getAll(STORES.membership_plans);
      const old = existing.find((p) => p.plan_id === planId);
      const merged = { ...old, ...updatedRecord };
      await putRecord(STORES.membership_plans, merged);
      await addToSyncQueue('update', 'membership_plans', merged);
      return merged;
    }
  }, [isOnline, log]);

  const deletePlan = useCallback(async (planId) => {
    const now = new Date().toISOString();
    if (isOnline) {
      const { data: oldData } = await supabase.from('membership_plans').select('*').eq('plan_id', planId).single();
      await supabase.from('membership_plans').update({ deleted_at: now }).eq('plan_id', planId);
      await log('DELETE', 'membership_plans', planId, oldData, { deleted_at: now });
    }
  }, [isOnline, log]);

  return { plans, loading, fetchPlans, addPlan, updatePlan, deletePlan };
}
