import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { IconDocument } from '../components/Icons';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);

      if (filter) {
        query = query.eq('table_name', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const actionColors = {
    INSERT: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    UPDATE: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
    DELETE: 'bg-red-500/15 text-red-300 border border-red-500/30',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white inline-flex items-center gap-2">
          <IconDocument className="w-6 h-6 text-indigo-400" />
          Audit Log
        </h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 bg-[#262a3a] border border-[#2d3148] rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
        >
          <option value="">All Tables</option>
          <option value="members">Members</option>
          <option value="membership_plans">Plans</option>
          <option value="subscriptions">Subscriptions</option>
          <option value="payments">Payments</option>
        </select>
      </div>

      <p className="text-sm text-slate-500">
        Tracks all admin actions except attendance. Available only when online.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#151826]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Table</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Record ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3148]">
              {logs.map((log) => (
                <tr key={log.audit_id} className="hover:bg-[#262a3a]/40">
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(log.timestamp).toLocaleString('en-PK')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${actionColors[log.action_type] || 'bg-[#262a3a] text-slate-300 border border-[#2d3148]'}`}>
                      {log.action_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{log.table_name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400 max-w-[150px] truncate">
                    {log.record_id}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-[300px]">
                    {log.new_values && (
                      <details>
                        <summary className="cursor-pointer text-indigo-300 hover:underline">View details</summary>
                        <pre className="mt-1 p-2 bg-[#151826] border border-[#2d3148] rounded text-xs overflow-x-auto max-h-40">
                          {JSON.stringify(log.new_values, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">No audit logs found</div>
          )}
        </div>
      )}
    </div>
  );
}
