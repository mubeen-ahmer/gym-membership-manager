import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useOnline } from '../contexts/OnlineContext';
import { useAuth } from '../contexts/AuthContext';
import { useAuditLog } from './useAuditLog';
import {
  getAll,
  getByKey,
  putRecord,
  getByIndex,
  addToSyncQueue,
  searchMembersOffline,
  STORES,
} from '../db/indexedDB';
import { normalizePhone } from '../utils/phone';
import { generateMemberId, extractSequence } from '../utils/helpers';

export function useMembers() {
  const { isOnline } = useOnline();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setMembers(data || []);
      } else {
        const data = await getAll(STORES.members);
        setMembers(data.filter((m) => !m.deleted_at).sort((a, b) => b.created_at?.localeCompare(a.created_at)));
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  const searchMembers = useCallback(async (query) => {
    if (!query || query.length < 2) return [];
    try {
      if (isOnline) {
        const normalized = normalizePhone(query);
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .is('deleted_at', null)
          .or(`name.ilike.%${query}%,phone_number.ilike.%${normalized}%,member_id.ilike.%${query}%`);
        if (error) throw error;
        return data || [];
      } else {
        return await searchMembersOffline(query);
      }
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  }, [isOnline]);

  const getNextMemberId = useCallback(async () => {
    try {
      if (isOnline) {
        const { data } = await supabase
          .from('members')
          .select('member_id')
          .order('member_id', { ascending: false })
          .limit(1);
        const lastSeq = data?.[0] ? extractSequence(data[0].member_id) : 0;
        return generateMemberId(lastSeq + 1);
      } else {
        const all = await getAll(STORES.members);
        const maxSeq = all.reduce((max, m) => Math.max(max, extractSequence(m.member_id)), 0);
        return generateMemberId(maxSeq + 1);
      }
    } catch {
      return generateMemberId(Date.now() % 100000);
    }
  }, [isOnline]);

  const checkExistingPhone = useCallback(async (phone) => {
    const normalized = normalizePhone(phone);
    try {
      if (isOnline) {
        const { data } = await supabase
          .from('members')
          .select('*, subscriptions(*), membership_violations(*)')
          .eq('phone_number', normalized)
          .is('deleted_at', null)
          .single();
        return data;
      } else {
        const results = await getByIndex(STORES.members, 'phone_number', normalized);
        return results?.[0] || null;
      }
    } catch {
      return null;
    }
  }, [isOnline]);

  const addMember = useCallback(async (memberData) => {
    const now = new Date().toISOString();
    const memberId = await getNextMemberId();
    const record = {
      ...memberData,
      member_id: memberId,
      phone_number: normalizePhone(memberData.phone_number),
      created_at: now,
      updated_at: now,
    };

    if (isOnline) {
      const { data, error } = await supabase.from('members').insert(record).select().single();
      if (error) throw error;
      await log('INSERT', 'members', memberId, null, record);
      return data;
    } else {
      await putRecord(STORES.members, record);
      await addToSyncQueue('insert', 'members', record);
      return record;
    }
  }, [isOnline, getNextMemberId, log]);

  const updateMember = useCallback(async (memberId, updates) => {
    const now = new Date().toISOString();
    const updatedRecord = { ...updates, updated_at: now };

    if (isOnline) {
      const { data: oldData } = await supabase.from('members').select('*').eq('member_id', memberId).single();
      if (updates.phone_number) {
        updatedRecord.phone_number = normalizePhone(updates.phone_number);
      }
      const { data, error } = await supabase
        .from('members')
        .update(updatedRecord)
        .eq('member_id', memberId)
        .select()
        .single();
      if (error) throw error;
      await log('UPDATE', 'members', memberId, oldData, data);
      return data;
    } else {
      const existing = await getByKey(STORES.members, memberId);
      const merged = { ...existing, ...updatedRecord };
      if (updates.phone_number) {
        merged.phone_number = normalizePhone(updates.phone_number);
      }
      await putRecord(STORES.members, merged);
      await addToSyncQueue('update', 'members', merged);
      return merged;
    }
  }, [isOnline, log]);

  const softDeleteMember = useCallback(async (memberId) => {
    const now = new Date().toISOString();
    if (isOnline) {
      const { data: oldData } = await supabase.from('members').select('*').eq('member_id', memberId).single();
      await supabase.from('members').update({ deleted_at: now }).eq('member_id', memberId);
      await log('DELETE', 'members', memberId, oldData, { deleted_at: now });
    } else {
      const existing = await getByKey(STORES.members, memberId);
      const updated = { ...existing, deleted_at: now, updated_at: now };
      await putRecord(STORES.members, updated);
      await addToSyncQueue('delete', 'members', updated);
    }
  }, [isOnline, log]);

  const fetchMember = useCallback(async (memberId) => {
    try {
      if (isOnline) {
        const { data, error } = await supabase.from('members').select('*').eq('member_id', memberId).single();
        if (error) throw error;
        return data;
      } else {
        return await getByKey(STORES.members, memberId);
      }
    } catch { return null; }
  }, [isOnline]);

  return {
    members,
    loading,
    fetchMembers,
    fetchMember,
    searchMembers,
    addMember,
    updateMember,
    softDeleteMember,
    checkExistingPhone,
    getNextMemberId,
  };
}
