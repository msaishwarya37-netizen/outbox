import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { Upload, Users, Clock, ShieldAlert, Sparkles } from 'lucide-react';
import Papa from 'papaparse';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  slackConnected: boolean;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess, slackConnected }) => {
  const [sender, setSender] = useState('sales@mycompany.com');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [rawEmailsInput, setRawEmailsInput] = useState('');
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [scheduledTime, setScheduledTime] = useState(() => {
    const d = new Date(Date.now() + 2 * 60 * 1000); // Default to +2 mins
    return d.toISOString().slice(0, 16);
  });
  const [minDelayMs, setMinDelayMs] = useState(500);
  const [maxPerHour, setMaxPerHour] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client-side regex to extract lead emails
  const extractEmails = (text: string): string[] => {
    const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(regex) || [];
    return Array.from(new Set(matches.map((e) => e.toLowerCase())));
  };

  const handleRawTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawEmailsInput(text);
    const extracted = extractEmails(text);
    setParsedEmails(extracted);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        complete: (results) => {
          const flatText = JSON.stringify(results.data);
          const extracted = extractEmails(flatText);
          setParsedEmails(extracted);
          setRawEmailsInput(extracted.join(', '));
          toast.success(`Parsed ${extracted.length} lead emails from CSV!`);
        },
        error: () => toast.error('Error parsing CSV file'),
      });
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const extracted = extractEmails(text);
        setParsedEmails(extracted);
        setRawEmailsInput(extracted.join(', '));
        toast.success(`Parsed ${extracted.length} lead emails from text file!`);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedEmails.length === 0) {
      toast.error('Please enter or upload at least one valid lead recipient email');
      return;
    }

    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and Body are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.scheduleEmail({
        recipients: parsedEmails,
        subject,
        body,
        sender,
        scheduledTime: new Date(scheduledTime).toISOString(),
        customMaxPerSender: maxPerHour,
      });

      toast.success(res.message || `Successfully scheduled ${parsedEmails.length} email(s)!`);
      onSuccess();
      onClose();
      // Reset form
      setSubject('');
      setBody('');
      setRawEmailsInput('');
      setParsedEmails([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule emails');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose & Schedule Batch Email Campaign">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sender Email */}
        <Input
          label="Sender Email"
          type="email"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
          placeholder="e.g. sales@company.com"
          required
        />

        {/* Lead Email Upload / CSV Parser */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">Lead Recipients (CSV/Text Upload or Paste)</label>
            {parsedEmails.length > 0 && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {parsedEmails.length.toLocaleString()} Lead(s) Detected
              </span>
            )}
          </div>

          <textarea
            rows={3}
            value={rawEmailsInput}
            onChange={handleRawTextChange}
            placeholder="Paste lead emails separated by commas or lines, or upload a CSV file below..."
            className="w-full text-xs p-3 border rounded-xl border-slate-300 focus:ring-sky-500 focus:border-sky-500 font-mono"
          />

          <div className="flex items-center justify-between gap-2 mt-1">
            <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-sky-700 font-medium hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Lead CSV / TXT</span>
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
            </label>

            <span className="text-[11px] text-slate-500">Supports 1,000+ lead emails in bulk</span>
          </div>
        </div>

        {/* Subject */}
        <Input
          label="Email Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Special invitation to join our partnership program"
          required
        />

        {/* Body */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700">Email Body Content</label>
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email body message here..."
            className="w-full text-xs p-3 border rounded-xl border-slate-300 focus:ring-sky-500 focus:border-sky-500"
            required
          />
        </div>

        {/* Scheduling & Rate Limits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-sky-600" /> Start Time
            </label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" /> Min Send Delay (ms)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={minDelayMs}
              onChange={(e) => setMinDelayMs(Number(e.target.value))}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-sky-600" /> Hourly Sender Limit
            </label>
            <input
              type="number"
              min="1"
              value={maxPerHour}
              onChange={(e) => setMaxPerHour(Number(e.target.value))}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
        </div>

        {/* Slack Connection Reminder Banner */}
        {!slackConnected && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
            <span>💡 Connect Slack to receive notifications when rate limits are hit.</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Schedule Batch Job ({parsedEmails.length || 0})
          </Button>
        </div>
      </form>
    </Modal>
  );
};
