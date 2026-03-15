import { useEffect, useState } from 'react';
import { useViolations } from '../hooks/useViolations';
import { useSubscriptions } from '../hooks/useSubscriptions';
import MemberSearch from '../components/MemberSearch';
import { formatDate, today, daysBetween } from '../utils/helpers';
import { IconWarning, IconPlus } from '../components/Icons';

export default function Violations() {
  const { violations, loading, fetchViolations, addViolation } = useViolations();
  const { getLatestSubscription } = useSubscriptions();
  const [showForm, setShowForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [latestSub, setLatestSub] = useState(null);
  const [overdueDays, setOverdueDays] = useState(0);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchViolations();
  }, []);

  const handleMemberSelect = async (member) => {
    setSelectedMember(member);
    setFormError('');
    const sub = await getLatestSubscription(member.member_id);
    setLatestSub(sub);
    if (sub && sub.end_date < today()) {
      setOverdueDays(daysBetween(sub.end_date, today()));
    } else {
      setOverdueDays(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember || !latestSub) return;
    try {
      await addViolation({
        member_id: selectedMember.member_id,
        subscription_id: latestSub.subscription_id,
        overdue_days: overdueDays,
      });
      setShowForm(false);
      setSelectedMember(null);
      setLatestSub(null);
      fetchViolations();
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white inline-flex items-center gap-2">
          <IconWarning className="w-6 h-6 text-amber-400" />
          Violations
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-500"
        >
          <IconPlus className="w-4 h-4" />
          Record Violation
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">Record Overdue Violation</h2>
            {formError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 mb-4 text-sm">{formError}</div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">Member</label>
              <MemberSearch onSelect={handleMemberSelect} />
            </div>

            {selectedMember && latestSub && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
                <p className="text-white"><strong>{selectedMember.name}</strong> ({selectedMember.member_id})</p>
                <p className="text-slate-300 mt-1">
                  Membership ended: {formatDate(latestSub.end_date)}
                </p>
                <p className="text-red-300 font-semibold mt-1">
                  Overdue days: {overdueDays}
                </p>
              </div>
            )}

            {selectedMember && !latestSub && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-300">
                No subscription found for this member.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Overdue Days</label>
                <input
                  type="number"
                  value={overdueDays}
                  onChange={(e) => setOverdueDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                  min={1}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!selectedMember || !latestSub}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Record Violation
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setSelectedMember(null); }}
                  className="px-4 py-2 border border-[#2d3148] rounded-lg text-slate-300 hover:bg-[#262a3a]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Violations table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#151826]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Member</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Overdue Days</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Subscription Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Recorded Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3148]">
              {violations.map((v) => (
                <tr key={v.violation_id} className="hover:bg-[#262a3a]/40">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{v.members?.name || v.member_id}</p>
                    <p className="text-xs text-slate-500">{v.member_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-red-300">{v.overdue_days} days</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {v.subscriptions
                      ? `${formatDate(v.subscriptions.start_date)} → ${formatDate(v.subscriptions.end_date)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{formatDate(v.recorded_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {violations.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">No violations recorded</div>
          )}
        </div>
      )}
    </div>
  );
}
