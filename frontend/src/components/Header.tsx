import React, { useState } from 'react';
import { User } from '../types';
import { Button } from './ui/Button';
import { LogOut, ExternalLink, Slack, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onRefreshUser?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onRefreshUser }) => {
  const [showSlackInput, setShowSlackInput] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectSlackDirect = async () => {
    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      toast.error('Please enter a valid Slack incoming webhook URL');
      return;
    }

    setIsConnecting(true);
    try {
      await api.connectSlackWebhook(webhookUrl, 'Connected Workspace');
      toast.success('Slack connected successfully!');
      setShowSlackInput(false);
      setWebhookUrl('');
      if (onRefreshUser) onRefreshUser();
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect Slack');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectSlack = async () => {
    try {
      await api.disconnectSlack();
      toast.success('Slack disconnected');
      if (onRefreshUser) onRefreshUser();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect Slack');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-md text-white font-black text-xl tracking-tight">
            E
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Email Scheduler</h1>
            <p className="text-xs text-slate-500 font-medium">BullMQ Engine • Ethereal SMTP</p>
          </div>
        </div>

        {/* Right Header Navigation & Actions */}
        <div className="flex items-center gap-4">
          {/* Live BullMQ Board Link */}
          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-semibold transition-colors border border-sky-200/60"
          >
            <span>Live Queue Board</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Slack Connection Badge */}
          {user?.slackConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Slack: {user.slackTeamName || 'Connected'}</span>
              <button
                onClick={handleDisconnectSlack}
                className="ml-1 text-slate-400 hover:text-rose-600 transition-colors"
                title="Disconnect Slack"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowSlackInput(!showSlackInput)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold transition-colors"
              >
                <Slack className="w-4 h-4 text-emerald-600" />
                <span>Connect Slack</span>
              </button>

              {showSlackInput && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-scaleUp">
                  <h4 className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Slack className="w-4 h-4 text-emerald-600" /> Connect Slack Incoming Webhook
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Receive instant alerts whenever an email hourly rate limit is hit.
                  </p>
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-sky-500 border-slate-300"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setShowSlackInput(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleConnectSlackDirect} isLoading={isConnecting}>
                      Save Webhook
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile Avatar & Info */}
          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <img
                src={user.avatar || 'https://lh3.googleusercontent.com/a/default-user=s96-c'}
                alt={user.name || user.email}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-sky-500/30"
              />
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user.name || 'User'}</p>
                <p className="text-[11px] text-slate-500 leading-tight">{user.email}</p>
              </div>

              <Button variant="outline" size="sm" onClick={onLogout} className="ml-1 text-slate-600">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
