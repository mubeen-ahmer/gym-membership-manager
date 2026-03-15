import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useOnline } from '../contexts/OnlineContext';
import { useAuth } from '../contexts/AuthContext';
import { useAuditLog } from './useAuditLog';
import { getAll, putRecord, addToSyncQueue, getByIndex, STORES } from '../db/indexedDB';
import { generateMonthlySegments } from '../utils/helpers';
import { v4 as uuidv4 } from 'uuid';

export function useSubscriptions() {
  const { isOnline } = useOnline();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSubscriptions = useCallback(async (memberId = null) => {
    setLoading(true);
    try {
      if (isOnline) {
        let query = supabase
          .from('subscriptions')
          .select('*, membership_plans(*)')
          .is('deleted_at', null)
          .order('start_date', { ascending: false });
        if (memberId) query = query.eq('member_id', memberId);
        const { data, error } = await query;
        if (error) throw error;
        setSubscriptions(data || []);
        return data || [];
      } else {
        let data = await getAll(STORES.subscriptions);
        if (memberId) data = data.filter((s) => s.member_id === memberId);
        data = data.filter((s) => !s.deleted_at).sort((a, b) => b.start_date?.localeCompare(a.start_date));
        setSubscriptions(data);
        return data;
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  const getActiveSubscription = useCallback(async (memberId) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      if (isOnline) {
        const { data } = await supabase
          .from('subscriptions')
          .select('*, membership_plans(*)')
          .eq('member_id', memberId)
          .lte('start_date', today)
          .gte('end_date', today)
          .is('deleted_at', null)
          .order('end_date', { ascending: false })
          .limit(1)
          .single();
        return data;
      } else {
        const subs = await getByIndex(STORES.subscriptions, 'member_id', memberId);
        return subs.find(
          (s) => !s.deleted_at && s.start_date <= today && s.end_date >= today
        ) || null;
      }
    } catch {
      return null;
    }
  }, [isOnline]);

  const getLatestSubscription = useCallback(async (memberId) => {
    try {
      if (isOnline) {
        const { data } = await supabase
          .from('subscriptions')
          .select('*, membership_plans(*)')
          .eq('member_id', memberId)
          .is('deleted_at', null)
          .order('end_date', { ascending: false })
          .limit(1)
          .single();
        return data;
      } else {
        const subs = await getByIndex(STORES.subscriptions, 'member_id', memberId);
        const valid = subs.filter((s) => !s.deleted_at).sort((a, b) => b.end_date?.localeCompare(a.end_date));
        return valid[0] || null;
      }
    } catch {
      return null;
    }
  }, [isOnline]);

  const addSubscription = useCallback(async (subData, plan, options = {}) => {
    const now = new Date().toISOString();
    const subId = uuidv4();
    const paidMonthsCount = Math.max(
      0,
      Math.min(
        Number(options.paidMonthsCount ?? plan.duration_months) || 0,
        plan.duration_months
      )
    );

    // Calculate end date from start date + plan duration
    const startDate = new Date(subData.start_date);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + plan.duration_months);
    endDate.setDate(endDate.getDate() - 1);

    const record = {
      subscription_id: subId,
      member_id: subData.member_id,
      plan_id: plan.plan_id,
      start_date: subData.start_date,
      end_date: endDate.toISOString().split('T')[0],
      price_paid: subData.price_paid || plan.default_price_pkr,
      created_by_admin: user?.id,
      created_at: now,
      updated_at: now,
    };

    // Generate monthly segments
    const segments = generateMonthlySegments(subData.start_date, plan.duration_months);
    const monthRecords = segments.map((seg, idx) => ({
      id: uuidv4(),
      member_id: subData.member_id,
      subscription_id: subId,
      month_reference: seg.month_reference,
      paid_status: idx < paidMonthsCount ? 'paid' : 'unpaid',
      created_at: now,
    }));

    if (isOnline) {
      const { data, error } = await supabase.from('subscriptions').insert(record).select().single();
      if (error) throw error;
      await supabase.from('membership_months').insert(monthRecords);
      await log('INSERT', 'subscriptions', subId, null, record);
      return data;
    } else {
      await putRecord(STORES.subscriptions, record);
      await addToSyncQueue('insert', 'subscriptions', record);
      for (const mr of monthRecords) {
        await putRecord(STORES.membership_months, mr);
        await addToSyncQueue('insert', 'membership_months', mr);
      }
      return record;
    }
  }, [isOnline, user, log]);

  const fetchMembershipMonths = useCallback(async (memberId = null, paidStatus = null) => {
    try {
      if (isOnline) {
        let query = supabase
          .from('membership_months')
          .select('*')
          .order('month_reference', { ascending: true });
        if (memberId) query = query.eq('member_id', memberId);
        if (paidStatus) query = query.eq('paid_status', paidStatus);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }
      let rows = await getAll(STORES.membership_months);
      if (memberId) rows = rows.filter((m) => m.member_id === memberId);
      if (paidStatus) rows = rows.filter((m) => m.paid_status === paidStatus);
      return rows.sort((a, b) => (a.month_reference || '').localeCompare(b.month_reference || ''));
    } catch (err) {
      console.error('Error fetching membership months:', err);
      return [];
    }
  }, [isOnline]);

  const markMembershipMonthsPaid = useCallback(async (monthIds) => {
    if (!monthIds?.length) return 0;
    if (isOnline) {
      const { error } = await supabase
        .from('membership_months')
        .update({ paid_status: 'paid' })
        .in('id', monthIds);
      if (error) throw error;
      return monthIds.length;
    }
    const all = await getAll(STORES.membership_months);
    const idSet = new Set(monthIds);
    let updated = 0;
    for (const row of all) {
      if (idSet.has(row.id)) {
        const next = { ...row, paid_status: 'paid' };
        await putRecord(STORES.membership_months, next);
        await addToSyncQueue('update', 'membership_months', next);
        updated += 1;
      }
    }
    return updated;
  }, [isOnline]);

  return {
    subscriptions,
    loading,
    fetchSubscriptions,
    getActiveSubscription,
    getLatestSubscription,
    addSubscription,
    fetchMembershipMonths,
    markMembershipMonthsPaid,
  };
}
