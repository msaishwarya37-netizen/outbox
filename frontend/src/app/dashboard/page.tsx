'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { ComposeModal } from '../../components/ComposeModal';
import { ScheduledEmailsTable } from '../../components/ScheduledEmailsTable';
import { SentEmailsTable } from '../../components/SentEmailsTable';
import { SearchSection } from '../../components/SearchSection';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { getStoredUser, clearStoredAuth, getStoredToken } from '../../lib/auth';
import { User, ScheduledEmail } from '../../types';
import toast from 'react-hot-toast';
import { PlusCircle, Calendar, Send, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');

  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<ScheduledEmail[]>([]);
  const [searchResults, setSearchResults] = useState<ScheduledEmail[] | null>(null);

  const [isLoadingScheduled, setIsLoadingScheduled] = useState(true);
  const [isLoadingSent, setIsLoadingSent] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const fetchUserData = useCallback(async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch {
      const stored = getStoredUser();
      if (stored) setUser(stored);
    }
  }, []);

  const fetchScheduledEmails = useCallback(async () => {
    setIsLoadingScheduled(true);
    try {
      const res = await api.getEmails('PENDING');
      setScheduledEmails(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch scheduled emails');
    } finally {
      setIsLoadingScheduled(false);
    }
  }, []);

  const fetchSentEmails = useCallback(async () => {
    setIsLoadingSent(true);
    try {
      const res = await api.getEmails();
      // Filter non-pending
      const done = res.data.filter((e) => e.status === 'SENT' || e.status === 'FAILED');
      setSentEmails(done);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch sent emails');
    } finally {
      setIsLoadingSent(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchScheduledEmails();
    fetchSentEmails();
    fetchUserData();
  }, [fetchScheduledEmails, fetchSentEmails, fetchUserData]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    refreshAll();

    // Auto refresh every 10 seconds for live updates
    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
  }, [router, refreshAll]);

  const handleLogout = () => {
    clearStoredAuth();
    toast.success('Logged out successfully');
    router.replace('/login');
  };

  const handleCancelScheduledEmail = async (id: string) => {
    try {
      await api.cancelEmail(id);
      toast.success('Scheduled job cancelled');
      refreshAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel email');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <Header user={user} onLogout={handleLogout} onRefreshUser={fetchUserData} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Dashboard Title & Compose Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Email Campaign Dashboard</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage delay-queued bulk emails, view live worker delivery logs, and search indexed campaigns.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={refreshAll} title="Refresh tables">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="md" onClick={() => setIsComposeOpen(true)} className="shadow-md hover:shadow-lg">
              <PlusCircle className="w-4.5 h-4.5 mr-2" /> Compose New Email Campaign
            </Button>
          </div>
        </div>

        {/* Elasticsearch Search Section */}
        <SearchSection
          onSearchResults={(results) => setSearchResults(results)}
          onClearSearch={() => setSearchResults(null)}
        />

        {/* Search Results Display Mode or Standard Tabs */}
        {searchResults !== null ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                Search Results ({searchResults.length})
              </h3>
              <Button size="sm" variant="secondary" onClick={() => setSearchResults(null)}>
                Clear Search Results
              </Button>
            </div>
            <SentEmailsTable emails={searchResults} isLoading={false} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tabs Bar */}
            <div className="flex items-center gap-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`pb-3 px-4 text-xs font-bold transition-colors relative flex items-center gap-2 ${
                  activeTab === 'scheduled' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Scheduled Emails ({scheduledEmails.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('sent')}
                className={`pb-3 px-4 text-xs font-bold transition-colors relative flex items-center gap-2 ${
                  activeTab === 'sent' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Sent / Delivered Emails ({sentEmails.length})</span>
              </button>
            </div>

            {/* Active Tab Content */}
            {activeTab === 'scheduled' ? (
              <ScheduledEmailsTable
                emails={scheduledEmails}
                isLoading={isLoadingScheduled}
                onCancel={handleCancelScheduledEmail}
              />
            ) : (
              <SentEmailsTable emails={sentEmails} isLoading={isLoadingSent} />
            )}
          </div>
        )}
      </main>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={refreshAll}
        slackConnected={user?.slackConnected || false}
      />
    </div>
  );
}
