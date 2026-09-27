import React from 'react';
import { ScheduledEmail } from '../types';
import { CheckCircle2, XCircle, Mail, Clock, AlertCircle } from 'lucide-react';

interface SentEmailsTableProps {
  emails: ScheduledEmail[];
  isLoading: boolean;
}

export const SentEmailsTable: React.FC<SentEmailsTableProps> = ({ emails, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4 mx-auto mb-4"></div>
        <div className="space-y-3">
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No Sent Emails Yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          Once your scheduled jobs reach their delivery time, they will appear here with delivery details.
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
              <th className="px-6 py-3.5">Sent / Processed Time</th>
              <th className="px-6 py-3.5">Delivery Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            {emails.map((email) => {
              const isSent = email.status === 'SENT';
              return (
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
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{email.sentAt ? new Date(email.sentAt).toLocaleString() : 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {isSent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> SENT
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                        title={email.errorMessage}
                      >
                        <XCircle className="w-3.5 h-3.5" /> FAILED
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
