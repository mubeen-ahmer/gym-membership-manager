import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useOnline } from '../contexts/OnlineContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getAll,
  putRecord,
  addToSyncQueue,
  hasTodayAttendance,
  getAttendanceForDate,
  STORES,
} from '../db/indexedDB';
import { v4 as uuidv4 } from 'uuid';
import { today as localToday } from '../utils/helpers';

export function useAttendance() {
  const { isOnline } = useOnline();
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTodayAttendance = useCallback(async () => {
    setLoading(true);
    const todayStr = localToday(); // local date, not UTC
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('attendance')
          .select('*, members(name, phone_number)')
          .eq('check_in_date', todayStr)
          .order('check_in_time', { ascending: false });
        if (error) throw error;
        setAttendance(data || []);
        return data || [];
      } else {
        const data = await getAttendanceForDate(todayStr);
        setAttendance(data);
        return data;
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  // Fetch all attendance records for a date range (for register grid)
  const fetchMonthAttendance = useCallback(async (startDate, endDate) => {
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('attendance')
          .select('member_id, check_in_date, attendance_is_overdue')
          .gte('check_in_date', startDate)
          .lte('check_in_date', endDate);
        if (error) throw error;
        return data || [];
      } else {
        const all = await getAll(STORES.attendance);
        return all.filter((a) => {
          const d = a.check_in_date || a.check_in_time?.split('T')[0];
          return d && d >= startDate && d <= endDate;
        });
      }
    } catch (err) {
      console.error('Error fetching month attendance:', err);
      return [];
    }
  }, [isOnline]);

  const checkDuplicateAttendance = useCallback(async (memberId, dateStr) => {
    const checkDate = dateStr || localToday(); // local date, not UTC
    try {
      if (isOnline) {
        const { data } = await supabase
          .from('attendance')
          .select('attendance_id')
          .eq('member_id', memberId)
          .eq('check_in_date', checkDate)
          .limit(1);
        return data && data.length > 0;
      } else {
        if (!dateStr) return await hasTodayAttendance(memberId);
        const all = await getAll(STORES.attendance);
        return all.some(
          (a) => a.member_id === memberId && (a.check_in_date || a.check_in_time?.split('T')[0]) === checkDate
        );
      }
    } catch {
      return false;
    }
  }, [isOnline]);

  const markAttendance = useCallback(async (memberId, method = 'manual', isOverdue = false, dateStr) => {
    const targetDate = dateStr || localToday(); // local date, not UTC
    const now = new Date().toISOString();
    const record = {
      attendance_id: uuidv4(),
      member_id: memberId,
      check_in_time: dateStr ? `${dateStr}T12:00:00.000Z` : now,
      check_in_date: targetDate,
      method,
      recorded_by_admin: user?.id,
      attendance_is_overdue: isOverdue,
      created_at: now,
    };

    if (isOnline) {
      const { data, error } = await supabase.from('attendance').insert(record).select().single();
      if (error) {
        if (error.code === '23505') {
          throw new Error('Attendance already marked for this date');
        }
        throw error;
      }
      return data;
    } else {
      await putRecord(STORES.attendance, record);
      await addToSyncQueue('insert', 'attendance', record);
      return record;
    }
  }, [isOnline, user]);

  return {
    attendance,
    loading,
    fetchTodayAttendance,
    fetchMonthAttendance,
    checkDuplicateAttendance,
    markAttendance,
  };
}
