import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAttendance } from '../hooks/useAttendance';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useMembers } from '../hooks/useMembers';
import { today, daysBetween, formatDate } from '../utils/helpers';
import {
  IconBarcode, IconCheckCircle, IconWarning, IconChevronLeft, IconChevronRight, IconSearch,
} from '../components/Icons';

function pad(n) { return String(n).padStart(2, '0'); }

function toDateStr(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function Attendance() {
  const {
    attendance, fetchTodayAttendance, fetchMonthAttendance, checkDuplicateAttendance, markAttendance,
  } = useAttendance();
  const { getLatestSubscription } = useSubscriptions();
  const { members, fetchMembers, searchMembers } = useMembers();

  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [registerData, setRegisterData] = useState(new Set());
  const [overdueSet, setOverdueSet] = useState(new Set());
  const [registerLoading, setRegisterLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [marking, setMarking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerActive, setScannerActive] = useState(true);
  const scanBufferRef = useRef('');
  const scanResetRef = useRef(null);

  const todayStr = today();
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startStr = toDateStr(year, month, 1);
  const endStr = toDateStr(year, month, daysInMonth);

  const monthLabel = monthCursor.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });

  const dayColumns = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dateStr = toDateStr(year, month, d);
      const isFuture = dateStr > todayStr;
      const isToday = dateStr === todayStr;
      const dayName = new Date(year, month, d).toLocaleDateString('en', { weekday: 'short' });
      return { day: d, dateStr, isFuture, isToday, dayName };
    }),
    [year, month, daysInMonth, todayStr]
  );

  // Load members + month attendance data
  const loadRegister = useCallback(async () => {
    setRegisterLoading(true);
    try {
      await fetchMembers();
      const rows = await fetchMonthAttendance(startStr, endStr);
      const set = new Set();
      const oSet = new Set();
      rows.forEach((r) => {
        const d = r.check_in_date || r.check_in_time?.split('T')[0];
        if (d) {
          const key = `${r.member_id}|${d}`;
          set.add(key);
          if (r.attendance_is_overdue) oSet.add(key);
        }
      });
      setRegisterData(set);
      setOverdueSet(oSet);
    } catch (err) {
      console.error('Register load error:', err);
    } finally {
      setRegisterLoading(false);
    }
  }, [fetchMembers, fetchMonthAttendance, startStr, endStr]);

  useEffect(() => { loadRegister(); }, [loadRegister]);
  useEffect(() => { fetchTodayAttendance(); }, [fetchTodayAttendance]);

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.member_id?.toLowerCase().includes(q) ||
        m.phone_number?.includes(q)
    );
  }, [members, searchQuery]);

  // Handle cell click
  const handleCellClick = useCallback(async (member, dateStr) => {
    const key = `${member.member_id}|${dateStr}`;
    if (registerData.has(key)) return; // already marked
    if (dateStr > todayStr) return; // future date

    setMarking(key);
    setMessage(null);

    try {
      const isDup = await checkDuplicateAttendance(member.member_id, dateStr);
      if (isDup) {
        setMessage({ type: 'warning', text: `${member.name} already marked for ${dateStr}` });
        setMarking(null);
        return;
      }

      const latest = await getLatestSubscription(member.member_id);
      const isOverdue = !latest || latest.end_date < dateStr;

      await markAttendance(member.member_id, 'manual', isOverdue, dateStr);

      // Update local set immediately
      setRegisterData((prev) => new Set(prev).add(key));
      if (isOverdue) setOverdueSet((prev) => new Set(prev).add(key));

      if (isOverdue && latest) {
        const pending = daysBetween(latest.end_date, dateStr);
        setMessage({
          type: 'warning',
          text: `${member.name} marked (expired ${formatDate(latest.end_date)}, ${pending}d overdue)`,
        });
      } else {
        setMessage({ type: 'success', text: `${member.name} marked for ${dateStr}` });
      }

      // Refresh today list if the date is today
      if (dateStr === todayStr) fetchTodayAttendance();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setMarking(null);
    }
  }, [registerData, todayStr, checkDuplicateAttendance, getLatestSubscription, markAttendance, fetchTodayAttendance]);

  // QR/Barcode scan handler — marks today automatically
  const processScanToday = useCallback(async (memberId) => {
    const cleaned = memberId.trim();
    if (!cleaned) return;
    setMessage(null);
    try {
      const results = await searchMembers(cleaned);
      const member = results.find((m) => m.member_id === cleaned);
      if (!member) {
        setMessage({ type: 'error', text: `Member not found: ${cleaned}` });
        return;
      }
      const key = `${member.member_id}|${todayStr}`;
      if (registerData.has(key)) {
        setMessage({ type: 'warning', text: `${member.name} already marked today.` });
        return;
      }

      const latest = await getLatestSubscription(member.member_id);
      const isOverdue = !latest || latest.end_date < todayStr;

      await markAttendance(member.member_id, 'barcode', isOverdue);
      setRegisterData((prev) => new Set(prev).add(key));
      if (isOverdue) setOverdueSet((prev) => new Set(prev).add(key));

      if (isOverdue && latest) {
        const pending = daysBetween(latest.end_date, todayStr);
        setMessage({ type: 'warning', text: `${member.name} scanned in (expired ${formatDate(latest.end_date)}, ${pending}d overdue)` });
      } else {
        setMessage({ type: 'success', text: `${member.name} scanned in.` });
      }
      fetchTodayAttendance();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, [registerData, todayStr, searchMembers, getLatestSubscription, markAttendance, fetchTodayAttendance]);

  useEffect(() => {
    if (!scannerActive) return undefined;
    const onKeyDown = (e) => {
      const t = e.target;
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.tagName === 'SELECT') return;
      if (e.key === 'Enter') {
        const scanned = scanBufferRef.current.trim();
        if (scanned) processScanToday(scanned);
        scanBufferRef.current = '';
        return;
      }
      if (e.key.length === 1) {
        scanBufferRef.current += e.key;
        if (scanResetRef.current) clearTimeout(scanResetRef.current);
        scanResetRef.current = setTimeout(() => { scanBufferRef.current = ''; }, 450);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (scanResetRef.current) clearTimeout(scanResetRef.current);
    };
  }, [processScanToday, scannerActive]);

  // Count today's stats from attendance state
  const todayTotal = attendance.length;
  const todayBarcode = attendance.filter((a) => a.method === 'barcode').length;
  const todayOverdue = attendance.filter((a) => a.attendance_is_overdue).length;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance Register</h1>
          <p className="text-sm text-slate-400">Click any cell to mark. Rows = members, columns = dates.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Present</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Overdue</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-700 inline-block" /> Absent</span>
          </div>
          <button
            onClick={() => setScannerActive((v) => !v)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              scannerActive
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 pulse-scanner'
                : 'bg-[#1e2130] border-[#2d3148] text-slate-300 hover:bg-[#262a3a]'
            }`}
          >
            <IconBarcode className="w-3.5 h-3.5" />
            {scannerActive ? 'Scanner Live' : 'Scanner Off'}
          </button>
        </div>
      </div>

      {/* Message toast */}
      {message && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm flex items-start gap-2 ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : message.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {message.type === 'warning' ? <IconWarning className="w-4 h-4 mt-0.5 shrink-0" /> : <IconCheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Controls row: search + month nav + today stats */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter members by name, ID, or phone..."
            className="w-full pl-9 pr-4 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Month nav */}
        <div className="inline-flex items-center gap-1.5 bg-[#1e2130] border border-[#2d3148] rounded-lg px-2 py-1">
          <button onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-1 rounded text-slate-300 hover:bg-[#262a3a]">
            <IconChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-white min-w-[130px] text-center">{monthLabel}</span>
          <button onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-1 rounded text-slate-300 hover:bg-[#262a3a]">
            <IconChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Today stats */}
        <div className="flex items-center gap-4 text-xs text-slate-300 ml-auto">
          <span>Today: <strong className="text-white">{todayTotal}</strong></span>
          <span>Barcode: <strong className="text-indigo-300">{todayBarcode}</strong></span>
          <span>Overdue: <strong className="text-amber-300">{todayOverdue}</strong></span>
        </div>
      </div>

      {/* Register grid */}
      <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl overflow-hidden">
        {registerLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            {searchQuery ? 'No members match your search.' : 'No members found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-max min-w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#151826]">
                  <th className="sticky left-0 z-20 bg-[#151826] px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase border-b border-r border-[#2d3148] min-w-[180px]">
                    Member
                  </th>
                  {dayColumns.map((col) => (
                    <th
                      key={col.day}
                      className={`px-0 py-2 text-center text-[10px] font-medium border-b border-[#2d3148] min-w-[36px] ${
                        col.isToday ? 'text-indigo-300 bg-indigo-500/15' :
                        col.isFuture ? 'text-slate-600' :
                        (col.dayName === 'Fri' || col.dayName === 'Sat') ? 'text-slate-500 bg-slate-800/40' :
                        'text-slate-400'
                      }`}
                    >
                      <div>{col.dayName}</div>
                      <div className="font-bold text-xs">{pad(col.day)}</div>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase border-b border-l border-[#2d3148] min-w-[44px]">
                    #
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => {
                  let monthTotal = 0;
                  return (
                    <tr key={member.member_id} className="group hover:bg-[#262a3a]/30">
                      <td className="sticky left-0 z-10 bg-[#1e2130] group-hover:bg-[#262a3a] px-3 py-1.5 border-b border-r border-[#2d3148] transition-colors">
                        <p className="text-sm font-medium text-white truncate max-w-[160px]">{member.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{member.member_id}</p>
                      </td>
                      {dayColumns.map((col) => {
                        const key = `${member.member_id}|${col.dateStr}`;
                        const isMarked = registerData.has(key);
                        const isOd = overdueSet.has(key);
                        if (isMarked) monthTotal++;
                        const isBeingMarked = marking === key;

                        return (
                          <td
                            key={col.day}
                            className={`px-0 py-0 border-b border-[#2d3148] text-center ${
                              col.isToday ? 'bg-indigo-500/8' :
                              (col.dayName === 'Fri' || col.dayName === 'Sat') ? 'bg-slate-800/25' : ''
                            }`}
                          >
                            {col.isFuture ? (
                              <div className="w-full h-8 flex items-center justify-center">
                                <span className="w-2.5 h-2.5 rounded-sm bg-[#1a1d27]" />
                              </div>
                            ) : isBeingMarked ? (
                              <div className="w-full h-8 flex items-center justify-center">
                                <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : isMarked ? (
                              <div className="w-full h-8 flex items-center justify-center" title={`${member.name} — ${col.dateStr}${isOd ? ' (overdue)' : ''}`}>
                                <span className={`w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold ${
                                  isOd ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}>
                                  P
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleCellClick(member, col.dateStr)}
                                className="w-full h-8 flex items-center justify-center group/cell"
                                title={`Mark ${member.name} on ${col.dateStr}`}
                              >
                                <span className="w-5 h-5 rounded border border-[#2d3148] bg-[#151826] group-hover/cell:border-indigo-500/50 group-hover/cell:bg-indigo-500/10 transition" />
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center text-xs font-semibold text-white border-b border-l border-[#2d3148]">
                        {monthTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
