import { useEffect, useState } from 'react';
import { useMembers } from '../hooks/useMembers';
import MemberSearch from '../components/MemberSearch';
import MemberDetailPanel from '../components/MemberDetailPanel';
import { isValidPakistaniPhone } from '../utils/phone';
import { today } from '../utils/helpers';
import { useToast } from '../contexts/ToastContext';
import {
  IconPlus, IconUsers, IconX,
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

  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [returningMember, setReturningMember] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    status: 'active',
    join_date: today(),
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

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
        setSelectedMember(returningMember);
        resetForm();
        return;
      } else {
        const newMember = await addMember(formData);
        toast.success(`Member ${formData.name} added`);
        setSelectedMember(newMember);
      }
      resetForm();
      fetchMembers();
    } catch (err) {
      setFormError(err.message || 'Error saving member');
    }
  };

  const loadMemberDetails = async (member) => {
    setSelectedMember(member);
  };

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
            <MemberSearch onSelect={(m) => loadMemberDetails(m)} />
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
                      onClick={() => loadMemberDetails(member)}
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
        <div className="xl:col-span-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl min-h-[500px]">
          {!selectedMember ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3 p-10">
              <IconUsers className="w-12 h-12" />
              <p className="text-sm">Select a member to view their profile.</p>
            </div>
          ) : (
            <MemberDetailPanel
              memberId={selectedMember.member_id}
              onMemberUpdated={() => { fetchMembers(); loadMemberDetails(selectedMember); }}
            />
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
              {editingMember && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                  <div className="flex gap-2">
                    {['active', 'inactive', 'suspended'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: s })}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition capitalize ${
                          formData.status === s
                            ? s === 'active' ? 'bg-emerald-600 border-emerald-500 text-white'
                              : s === 'inactive' ? 'bg-slate-600 border-slate-500 text-white'
                              : 'bg-red-600 border-red-500 text-white'
                            : 'bg-transparent border-[#2d3148] text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

    </div>
  );
}
