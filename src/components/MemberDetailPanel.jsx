import { useEffect, useState, useCallback } from 'react';
import { useMembers } from '../hooks/useMembers';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useViolations } from '../hooks/useViolations';
import { usePlans } from '../hooks/usePlans';
import { usePayments } from '../hooks/usePayments';
import BarcodeCard from './BarcodeCard';
import { formatPhoneDisplay, isValidPakistaniPhone } from '../utils/phone';
import { formatDate, formatPKR, today, daysBetween } from '../utils/helpers';
import { useToast } from '../contexts/ToastContext';
import {
  IconPlus, IconPhone, IconCalendar, IconCurrency, IconWarning, IconEye,
  IconEdit, IconBarcode, IconX, IconCheckCircle,
} from './Icons';

// ── Avatar helpers ────────────────────────────────────────────────────────────
function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0]?.[0] || '?');
}
const AVATAR_COLORS = ['bg-indigo-500','bg-violet-500','bg-sky-500','bg-emerald-600','bg-amber-500','bg-rose-500','bg-teal-500','bg-cyan-600'];
function avatarColor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function MemberAvatar({ name, size = 'md' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-sm';
  return (
    <div className={`${sz} ${avatarColor(name)} rounded-full flex items-center justify-center font-bold text-white shrink-0 uppercase`}>
      {getInitials(name)}
    </div>
  );
}

function monthLabel(ref) {
  if (!ref) return ref;
  const [y, m] = ref.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' });
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MemberDetailPanel({ memberId, onClose, onMemberUpdated }) {
  const toast = useToast();
  const { fetchMember, updateMember } = useMembers();
  const {
    fetchSubscriptions, addSubscription, getLatestSubscription,
    fetchMembershipMonths, markMembershipMonthsPaid, dismissMembershipMonths,
  } = useSubscriptions();
  const { fetchViolations, resolveViolations, dismissViolation } = useViolations();
  const { plans, fetchPlans } = usePlans();
  const { fetchPayments, addPayment } = usePayments();

  const [member, setMember] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [violations, setViolations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [membershipMonths, setMembershipMonths] = useState([]);
  const [latestSub, setLatestSub] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');

  // Edit form state
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone_number: '', status: 'active', join_date: '' });
  const [editError, setEditError] = useState('');

  // New plan form state
  const [showSubForm, setShowSubForm] = useState(false);
  const [subForm, setSubForm] = useState({ plan_id: '', start_date: today(), price_paid: '', months_paid_now: '', payment_date: today(), payment_method: 'cash' });

  // Settle dues form
  const [settleForm, setSettleForm] = useState({ months_to_pay: 1, payment_date: today(), payment_method: 'cash' });

  // Barcode
  const [showBarcode, setShowBarcode] = useState(false);

  const loadData = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const [m, subs, viols, pmts, months, ls] = await Promise.all([
        fetchMember(memberId),
        fetchSubscriptions(memberId),
        fetchViolations(memberId),
        fetchPayments(memberId),
        fetchMembershipMonths(memberId),
        getLatestSubscription(memberId),
      ]);
      setMember(m);
      setSubscriptions(subs);
      setViolations(viols);
      setPayments(pmts);
      setMembershipMonths(months);
      setLatestSub(ls);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchPlans();
    loadData();
  }, [memberId]);

  if (!memberId) return null;

  const unpaidMonths = membershipMonths.filter((m) => m.paid_status === 'unpaid');
  const isExpired = latestSub && latestSub.end_date < today();
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    if (!isValidPakistaniPhone(editForm.phone_number)) { setEditError('Invalid phone'); return; }
    try {
      await updateMember(memberId, editForm);
      toast.success('Member updated');
      setShowEdit(false);
      loadData();
      onMemberUpdated?.();
    } catch (err) { setEditError(err.message); }
  };

  const handleAddSubscription = async (e) => {
    e.preventDefault();
    if (!subForm.plan_id || !member) return;
    const plan = plans.find((p) => p.plan_id === subForm.plan_id);
    if (!plan) return;
    try {
      const totalPrice = Number(subForm.price_paid || plan.default_price_pkr);
      const duration = Number(plan.duration_months) || 1;
      const monthsPaidNow = Math.max(0, Math.min(Number(subForm.months_paid_now === '' ? duration : subForm.months_paid_now) || 0, duration));
      const upfrontAmount = Number(((totalPrice / duration) * monthsPaidNow).toFixed(2));
      const newSub = await addSubscription({ member_id: memberId, start_date: subForm.start_date, price_paid: totalPrice }, plan, { paidMonthsCount: monthsPaidNow });
      if (upfrontAmount > 0) {
        await addPayment({ member_id: memberId, subscription_id: newSub?.subscription_id || null, amount: upfrontAmount, payment_date: subForm.payment_date || today(), payment_method: subForm.payment_method || 'cash' });
      }
      toast.success('Plan assigned');
      setShowSubForm(false);
      setSubForm({ plan_id: '', start_date: today(), price_paid: '', months_paid_now: '', payment_date: today(), payment_method: 'cash' });
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleSettleDues = async (e) => {
    e.preventDefault();
    try {
      const requested = Math.max(1, Number(settleForm.months_to_pay) || 1);
      const toPay = unpaidMonths.slice(0, Math.min(requested, unpaidMonths.length));
      if (!toPay.length) return;
      let amount = 0;
      for (const month of toPay) {
        const sub = subscriptions.find((s) => s.subscription_id === month.subscription_id);
        if (sub) amount += Number(sub.price_paid || 0) / Number(sub.membership_plans?.duration_months || 1);
      }
      amount = Number(amount.toFixed(2));
      await markMembershipMonthsPaid(toPay.map((m) => m.id));
      if (amount > 0) {
        const subs = new Set(toPay.map((m) => m.subscription_id));
        await addPayment({ member_id: memberId, subscription_id: subs.size === 1 ? toPay[0].subscription_id : null, amount, payment_date: settleForm.payment_date || today(), payment_method: settleForm.payment_method || 'cash' });
      }
      await resolveViolations(memberId);
      toast.success(`Settled ${toPay.length} month(s) — ${formatPKR(amount)}`);
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleDismissAll = async () => {
    if (!window.confirm('Clear ALL unpaid dues and violations for this member? This will NOT record a payment.')) return;
    try {
      if (unpaidMonths.length) await dismissMembershipMonths(unpaidMonths.map((m) => m.id));
      await resolveViolations(memberId);
      toast.success('All dues cleared (dismissed)');
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleDismissViolation = async (violationId) => {
    try {
      await dismissViolation(violationId);
      toast.success('Violation dismissed');
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handlePayMonth = async (month) => {
    try {
      const sub = subscriptions.find((s) => s.subscription_id === month.subscription_id);
      const amount = sub ? Number((Number(sub.price_paid || 0) / Number(sub.membership_plans?.duration_months || 1)).toFixed(2)) : 0;
      await markMembershipMonthsPaid([month.id]);
      if (amount > 0) {
        await addPayment({ member_id: memberId, subscription_id: month.subscription_id, amount, payment_date: today(), payment_method: 'cash' });
      }
      toast.success(`${monthLabel(month.month_reference)} marked paid — ${formatPKR(amount)}`);
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const openNewPlan = () => {
    if (unpaidMonths.length > 0) {
      toast.warning(`This member has ${unpaidMonths.length} unpaid month(s). Clear dues first or settle before assigning a new plan.`);
    }
    if (latestSub && isExpired) {
      const lastPlan = plans.find((p) => p.plan_id === latestSub.plan_id);
      setSubForm({ plan_id: lastPlan?.plan_id || '', start_date: today(), price_paid: lastPlan?.default_price_pkr || '', months_paid_now: String(lastPlan?.duration_months || ''), payment_date: today(), payment_method: 'cash' });
    } else {
      setSubForm({ plan_id: '', start_date: today(), price_paid: '', months_paid_now: '', payment_date: today(), payment_method: 'cash' });
    }
    setShowSubForm(true);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const isModal = !!onClose;

  const panelContent = loading ? (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  ) : !member ? (
    <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Member not found</div>
  ) : (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="p-5 border-b border-[var(--border)]">
        <div className="flex items-start gap-4">
          <MemberAvatar name={member.name} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white">{member.name}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${
                member.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : member.status === 'suspended' ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
              }`}>{member.status}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1"><IconPhone className="w-3 h-3" />{formatPhoneDisplay(member.phone_number)}</span>
              <span className="inline-flex items-center gap-1"><IconCalendar className="w-3 h-3" />Joined {formatDate(member.join_date)}</span>
              <span className="text-slate-600 font-mono">{member.member_id}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button title="Barcode Card" onClick={() => setShowBarcode(true)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"><IconBarcode className="w-4 h-4" /></button>
            <button title="Edit Member" onClick={() => { setEditForm({ name: member.name, phone_number: member.phone_number, status: member.status, join_date: member.join_date }); setShowEdit(true); }} className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition"><IconEdit className="w-4 h-4" /></button>
            <button title="New Plan" onClick={openNewPlan} className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition"><IconPlus className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Membership status */}
        {latestSub && (
          <div className={`mt-3 rounded-lg border p-3 flex flex-wrap items-center justify-between gap-2 text-xs ${
            !isExpired ? 'bg-emerald-500/8 border-emerald-500/25' : 'bg-amber-500/8 border-amber-500/25'
          }`}>
            <div>
              <p className={`font-semibold text-sm ${isExpired ? 'text-amber-300' : 'text-emerald-300'}`}>
                {isExpired ? '⚠ Membership Expired' : '✓ Membership Active'}
              </p>
              <p className="text-slate-400 mt-0.5">
                {formatDate(latestSub.start_date)} → {formatDate(latestSub.end_date)}
                {latestSub.membership_plans?.plan_name && <span className="ml-2 text-slate-500">({latestSub.membership_plans.plan_name} · {latestSub.membership_plans.plan_class})</span>}
              </p>
            </div>
            {!isExpired && <span className="text-emerald-400 font-medium">{daysBetween(today(), latestSub.end_date)} days left</span>}
            {isExpired && <span className="text-amber-300 font-medium">{daysBetween(latestSub.end_date, today())} days overdue</span>}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-[var(--border)] px-5">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'plans', label: `Plans (${subscriptions.length})` },
          { id: 'payments', label: `Payments (${payments.length})` },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setDetailTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
              detailTab === tab.id ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* ══ OVERVIEW TAB ══ */}
        {detailTab === 'overview' && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: IconCurrency, label: 'Total Paid', value: formatPKR(totalPaid) },
                { icon: IconEye, label: 'Plans', value: String(subscriptions.length) },
                { icon: IconWarning, label: 'Violations', value: String(violations.length), tone: violations.length ? 'amber' : 'ok' },
                { icon: IconCalendar, label: 'Unpaid Months', value: String(unpaidMonths.length), tone: unpaidMonths.length ? 'red' : 'ok' },
              ].map(({ icon: Icon, label, value, tone }) => (
                <div key={label} className={`rounded-lg border p-3 ${
                  tone === 'amber' ? 'border-amber-500/20 bg-amber-500/5'
                  : tone === 'red' ? 'border-red-500/20 bg-red-500/5'
                  : 'border-[var(--border)] bg-[var(--bg-secondary)]'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">{label}</span>
                    <Icon className={`w-4 h-4 ${tone === 'amber' ? 'text-amber-300' : tone === 'red' ? 'text-red-300' : 'text-indigo-300'}`} />
                  </div>
                  <p className="text-sm font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* ── Monthly Breakdown ── */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold text-slate-100">Monthly Breakdown</h3>
                {unpaidMonths.length > 0 && (
                  <button onClick={handleDismissAll} className="text-xs text-slate-400 hover:text-red-300 border border-slate-600 hover:border-red-500/50 px-2 py-1 rounded-lg transition">
                    🗑 Clear All Dues
                  </button>
                )}
              </div>

              {membershipMonths.length === 0 ? (
                <p className="text-center text-slate-600 text-sm py-6">No months recorded yet.</p>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {membershipMonths.map((month) => {
                    const sub = subscriptions.find((s) => s.subscription_id === month.subscription_id);
                    const perMonth = sub ? Number((Number(sub.price_paid || 0) / Number(sub.membership_plans?.duration_months || 1)).toFixed(0)) : 0;
                    return (
                      <div key={month.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            month.paid_status === 'paid' ? 'bg-emerald-500'
                            : month.paid_status === 'refunded' ? 'bg-slate-500'
                            : 'bg-red-500 animate-pulse'
                          }`} />
                          <span className="text-sm text-slate-200 font-medium">{monthLabel(month.month_reference)}</span>
                          <span className="text-xs text-slate-500">{sub?.membership_plans?.plan_name || '—'}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold text-white">{formatPKR(perMonth)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            month.paid_status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                            : month.paid_status === 'refunded' ? 'bg-slate-500/10 border-slate-500/25 text-slate-400'
                            : 'bg-red-500/10 border-red-500/25 text-red-300'
                          }`}>{month.paid_status}</span>
                          {month.paid_status === 'unpaid' && (
                            <button onClick={() => handlePayMonth(month)}
                              className="text-[11px] px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition">
                              Pay
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Settle Dues (bulk) ── */}
            {unpaidMonths.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-amber-300">Settle Dues</h3>
                  <span className="text-xs text-amber-400">{unpaidMonths.length} unpaid month{unpaidMonths.length !== 1 ? 's' : ''}</span>
                </div>
                <form onSubmit={handleSettleDues} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Months to pay</label>
                    <input type="number" min={1} max={unpaidMonths.length} value={settleForm.months_to_pay}
                      onChange={(e) => setSettleForm({ ...settleForm, months_to_pay: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Date</label>
                    <input type="date" value={settleForm.payment_date}
                      onChange={(e) => setSettleForm({ ...settleForm, payment_date: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Method</label>
                    <select value={settleForm.payment_method}
                      onChange={(e) => setSettleForm({ ...settleForm, payment_method: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500">
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                  <button type="submit" className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition">
                    Settle
                  </button>
                </form>
              </div>
            )}

            {/* ── Violations ── */}
            {violations.length > 0 && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-amber-500/15 flex items-center gap-2">
                  <IconWarning className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-amber-300">Violations</h3>
                </div>
                <div className="divide-y divide-amber-500/10">
                  {violations.map((v) => (
                    <div key={v.violation_id} className="flex items-center justify-between px-4 py-3 gap-3">
                      <div>
                        <p className="text-sm text-amber-200 font-medium">{v.overdue_days} overdue day{v.overdue_days !== 1 ? 's' : ''}</p>
                        <p className="text-xs text-slate-500">Recorded {formatDate(v.recorded_date)}</p>
                      </div>
                      <button onClick={() => handleDismissViolation(v.violation_id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition">
                        Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unpaidMonths.length === 0 && violations.length === 0 && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <IconCheckCircle className="w-4 h-4" />All clear — no unpaid dues or violations
              </div>
            )}
          </>
        )}

        {/* ══ PLANS TAB ══ */}
        {detailTab === 'plans' && (
          <div className="space-y-3">
            {subscriptions.length === 0 && <p className="text-center text-slate-600 text-sm py-10">No plans yet.</p>}
            {subscriptions.map((sub) => {
              const subMonths = membershipMonths.filter((m) => m.subscription_id === sub.subscription_id);
              const isActive = sub.end_date >= today();
              return (
                <div key={sub.subscription_id} className={`rounded-xl border p-4 ${isActive ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--border)] bg-[var(--bg-secondary)]'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{sub.membership_plans?.plan_name || 'Plan'}</p>
                      <p className="text-xs text-slate-500">{sub.membership_plans?.plan_class}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{formatPKR(sub.price_paid)}</p>
                      <p className="text-xs text-slate-500">{formatDate(sub.start_date)} → {formatDate(sub.end_date)}</p>
                    </div>
                  </div>
                  {subMonths.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {subMonths.map((m) => (
                        <span key={m.id} className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${
                          m.paid_status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                          : m.paid_status === 'refunded' ? 'bg-slate-500/10 border-slate-500/25 text-slate-400'
                          : 'bg-red-500/10 border-red-500/25 text-red-300'
                        }`}>
                          {monthLabel(m.month_reference)} {m.paid_status === 'paid' ? '✓' : m.paid_status === 'refunded' ? '↩' : '○'}
                        </span>
                      ))}
                    </div>
                  )}
                  {isActive && <p className="text-xs text-emerald-400 mt-2 font-medium">Active</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ PAYMENTS TAB ══ */}
        {detailTab === 'payments' && (
          <div className="space-y-2">
            {payments.length === 0 && <p className="text-center text-slate-600 text-sm py-10">No payments recorded.</p>}
            {payments.map((p, idx) => (
              <div key={p.payment_id || idx} className="flex items-center justify-between border border-[var(--border)] bg-[var(--bg-secondary)] rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{formatPKR(p.amount)}</p>
                  <p className="text-xs text-slate-500">{formatDate(p.payment_date)}</p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  p.payment_method === 'cash' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                  : p.payment_method === 'bank_transfer' ? 'bg-sky-500/10 border-sky-500/25 text-sky-300'
                  : p.payment_method === 'online' ? 'bg-violet-500/10 border-violet-500/25 text-violet-300'
                  : 'bg-slate-500/10 border-slate-500/25 text-slate-300'
                }`}>{(p.payment_method || 'other').replace('_', ' ')}</span>
              </div>
            ))}
            {payments.length > 0 && (
              <div className="flex items-center justify-between border border-[var(--border)] rounded-lg px-4 py-3 mt-2 bg-indigo-500/5">
                <span className="text-xs text-slate-400">Total paid</span>
                <span className="text-sm font-bold text-white">{formatPKR(totalPaid)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ── Internal modals ──────────────────────────────────────────────────────────

  return (
    <>
      {isModal ? (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <span className="text-xs text-slate-400 font-medium">Member Profile</span>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition"><IconX className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">{panelContent}</div>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">{panelContent}</div>
      )}

      {/* Edit member modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Edit Member</h2>
              <button onClick={() => setShowEdit(false)} className="text-slate-500 hover:text-slate-300"><IconX className="w-4 h-4" /></button>
            </div>
            {editError && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 mb-4 text-sm">{editError}</div>}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                <input type="text" value={editForm.phone_number} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Join Date</label>
                <input type="date" value={editForm.join_date} onChange={(e) => setEditForm({ ...editForm, join_date: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <div className="flex gap-2">
                  {['active', 'inactive', 'suspended'].map((s) => (
                    <button key={s} type="button" onClick={() => setEditForm({ ...editForm, status: s })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition capitalize ${
                        editForm.status === s
                          ? s === 'active' ? 'bg-emerald-600 border-emerald-500 text-white'
                            : s === 'inactive' ? 'bg-slate-600 border-slate-500 text-white'
                            : 'bg-red-600 border-red-500 text-white'
                          : 'bg-transparent border-[var(--border)] text-slate-400 hover:border-slate-500'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-medium text-sm transition">Update</button>
                <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 border border-[var(--border)] rounded-lg text-slate-300 hover:bg-white/5 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New plan modal */}
      {showSubForm && member && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">Assign Plan</h2>
              <button onClick={() => setShowSubForm(false)} className="text-slate-500 hover:text-slate-300"><IconX className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-500 mb-1">{member.name} · {member.member_id}</p>
            <p className="text-[11px] text-slate-600 mb-4">You can set months paid now to 0 to record a payment later.</p>
            {unpaidMonths.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg p-3 mb-4 text-xs">
                ⚠ {unpaidMonths.length} unpaid month(s) exist. Consider clearing dues first.
              </div>
            )}
            <form onSubmit={handleAddSubscription} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Plan</label>
                <select value={subForm.plan_id}
                  onChange={(e) => { const p = plans.find((pl) => pl.plan_id === e.target.value); setSubForm({ ...subForm, plan_id: e.target.value, price_paid: p?.default_price_pkr || '', months_paid_now: String(p?.duration_months || '') }); }}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500" required>
                  <option value="">Select a plan</option>
                  {plans.map((p) => <option key={p.plan_id} value={p.plan_id}>{p.plan_name} – {p.plan_class} ({p.duration_months}mo) – {formatPKR(p.default_price_pkr)}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                <input type="date" value={subForm.start_date} onChange={(e) => setSubForm({ ...subForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500" required />
              </div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Price (PKR)</label>
                <input type="number" value={subForm.price_paid} onChange={(e) => setSubForm({ ...subForm, price_paid: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500" required />
              </div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Months paid now (0 = pay later)</label>
                <input type="number" min={0} max={plans.find((p) => p.plan_id === subForm.plan_id)?.duration_months || 12}
                  value={subForm.months_paid_now} onChange={(e) => setSubForm({ ...subForm, months_paid_now: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500" placeholder="0 = no payment today" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Payment Date</label>
                  <input type="date" value={subForm.payment_date} onChange={(e) => setSubForm({ ...subForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                </div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Method</label>
                  <select value={subForm.payment_method} onChange={(e) => setSubForm({ ...subForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500">
                    <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="online">Online</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-medium text-sm transition">Assign Plan</button>
                <button type="button" onClick={() => setShowSubForm(false)} className="px-4 py-2 border border-[var(--border)] rounded-lg text-slate-300 hover:bg-white/5 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode modal */}
      {showBarcode && member && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200">Member Card</h3>
              <button onClick={() => setShowBarcode(false)} className="text-slate-500 hover:text-slate-300"><IconX className="w-4 h-4" /></button>
            </div>
            <BarcodeCard member={member} />
          </div>
        </div>
      )}
    </>
  );
}
