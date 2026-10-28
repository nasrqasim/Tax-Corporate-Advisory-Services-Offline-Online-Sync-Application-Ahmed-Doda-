import { getCurrentTaxYear, getLocalDateString, getSelectableTaxYears } from '../../services/utils/dateUtils';
import React, { useState } from 'react';
import {
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Trash2,
  X
} from 'lucide-react';
import { FollowUpReminder } from '../../types/settings';
import { Customer } from '../../types/customer';

interface FollowupsViewProps {
  followUps: FollowUpReminder[];
  customers: Customer[];
  onSaveFollowUp: (followUp: FollowUpReminder) => Promise<void>;
  onSelectCustomer: (customer: Customer) => void;
}

export const FollowupsView: React.FC<FollowupsViewProps> = ({
  followUps,
  customers,
  onSaveFollowUp,
  onSelectCustomer
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('pending');

  const [customerId, setCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [taxYear, setTaxYear] = useState(() => getCurrentTaxYear());
  const [dueDate, setDueDate] = useState(() => getLocalDateString());
  const [priority, setPriority] = useState<FollowUpReminder['priority']>('medium');
  const [notes, setNotes] = useState('');

  const filtered = followUps.filter((f) => {
    if (filterStatus === 'pending') return f.status === 'pending';
    if (filterStatus === 'completed') return f.status === 'completed';
    return true;
  });

  const handleToggleStatus = async (item: FollowUpReminder) => {
    const updated: FollowUpReminder = {
      ...item,
      status: item.status === 'completed' ? 'pending' : 'completed'
    };
    await onSaveFollowUp(updated);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !customerId) {
      alert('Please fill required fields.');
      return;
    }

    const cust = customers.find((c) => c.id === customerId);

    const newReminder: FollowUpReminder = {
      id: `FOL-${Date.now()}`,
      customerId,
      customerName: cust ? cust.fullName : customerId,
      title: title.trim(),
      taxYear: taxYear || undefined,
      dueDate,
      priority,
      status: 'pending',
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    await onSaveFollowUp(newReminder);
    setIsAddModalOpen(false);
    setTitle('');
    setNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>Follow-ups & Tax Filing Reminders</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              {filtered.length} Reminders
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Track customer document submissions, CPR collections, and FBR deadlines.
          </p>
        </div>

        <button
          onClick={() => {
            if (customers.length > 0 && !customerId) setCustomerId(customers[0].id);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Follow-up</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 text-xs">
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
            filterStatus === 'pending'
              ? 'bg-slate-800 border-amber-500 text-amber-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Pending Due Reminders
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
            filterStatus === 'completed'
              ? 'bg-slate-800 border-emerald-500 text-emerald-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-slate-800 border-blue-500 text-blue-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All
        </button>
      </div>

      {/* Reminders List */}
      <div className="space-y-2.5">
        {filtered.map((item) => {
          const cust = customers.find((c) => c.id === item.customerId);
          const isDone = item.status === 'completed';

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDone
                  ? 'bg-slate-950/40 border-slate-900 text-slate-500'
                  : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleToggleStatus(item)}
                  className={`mt-0.5 p-1 rounded-full border cursor-pointer transition ${
                    isDone
                      ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                      : 'border-slate-700 hover:border-emerald-500 text-transparent'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 fill-current" />
                </button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-xs text-white ${isDone ? 'line-through text-slate-500' : ''}`}>
                      {item.title}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                        item.priority === 'urgent'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : item.priority === 'high'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                    {cust && (
                      <button
                        onClick={() => onSelectCustomer(cust)}
                        className="text-emerald-400 hover:underline cursor-pointer font-medium"
                      >
                        Client: {cust.fullName}
                      </button>
                    )}
                    {item.taxYear && <span>Tax Year: {item.taxYear}</span>}
                    {item.notes && <span className="italic">"{item.notes}"</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="font-mono text-xs bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
                  Due: {item.dueDate}
                </span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
            No follow-ups matching this filter.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm">Add Follow-up Reminder</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.cnic})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reminder Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Collect remaining payment Rs. 3,500"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-600 text-white font-medium"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
