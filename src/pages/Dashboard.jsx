import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useOnline } from '../contexts/OnlineContext';
import { getAll, STORES } from '../db/indexedDB';
import { formatPKR, formatDate } from '../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  IconUsers, IconCheckCircle, IconCurrency, IconCalendar, IconWarning,
  IconTrendUp, IconRefresh, IconArrowRight,
} from '../components/Icons';

export default function Dashboard() {
  const { isOnline } = useOnline();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalActive: 0,
    todayAttendance: 0,
    monthlyRevenue: 0,
    expiringIn7Days: 0,
    overdueMemberships: 0,
  });
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, [isOnline]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];
      const monthStart = `${today.slice(0, 7)}-01`;

      if (isOnline) {
        const [
          { count: activeCount },
          { data: todayAtt },
          { data: monthPayments },
          { data: expiring },
          { count: overdueCount },
          { data: allPayments },
        ] = await Promise.all([
          supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active').is('deleted_at', null),
          supabase.from('attendance').select('attendance_id').gte('check_in_date', today).lte('check_in_date', today),
          supabase.from('payments').select('amount').gte('payment_date', monthStart).is('deleted_at', null),
          supabase.from('subscriptions').select('subscription_id, member_id, end_date, members(name, member_id)').gte('end_date', today).lte('end_date', sevenDaysStr).is('deleted_at', null).order('end_date'),
          supabase.from('subscriptions').select('*', { count: 'exact', head: true }).lt('end_date', today).is('deleted_at', null),
          supabase.from('payments').select('amount, payment_date').gte('payment_date', (() => { const d = new Date(); d.setMonth(d.getMonth() - 5); return d.toISOString().split('T')[0]; })()).is('deleted_at', null),
        ]);

        const revenue = monthPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
        const monthlyMap = {};
        allPayments?.forEach((p) => {
          const m = p.payment_date.slice(0, 7);
          monthlyMap[m] = (monthlyMap[m] || 0) + Number(p.amount);
        });
        const revData = Object.entries(monthlyMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, amount]) => ({
            month: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }),
            amount,
          }));

        setStats({ totalActive: activeCount || 0, todayAttendance: todayAtt?.length || 0, monthlyRevenue: revenue, expiringIn7Days: expiring?.length || 0, overdueMemberships: overdueCount || 0 });
        setExpiringSoon(expiring || []);
        setRevenueData(revData);
      } else {
        const members = await getAll(STORES.members);
        const active = members.filter((m) => m.status === 'active' && !m.deleted_at);
        const att = await getAll(STORES.attendance);
        const todayAtt = att.filter((a) => (a.check_in_date || a.check_in_time?.split('T')[0]) === today);
        const payments = await getAll(STORES.payments);
        const monthPay = payments.filter((p) => p.payment_date >= monthStart && !p.deleted_at);
        const revenue = monthPay.reduce((s, p) => s + Number(p.amount), 0);
        const subs = await getAll(STORES.subscriptions);
        const expiring = subs.filter((s) => !s.deleted_at && s.end_date >= today && s.end_date <= sevenDaysStr);
        const overdue = subs.filter((s) => !s.deleted_at && s.end_date < today);
        setStats({ totalActive: active.length, todayAttendance: todayAtt.length, monthlyRevenue: revenue, expiringIn7Days: expiring.length, overdueMemberships: overdue.length });
        setExpiringSoon(expiring);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }

  const todayLabel = new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[#1a1d2e] border border-[#252840] rounded-xl p-5 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-[#252840] mb-4" />
              <div className="h-7 w-16 bg-[#252840] rounded mb-2" />
              <div className="h-3 w-24 bg-[#252840] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">{todayLabel}</p>
        </div>
        <button
          onClick={loadDashboard}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[#1a1d2e] border border-[#252840] text-slate-400 hover:text-slate-200 hover:bg-[#1f2235] transition-all"
        >
          <IconRefresh className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Mark Attendance', path: '/attendance', color: 'indigo' },
          { label: 'Add Member',      path: '/members',    color: 'emerald' },
          { label: 'Record Payment',  path: '/payments',   color: 'sky' },
          { label: 'Log Violation',   path: '/violations', color: 'amber' },
        ].map(({ label, path, color }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all
              bg-${color}-500/8 border-${color}-500/20 text-${color}-300 hover:bg-${color}-500/15`}
          >
            <span>{label}</span>
            <IconArrowRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={IconUsers}
          label="Active Members"
          value={stats.totalActive}
          sub="total enrolled"
          tone="indigo"
        />
        <StatCard
          icon={IconCheckCircle}
          label="Today's Attendance"
          value={stats.todayAttendance}
          sub={`of ${stats.totalActive} members`}
          tone="emerald"
          pct={stats.totalActive > 0 ? Math.round((stats.todayAttendance / stats.totalActive) * 100) : 0}
        />
        <StatCard
          icon={IconCurrency}
          label="This Month"
          value={formatPKR(stats.monthlyRevenue)}
          sub="revenue collected"
          tone="sky"
        />
        <StatCard
          icon={IconCalendar}
          label="Expiring Soon"
          value={stats.expiringIn7Days}
          sub="within 7 days"
          tone="amber"
          alert={stats.expiringIn7Days > 0}
        />
        <StatCard
          icon={IconWarning}
          label="Overdue"
          value={stats.overdueMemberships}
          sub="expired memberships"
          tone="red"
          alert={stats.overdueMemberships > 0}
        />
      </div>

      {/* Charts + lists */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Revenue chart */}
        <div className="lg:col-span-3 bg-[#1a1d2e] border border-[#252840] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Revenue Trend</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Last 6 months</p>
            </div>
            <IconTrendUp className="w-4 h-4 text-indigo-400" />
          </div>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#252840" vertical={false} />
                <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  formatter={(v) => [formatPKR(v), 'Revenue']}
                  contentStyle={{ background: '#151826', border: '1px solid #252840', borderRadius: '10px', color: '#f1f5f9', fontSize: 12 }}
                  cursor={{ fill: '#252840' }}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">
              No payment data yet
            </div>
          )}
        </div>

        {/* Expiring soon */}
        <div className="lg:col-span-2 bg-[#1a1d2e] border border-[#252840] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Expiring Soon</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Next 7 days</p>
            </div>
            {expiringSoon.length > 0 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {expiringSoon.length} members
              </span>
            )}
          </div>
          {expiringSoon.length === 0 ? (
            <div className="h-[220px] flex flex-col items-center justify-center gap-2">
              <IconCheckCircle className="w-8 h-8 text-emerald-500/40" />
              <p className="text-sm text-slate-600">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {expiringSoon.map((sub) => {
                const daysLeft = Math.ceil((new Date(sub.end_date) - new Date()) / 86400000);
                return (
                  <div
                    key={sub.subscription_id}
                    className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                    onClick={() => navigate('/members')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MiniAvatar name={sub.members?.name || ''} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{sub.members?.name || sub.member_id}</p>
                        <p className="text-[10px] text-slate-500">{formatDate(sub.end_date)}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      daysLeft <= 1 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {daysLeft}d left
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone, pct, alert }) {
  const tones = {
    indigo: { card: 'border-indigo-500/20 glow-indigo', icon: 'bg-indigo-500/20 text-indigo-300', bar: 'bg-indigo-500' },
    emerald: { card: 'border-emerald-500/20 glow-emerald', icon: 'bg-emerald-500/20 text-emerald-300', bar: 'bg-emerald-500' },
    sky:     { card: 'border-sky-500/20 glow-sky',     icon: 'bg-sky-500/20 text-sky-300',     bar: 'bg-sky-500' },
    amber:   { card: 'border-amber-500/20 glow-amber', icon: 'bg-amber-500/20 text-amber-300', bar: 'bg-amber-500' },
    red:     { card: 'border-red-500/20 glow-red',     icon: 'bg-red-500/20 text-red-300',     bar: 'bg-red-500' },
  };
  const t = tones[tone] || tones.indigo;
  return (
    <div className={`bg-[#1a1d2e] border ${t.card} rounded-xl p-5 relative overflow-hidden`}>
      {alert && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-current opacity-60 animate-pulse" style={{ color: 'inherit' }} />
      )}
      <div className={`w-9 h-9 rounded-lg ${t.icon} flex items-center justify-center mb-3`}>
        <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>
      <div className="text-xs text-slate-400 mt-2 font-medium">{label}</div>
      {pct !== undefined && (
        <div className="mt-3">
          <div className="h-1 bg-[#252840] rounded-full overflow-hidden">
            <div className={`h-full ${t.bar} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <p className="text-[10px] text-slate-600 mt-1">{pct}% attendance rate</p>
        </div>
      )}
    </div>
  );
}

function MiniAvatar({ name }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-indigo-600', 'bg-violet-600', 'bg-sky-600', 'bg-emerald-600', 'bg-amber-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
      {initials || '?'}
    </div>
  );
}


