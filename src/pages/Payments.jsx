import { useEffect, useState, useMemo } from 'react';
import { usePayments } from '../hooks/usePayments';
import MemberSearch from '../components/MemberSearch';
import { formatPKR, formatDate, today } from '../utils/helpers';
import { IconCurrency, IconPlus, IconCalendar } from '../components/Icons';

const METHOD_STYLES = {
  cash: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
  bank_transfer: 'bg-sky-500/10 border-sky-500/25 text-sky-300',
  online: 'bg-violet-500/10 border-violet-500/25 text-violet-300',
  other: 'bg-slate-500/10 border-slate-500/25 text-slate-300',
};

export default function Payments() {
  const { payments, loading, fetchPayments, addPayment } = usePayments();
  const [showForm, setShowForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [monthFilter, setMonthFilter] = useState(''); // 'YYYY-MM' or ''
  const [formData, setFormData] = useState({
    amount: '',
    payment_date: today(),
    payment_method: 'cash',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchPayments();
    // default filter to current month
    setMonthFilter(today().slice(0, 7));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!selectedMember) {
      setFormError('Please select a member');
      return;
    }
    try {
      await addPayment({
        member_id: selectedMember.member_id,
        ...formData,
        amount: Number(formData.amount),
      });
      setShowForm(false);
      setSelectedMember(null);
      setFormData({ amount: '', payment_date: today(), payment_method: 'cash' });
      fetchPayments();
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Build available months from payments for the filter dropdown
  const availableMonths = useMemo(() => {
    const months = new Set(payments.map((p) => p.payment_date?.slice(0, 7)).filter(Boolean));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [payments]);

  const filtered = useMemo(() => {
    if (!monthFilter) return payments;
    return payments.filter((p) => p.payment_date?.startsWith(monthFilter));
  }, [payments, monthFilter]);

  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);
  const filteredRevenue = filtered.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <IconCurrency className="w-5 h-5 text-indigo-400" />Payments
          </h1>
          <p className="text-xs text-slate-500">All recorded payments across members.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <IconPlus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs text-slate-400 mb-1">All Time Revenue</p>
          <p className="text-lg font-bold text-white">{formatPKR(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <p className="text-xs text-slate-400 mb-1">{monthFilter ? `${monthFilter} Revenue` : 'Filtered Revenue'}</p>
          <p className="text-lg font-bold text-white">{formatPKR(filteredRevenue)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-xs text-slate-400 mb-1">Total Records</p>
          <p className="text-lg font-bold text-white">{payments.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-xs text-slate-400 mb-1">Filtered Records</p>
          <p className="text-lg font-bold text-white">{filtered.length}</p>
        </div>
      </div>

      {/* Month filter */}
      <div className="flex items-center gap-3">
        <IconCalendar className="w-4 h-4 text-slate-500 shrink-0" />
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border)] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
        >
          <option value="">All months</option>
          {availableMonths.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {monthFilter && (
          <button onClick={() => setMonthFilter('')} className="text-xs text-slate-400 hover:text-slate-200 transition">
            Clear
          </button>
        )}
      </div>

      {/* Payments table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--bg-secondary)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Member</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((payment) => (
                <tr key={payment.payment_id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{payment.members?.name || payment.member_id}</p>
                    <p className="text-xs text-slate-500">{payment.member_id}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-emerald-300">{formatPKR(payment.amount)}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{formatDate(payment.payment_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${METHOD_STYLES[payment.payment_method] || METHOD_STYLES.other}`}>
                      {payment.payment_method?.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              {monthFilter ? `No payments in ${monthFilter}.` : 'No payments recorded yet.'}
            </div>
          )}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">Record Payment</h2>
            {formError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 mb-4 text-sm">{formError}</div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">Member</label>
              <MemberSearch
                onSelect={(member) => setSelectedMember(member)}
                placeholder="Search member..."
              />
              {selectedMember && (
                <div className="mt-2 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm">
                  <span className="font-medium text-white">{selectedMember.name}</span>
                  <span className="text-slate-400 ml-2">({selectedMember.member_id})</span>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-white outline-none focus:border-indigo-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="online">Online</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-medium transition text-sm">
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setSelectedMember(null); }}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg text-slate-300 hover:bg-white/5 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
