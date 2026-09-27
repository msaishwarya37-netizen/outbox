import React from 'react';
import { ScheduledEmail } from '../types';
import { Button } from './ui/Button';
import { Clock, Calendar, Mail, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

interface ScheduledEmailsTableProps {
  emails: ScheduledEmail[];
  isLoading: boolean;
  onCancel: (id: string) => void;
}

export const ScheduledEmailsTable: React.FC<ScheduledEmailsTableProps> = ({ emails, isLoading, onCancel }) => {
  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4 mx-auto mb-4"></div>
        <div className="space-y-3">
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3 border border-sky-100">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No Pending Scheduled Emails</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          Click "Compose New Email" above to queue up a new email or bulk lead campaign.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <th className="px-6 py-3.5">Recipient</th>
              <th className="px-6 py-3.5">Subject</th>
              <th className="px-6 py-3.5">Sender</th>
              <th className="px-6 py-3.5">Scheduled Time</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            {emails.map((email) => (
              <tr key={email.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">{email.recipient}</span>
                  </div>
                </td>
                <td className="px-6 py-4 max-w-xs truncate">{email.subject}</td>
                <td className="px-6 py-4 text-slate-500">{email.sender}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    <span>{new Date(email.scheduledTime).toLocaleString()}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-3 h-3" /> PENDING
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCancel(email.id)}
                    className="text-rose-600 hover:bg-rose-50 border-rose-200"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Cancel
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
