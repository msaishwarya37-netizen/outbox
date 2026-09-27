import React, { useState } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Search, Filter, RefreshCw, Database } from 'lucide-react';
import { api } from '../lib/api';
import { ScheduledEmail } from '../types';
import toast from 'react-hot-toast';

interface SearchSectionProps {
  onSearchResults: (results: ScheduledEmail[], source: string) => void;
  onClearSearch: () => void;
}

export const SearchSection: React.FC<SearchSectionProps> = ({ onSearchResults, onClearSearch }) => {
  const [q, setQ] = useState('');
  const [recipient, setRecipient] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeSource, setActiveSource] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsSearching(true);
    try {
      const res = await api.searchEmails({
        q: q.trim() || undefined,
        recipient: recipient.trim() || undefined,
        status: status || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });

      setActiveSource(res.source);
      onSearchResults(res.data, res.source);
      toast.success(`Found ${res.data.length} result(s) via ${res.source}`);
    } catch (err: any) {
      toast.error(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setQ('');
    setRecipient('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setActiveSource(null);
    onClearSearch();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-sky-600" />
          <h3 className="text-sm font-bold text-slate-800">Elasticsearch Email Search & Filters</h3>
        </div>
        {activeSource && (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
            <Database className="w-3 h-3" /> Indexed in {activeSource}
          </span>
        )}
      </div>

      <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Input
          placeholder="Search subject or body..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="text-xs"
        />

        <Input
          placeholder="Filter recipient email..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="text-xs"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="SENT">SENT</option>
          <option value="FAILED">FAILED</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 bg-white"
        />

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" className="w-full" isLoading={isSearching}>
            <Search className="w-3.5 h-3.5 mr-1" /> Search
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
};
