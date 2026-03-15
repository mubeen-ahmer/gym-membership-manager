import { useEffect, useState } from 'react';
import { useMembers } from '../hooks/useMembers';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useViolations } from '../hooks/useViolations';
import { usePlans } from '../hooks/usePlans';
import { usePayments } from '../hooks/usePayments';
import MemberSearch from '../components/MemberSearch';
import BarcodeCard from '../components/BarcodeCard';
import { formatPhoneDisplay, isValidPakistaniPhone } from '../utils/phone';
import { formatDate, formatPKR, today, daysBetween } from '../utils/helpers';
import { useToast } from '../contexts/ToastContext';
import {
  IconPlus, IconUsers, IconPhone, IconCalendar, IconCurrency, IconWarning, IconEye, IconEdit, IconBarcode, IconX,
  IconCheckCircle,
} from '../components/Icons';

// Helper: generate avatar initials + deterministic colour
function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0]?.[0] || '?');
}
const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-600',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-cyan-600',
];
function avatarColor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function MemberAvatar({ name, size = 'md' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sz} ${avatarColor(name)} rounded-full flex items-center justify-center font-bold text-white shrink-0 uppercase`}>
      {getInitials(name)}
    </div>
  );
}

export default function Members() {
  const toast = useToast();
  const {
    members, loading, fetchMembers, addMember, updateMember, checkExistingPhone,
  } = useMembers();
  const {
    fetchSubscriptions, addSubscription, getLatestSubscription, fetchMembershipMonths, markMembershipMonthsPaid,
  } = useSubscriptions();
  const { fetchViolations, resolveViolations } = useViolations();
  const { plans, fetchPlans } = usePlans();
  const { fetchPayments, addPayment } = usePayments();

  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [detailTab, setDetailTab] = useState('overview'); // 'overview' | 'plans' | 'payments'
  const [showBarcode, setShowBarcode] = useState(null);
  const [returningMember, setReturningMember] = useState(null);
  const [showSubForm, setShowSubForm] = useState(false);
  const [subFormMember, setSubFormMember] = useState(null);
  const [settleForm, setSettleForm] = useState({
    months_to_pay: 1,
    payment_date: today(),
    payment_method: 'cash',
  });

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    status: 'active',
    join_date: today(),
  });
  const [formError, setFormError] = useState('');
  const [subForm, setSubForm] = useState({
    plan_id: '',
    start_date: today(),
    price_paid: '',
    months_paid_now: '',
    payment_date: today(),
    payment_method: 'cash',
  });

  useEffect(() => {
    fetchMembers();
    fetchPlans();
  }, [fetchMembers, fetchPlans]);

  const resetForm = () => {
    setFormData({ name: '', phone_number: '', status: 'active', join_date: today() });
    setFormError('');
    setEditingMember(null);
    setReturningMember(null);
    setShowForm(false);
  };

  const handlePhoneBlur = async () => {
    if (!formData.phone_number || editingMember) return;
    if (!isValidPakistaniPhone(formData.phone_number)) {
      setFormError('Invalid Pakistani phone number');
      return;
    }
    const existing = await checkExistingPhone(formData.phone_number);
    if (existing) {
      setReturningMember(existing);
      setFormError('');
    } else {
      setReturningMember(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!isValidPakistaniPhone(formData.phone_number)) {
      setFormError('Invalid Pakistani phone number format');
      return;
    }
    try {
      if (editingMember) {
        await updateMember(editingMember.member_id, formData);
        toast.success('Member updated successfully');
      } else if (returningMember) {
        setSubFormMember(returningMember);
        setSubForm({
          plan_id: '',
          start_date: today(),
          price_paid: '',
          months_paid_now: '',
          payment_date: today(),
          payment_method: 'cash',
        });
        setShowSubForm(true);
        resetForm();
        return;
      } else {
        const newMember = await addMember(formData);
        toast.success(`Member ${formData.name} added`);
        setSubFormMember(newMember);
        setSubForm({
          plan_id: '',
          start_date: today(),
          price_paid: '',
          months_paid_now: '',
          payment_date: today(),
          payment_method: 'cash',
        });
        setShowSubForm(true);
      }
      resetForm();
      fetchMembers();
    } catch (err) {
      setFormError(err.message || 'Error saving member');
    }
  };

  const handleAddSubscription = async (e) => {
    e.preventDefault();
    if (!subForm.plan_id || !subFormMember) return;
    const plan = plans.find((p) => p.plan_id === subForm.plan_id);
    if (!plan) return;
    try {
      const totalPrice = Number(subForm.price_paid || plan.default_price_pkr);
      const duration = Number(plan.duration_months) || 1;
      const monthsPaidNow = Math.max(
        0,
        Math.min(Number(subForm.months_paid_now === '' ? duration : subForm.months_paid_now) || 0, duration)
      );
      const perMonth = totalPrice / duration;
      const upfrontAmount = Number((perMonth * monthsPaidNow).toFixed(2));
      const newSub = await addSubscription(
        {
          member_id: subFormMember.member_id,
          start_date: subForm.start_date,
          price_paid: totalPrice,
        },
        plan,
        { paidMonthsCount: monthsPaidNow }
      );
      if (upfrontAmount > 0) {
        await addPayment({
          member_id: subFormMember.member_id,
          subscription_id: newSub?.subscription_id || null,
          amount: upfrontAmount,
          payment_date: subForm.payment_date || today(),
          payment_method: subForm.payment_method || 'cash',
        });
      }
      setShowSubForm(false);
      setSubFormMember(null);
      setSubForm({
        plan_id: '',
        start_date: today(),
        price_paid: '',
        months_paid_now: '',
        payment_date: today(),
        payment_method: 'cash',
      });
      fetchMembers();
      toast.success('Plan assigned successfully');
      if (selectedMember?.member_id === subFormMember.member_id) {
        loadMemberDetails(subFormMember);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to assign plan');
      setFormError(err.message);
    }
  };

  const loadMemberDetails = async (member) => {
    const [subscriptions, violations, payments, latestSubscription, membershipMonths] = await Promise.all([
      fetchSubscriptions(member.member_id),
      fetchViolations(member.member_id),
      fetchPayments(member.member_id),
      getLatestSubscription(member.member_id),
      fetchMembershipMonths(member.member_id),
    ]);
    const unpaidCount = membershipMonths.filter((m) => m.paid_status === 'unpaid').length;
    setSelectedMember({
      ...member,
      subscriptions,
      violations,
      payments,
      latestSubscription,
      membershipMonths,
    });
    setSettleForm((prev) => ({
      ...prev,
      months_to_pay: unpaidCount > 0 ? Math.min(prev.months_to_pay || 1, unpaidCount) : 1,
    }));
  };

  const handleSettleDues = async (e) => {
    e.preventDefault();
    try {
      if (!selectedMember?.membershipMonths?.length) return;
      const unpaid = selectedMember.membershipMonths
        .filter((m) => m.paid_status === 'unpaid')
        .sort((a, b) => (a.month_reference || '').localeCompare(b.month_reference || ''));
      if (!unpaid.length) return;

      const requested = Math.max(1, Number(settleForm.months_to_pay) || 1);
      const payCount = Math.min(requested, unpaid.length);
      const toPay = unpaid.slice(0, payCount);

      let amount = 0;
      for (const month of toPay) {
        const sub = selectedMember.subscriptions?.find((s) => s.subscription_id === month.subscription_id);
        if (sub) {
          const duration = Number(sub.membership_plans?.duration_months || 1);
          amount += Number(sub.price_paid || 0) / duration;
        }
      }
      amount = Number(amount.toFixed(2));

      await markMembershipMonthsPaid(toPay.map((m) => m.id));
      if (amount > 0) {
        const singleSub = new Set(toPay.map((m) => m.subscription_id));
        await addPayment({
          member_id: selectedMember.member_id,
          subscription_id: singleSub.size === 1 ? toPay[0].subscription_id : null,
          amount,
          payment_date: settleForm.payment_date || today(),
          payment_method: settleForm.payment_method || 'cash',
        });
      }
      await resolveViolations(selectedMember.member_id);
      await loadMemberDetails(selectedMember);
      toast.success(`Settled ${payCount} month(s) — ${formatPKR(amount)} recorded`);
      setFormError('');
    } catch (err) {
      toast.error(err.message || 'Could not settle dues');
      setFormError(err.message || 'Could not settle dues');
    }
  };

  const openEditModal = (member) => {
    setFormData({
      name: member.name,
      phone_number: member.phone_number,
      status: member.status,
      join_date: member.join_date,
    });
    setEditingMember(member);
    setShowForm(true);
  };

  const unpaidMonths = selectedMember?.membershipMonths?.filter((m) => m.paid_status === 'unpaid') || [];
  const isExpired = selectedMember?.latestSubscription && selectedMember.latestSubscription.end_date < today();

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Member Desk</h1>
          <p className="text-xs text-slate-500">Profiles, subscriptions, payments — all in one place.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingMember(null); }}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <IconPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* ── LEFT COLUMN: search + member list ── */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3">
            <MemberSearch onSelect={(m) => { loadMemberDetails(m); setDetailTab('overview'); }} />
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-100">All Members</span>
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{members.length}</span>
            </div>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-[var(--border)]">
                {members.map((member) => {
                  const isSelected = selectedMember?.member_id === member.member_id;
                  return (
                    <button
                      key={member.member_id}
                      onClick={() => { loadMemberDetails(member); setDetailTab('overview'); }}
                      className={`w-full text-left px-4 py-3 hover:bg-white/5 transition flex items-center gap-3 ${isSelected ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''}`}
                    >
                      <MemberAvatar name={member.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{member.name}</p>
                        <p className="text-xs text-slate-500 truncate">{member.member_id}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${
                        member.status === 'active'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : member.status === 'inactive'
                            ? 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-300'
                      }`}>
                        {member.status}
                      </span>
                    </button>
                  );
                })}
                {!members.length && (
                  <div className="text-center py-10 text-sm text-slate-600">No members yet.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: detail panel ── */}
        <div className="xl:col-span-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl min-h-[500px] flex flex-col">
          {!selectedMember ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-3">
              <IconUsers className="w-12 h-12" />
              <p className="text-sm">Select a member to view their profile.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Member header */}
              <div className="p-5 border-b border-[var(--border)]">
                <div className="flex items-start gap-4">
                  <MemberAvatar name={selectedMember.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{selectedMember.name}</h2>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        selectedMember.status === 'active'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                      }`}>{selectedMember.status}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1"><IconPhone className="w-3 h-3" />{formatPhoneDisplay(selectedMember.phone_number)}</span>
                      <span className="inline-flex items-center gap-1"><IconCalendar className="w-3 h-3" />Joined {formatDate(selectedMember.join_date)}</span>
                      <span className="text-slate-600">{selectedMember.member_id}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button title="Barcode Card" onClick={() => setShowBarcode(selectedMember)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition">
                      <IconBarcode className="w-4 h-4" />
                    </button>
                    <button title="Edit Member" onClick={() => openEditModal(selectedMember)}
                      className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition">
                      <IconEdit className="w-4 h-4" />
                    </button>
                    <button title="New Plan" onClick={() => {
                        setSubFormMember(selectedMember);
                        setSubForm({ plan_id: '', start_date: today(), price_paid: '', months_paid_now: '', payment_date: today(), payment_method: 'cash' });
                        setShowSubForm(true);
                      }}
                      className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition">
                      <IconPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Membership status bar */}
                {selectedMember.latestSubscription && (
                  <div className={`mt-3 rounded-lg border p-3 flex flex-wrap items-center justify-between gap-2 text-xs ${
                    !isExpired ? 'bg-emerald-500/8 border-emerald-500/25' : 'bg-amber-500/8 border-amber-500/25'
                  }`}>
                    <div>
                      <p className={`font-semibold text-sm ${isExpired ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {isExpired ? '⚠ Membership Expired' : '✓ Membership Active'}
                      </p>
                      <p className="text-slate-400 mt-0.5">
                        {formatDate(selectedMember.latestSubscription.start_date)} → {formatDate(selectedMember.latestSubscription.end_date)}
                        {selectedMember.latestSubscription.membership_plans?.plan_name && (
                          <span className="ml-2 text-slate-500">({selectedMember.latestSubscription.membership_plans.plan_name} · {selectedMember.latestSubscription.membership_plans.plan_class})</span>
                        )}
                      </p>
                    </div>
                    {isExpired && (
                      <button
                        onClick={() => {
                          const lastPlan = plans.find((p) => p.plan_id === selectedMember.latestSubscription.plan_id);
                          setSubFormMember(selectedMember);
                          setSubForm({
                            plan_id: lastPlan?.plan_id || '',
                            start_date: today(),
                            price_paid: lastPlan?.default_price_pkr || '',
                            months_paid_now: String(lastPlan?.duration_months || ''),
                            payment_date: today(),
                            payment_method: 'cash',
                          });
                          setShowSubForm(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 transition"
                      >
                        <IconCurrency className="w-3.5 h-3.5" />
                        Renew &amp; Pay
                      </button>
                    )}
                    {!isExpired && (
                      <span className="text-emerald-400 text-xs font-medium">
                        {daysBetween(today(), selectedMember.latestSubscription.end_date)} days left
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[var(--border)] px-5">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'plans', label: `Plans (${selectedMember.subscriptions?.length || 0})` },
                  { id: 'payments', label: `Payments (${selectedMember.payments?.length || 0})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                      detailTab === tab.id
                        ? 'border-indigo-500 text-indigo-300'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-5">
                {/* ── OVERVIEW TAB ── */}
                {detailTab === 'overview' && (
                  <div className="space-y-5">
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <MiniCard icon={IconCurrency} label="Total Paid" value={formatPKR(selectedMember.payments?.reduce((s, p) => s + Number(p.amount), 0) || 0)} />
                      <MiniCard icon={IconEye} label="Subscriptions" value={String(selectedMember.subscriptions?.length || 0)} />
                      <MiniCard icon={IconWarning} label="Violations" value={String(selectedMember.violations?.length || 0)} tone={selectedMember.violations?.length ? 'amber' : 'default'} />
                      <MiniCard icon={IconCalendar} label="Unpaid Months" value={String(unpaidMonths.length)} tone={unpaidMonths.length ? 'red' : 'default'} />
                    </div>

                    {/* Settle dues */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-100">Settle Dues</h3>
                        {unpaidMonths.length > 0 ? (
                          <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            {unpaidMonths.length} month{unpaidMonths.length !== 1 ? 's' : ''} unpaid
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400 flex items-center gap-1"><IconCheckCircle className="w-3.5 h-3.5" />All clear</span>
                        )}
                      </div>
                      <form onSubmit={handleSettleDues} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Months to pay</label>
                          <input type="number" min={1} max={Math.max(1, unpaidMonths.length)}
                            value={settleForm.months_to_pay}
                            onChange={(e) => setSettleForm({ ...settleForm, months_to_pay: e.target.value })}
                            className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Payment date</label>
                          <input type="date" value={settleForm.payment_date}
                            onChange={(e) => setSettleForm({ ...settleForm, payment_date: e.target.value })}
                            className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Method</label>
                          <select value={settleForm.payment_method}
                            onChange={(e) => setSettleForm({ ...settleForm, payment_method: e.target.value })}
                            className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-white outline-none focus:border-indigo-500"
                          >
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="online">Online</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <button type="submit" disabled={unpaidMonths.length === 0}
                          className="h-10 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
                        >
                          Settle
                        </button>
                      </form>
                    </div>

                    {/* Violations */}
                    {selectedMember.violations?.length > 0 && (
                      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
                        <h3 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
                          <IconWarning className="w-4 h-4" />Violation History
                        </h3>
                        <div className="space-y-2">
                          {selectedMember.violations.map((v) => (
                            <div key={v.violation_id} className="flex items-center justify-between text-xs border-b border-amber-500/10 pb-2 last:border-0 last:pb-0">
                              <span className="text-amber-200 font-medium">{v.overdue_days} overdue days</span>
                              <span className="text-slate-400">Recorded {formatDate(v.recorded_date)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── PLANS TAB ── */}
                {detailTab === 'plans' && (
                  <div className="space-y-3">
                    {selectedMember.subscriptions?.length === 0 && (
                      <div className="text-center py-10 text-slate-600 text-sm">No subscriptions yet.</div>
                    )}
                    {selectedMember.subscriptions?.map((sub) => {
                      const subMonths = selectedMember.membershipMonths?.filter((m) => m.subscription_id === sub.subscription_id) || [];
                      const paidCount = subMonths.filter((m) => m.paid_status === 'paid').length;
                      const unpaidCount = subMonths.filter((m) => m.paid_status === 'unpaid').length;
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
                                  m.paid_status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' :
                                  m.paid_status === 'refunded' ? 'bg-slate-500/10 border-slate-500/25 text-slate-400' :
                                  'bg-red-500/10 border-red-500/25 text-red-300'
                                }`}>
                                  {m.month_reference} {m.paid_status === 'paid' ? '✓' : m.paid_status === 'refunded' ? '↩' : '○'}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                            <span className="text-emerald-400">{paidCount} paid</span>
                            {unpaidCount > 0 && <span className="text-red-400">{unpaidCount} unpaid</span>}
                            {isActive && <span className="ml-auto text-emerald-300 font-medium">Active</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── PAYMENTS TAB ── */}
                {detailTab === 'payments' && (
                  <div className="space-y-2">
                    {selectedMember.payments?.length === 0 && (
                      <div className="text-center py-10 text-slate-600 text-sm">No payments recorded.</div>
                    )}
                    {selectedMember.payments?.map((payment, idx) => (
                      <div key={payment.payment_id || idx} className="flex items-center justify-between gap-3 border border-[var(--border)] bg-[var(--bg-secondary)] rounded-lg px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{formatPKR(payment.amount)}</p>
                          <p className="text-xs text-slate-500">{formatDate(payment.payment_date)}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                            payment.payment_method === 'cash' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' :
                            payment.payment_method === 'bank_transfer' ? 'bg-sky-500/10 border-sky-500/25 text-sky-300' :
                            payment.payment_method === 'online' ? 'bg-violet-500/10 border-violet-500/25 text-violet-300' :
                            'bg-slate-500/10 border-slate-500/25 text-slate-300'
                          }`}>
                            {payment.payment_method?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                    {/* Total */}
                    {selectedMember.payments?.length > 0 && (
                      <div className="flex items-center justify-between border border-[var(--border)] rounded-lg px-4 py-3 mt-2 bg-indigo-500/5">
                        <span className="text-xs text-slate-400">Total paid</span>
                        <span className="text-sm font-bold text-white">
                          {formatPKR(selectedMember.payments.reduce((s, p) => s + Number(p.amount), 0))}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{editingMember ? 'Edit Member' : 'Add New Member'}</h2>
              <button onClick={resetForm} className="text-slate-500 hover:text-slate-300">
                <IconX className="w-4 h-4" />
              </button>
            </div>
            {formError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 mb-4 text-sm">{formError}</div>
            )}
            {returningMember && (
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-indigo-300">Returning member detected</p>
                <p className="text-xs text-slate-300 mt-1">
                  {returningMember.member_id} - {returningMember.name}
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                  required
                  disabled={!!returningMember}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  onBlur={handlePhoneBlur}
                  className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                  placeholder="03001234567"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Join Date</label>
                <input
                  type="date"
                  value={formData.join_date}
                  onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                  className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-500 text-sm">
                  {editingMember ? 'Update' : returningMember ? 'Start Membership' : 'Add Member'}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 border border-[#2d3148] rounded-lg text-slate-300 hover:bg-[#262a3a] text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubForm && subFormMember && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-white mb-2">Assign Membership Plan</h2>
            <p className="text-xs text-slate-400 mb-4">
              {subFormMember.name} ({subFormMember.member_id})
            </p>
            <p className="text-[11px] text-slate-500 mb-4">
              You can start membership now and collect payment later. Unpaid months are tracked and can be settled anytime.
            </p>
            <form onSubmit={handleAddSubscription} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Plan</label>
                <select
                  value={subForm.plan_id}
                  onChange={(e) => {
                    const plan = plans.find((p) => p.plan_id === e.target.value);
                    setSubForm({
                      ...subForm,
                      plan_id: e.target.value,
                      price_paid: plan?.default_price_pkr || '',
                      months_paid_now: String(plan?.duration_months || ''),
                    });
                  }}
                  className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                  required
                >
                  <option value="">Select a plan</option>
                  {plans.map((p) => (
                    <option key={p.plan_id} value={p.plan_id}>
                      {p.plan_name} - {p.plan_class} ({p.duration_months}mo) - {formatPKR(p.default_price_pkr)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={subForm.start_date}
                  onChange={(e) => setSubForm({ ...subForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Price (PKR)</label>
                <input
                  type="number"
                  value={subForm.price_paid}
                  onChange={(e) => setSubForm({ ...subForm, price_paid: e.target.value })}
                  className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Months paid now</label>
                <input
                  type="number"
                  min={0}
                  max={Math.max(1, plans.find((p) => p.plan_id === subForm.plan_id)?.duration_months || 1)}
                  value={subForm.months_paid_now}
                  onChange={(e) => setSubForm({ ...subForm, months_paid_now: e.target.value })}
                  className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                  placeholder="0 for no payment today"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={subForm.payment_date}
                    onChange={(e) => setSubForm({ ...subForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={subForm.payment_method}
                    onChange={(e) => setSubForm({ ...subForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="online">Online</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-500 text-sm">
                  Assign Plan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubForm(false);
                    setSubFormMember(null);
                    setSubForm({
                      plan_id: '',
                      start_date: today(),
                      price_paid: '',
                      months_paid_now: '',
                      payment_date: today(),
                      payment_method: 'cash',
                    });
                  }}
                  className="px-4 py-2 border border-[#2d3148] rounded-lg text-slate-300 hover:bg-[#262a3a] text-sm"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBarcode && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200">Member Card</h3>
              <button onClick={() => setShowBarcode(null)} className="text-slate-500 hover:text-slate-300">
                <IconX className="w-4 h-4" />
              </button>
            </div>
            <BarcodeCard member={showBarcode} />
          </div>
        </div>
      )}
    </div>
  );
}

function MiniCard({ icon: Icon, label, value, tone = 'default' }) {
  const tones = {
    default: 'border-[var(--border)] bg-[var(--bg-secondary)]',
    amber: 'border-amber-500/20 bg-amber-500/5',
    red: 'border-red-500/20 bg-red-500/5',
  };
  const iconTones = {
    default: 'text-indigo-300',
    amber: 'text-amber-300',
    red: 'text-red-300',
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500">{label}</span>
        <Icon className={`w-4 h-4 ${iconTones[tone]}`} />
      </div>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}
