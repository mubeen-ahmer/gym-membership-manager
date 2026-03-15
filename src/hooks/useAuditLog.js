import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useAuditLog() {
  const { user } = useAuth();

  const log = async (actionType, tableName, recordId, oldValues = null, newValues = null) => {
    try {
      // Only log when online
      if (!navigator.onLine) return;

      await supabase.from('audit_log').insert({
        admin_id: user?.id,
        action_type: actionType,
        table_name: tableName,
        record_id: String(recordId),
        old_values: oldValues,
        new_values: newValues,
      });
    } catch (err) {
      console.error('Audit log error:', err);
    }
  };

  return { log };
}
