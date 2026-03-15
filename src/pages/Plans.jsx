import { useEffect, useState } from 'react';
import { usePlans } from '../hooks/usePlans';
import { formatPKR } from '../utils/helpers';
import { IconClipboard, IconPlus } from '../components/Icons';

export default function Plans() {
  const { plans, loading, fetchPlans, addPlan, updatePlan, deletePlan } = usePlans();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    plan_name: '',
    duration_months: 1,
    plan_class: 'Class 1',
    default_price_pkr: '',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editing) {
        await updatePlan(editing.plan_id, formData);
      } else {
        await addPlan(formData);
      }
      setShowForm(false);
      setEditing(null);
      setFormData({ plan_name: '', duration_months: 1, plan_class: 'Class 1', default_price_pkr: '' });
      fetchPlans();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleEdit = (plan) => {
    setEditing(plan);
    setFormData({
      plan_name: plan.plan_name,
      duration_months: plan.duration_months,
      plan_class: plan.plan_class,
      default_price_pkr: plan.default_price_pkr,
    });
    setShowForm(true);
  };

  const handleDelete = async (planId) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      await deletePlan(planId);
      fetchPlans();
    }
  };

  // Group plans by class
  const plansByClass = plans.reduce((acc, plan) => {
    if (!acc[plan.plan_class]) acc[plan.plan_class] = [];
    acc[plan.plan_class].push(plan);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white inline-flex items-center gap-2">
          <IconClipboard className="w-6 h-6 text-indigo-400" />
          Membership Plans
        </h1>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setFormData({ plan_name: '', duration_months: 1, plan_class: 'Class 1', default_price_pkr: '' }); }}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-500"
        >
          <IconPlus className="w-4 h-4" />
          Add Plan
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">{editing ? 'Edit Plan' : 'Add New Plan'}</h2>
            {formError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 mb-4 text-sm">{formError}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Plan Name</label>
                <input
                  type="text"
                  value={formData.plan_name}
                  onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                  placeholder="e.g., Monthly"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Duration (months)</label>
                <select
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                >
                  <option value={1}>1 Month</option>
                  <option value={3}>3 Months (Quarterly)</option>
                  <option value={6}>6 Months (Half-Yearly)</option>
                  <option value={12}>12 Months (Yearly)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Plan Class</label>
                <input
                  type="text"
                  value={formData.plan_class}
                  onChange={(e) => setFormData({ ...formData, plan_class: e.target.value })}
                  className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                  placeholder="e.g., Class 1, Machines Only"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Default Price (PKR)</label>
                <input
                  type="number"
                  value={formData.default_price_pkr}
                  onChange={(e) => setFormData({ ...formData, default_price_pkr: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                  placeholder="e.g., 2000"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-500">
                  {editing ? 'Update Plan' : 'Add Plan'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditing(null); }}
                  className="px-4 py-2 border border-[#2d3148] rounded-lg text-slate-300 hover:bg-[#262a3a]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plans by class */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : Object.keys(plansByClass).length === 0 ? (
          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-12 text-center text-slate-500">
            No plans configured. Add your first plan!
          </div>
        ) : (
          Object.entries(plansByClass).map(([className, classPlans]) => (
          <div key={className} className="bg-[#1e2130] border border-[#2d3148] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#151826] border-b border-[#2d3148]">
              <h3 className="text-sm font-semibold text-slate-200">{className}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
              {classPlans.map((plan) => (
                <div key={plan.plan_id} className="border border-[#2d3148] bg-[#151826] rounded-lg p-4">
                  <h4 className="font-semibold text-white">{plan.plan_name}</h4>
                  <p className="text-sm text-slate-500">{plan.duration_months} month(s)</p>
                  <p className="text-lg font-bold text-indigo-300 mt-2">{formatPKR(plan.default_price_pkr)}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleEdit(plan)} className="text-xs bg-[#262a3a] text-slate-200 px-3 py-1 rounded hover:bg-[#30354a]">Edit</button>
                    <button onClick={() => handleDelete(plan.plan_id)} className="text-xs bg-red-500/20 text-red-300 px-3 py-1 rounded hover:bg-red-500/30">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
