import { getStoredToken } from './auth';
import { SchedulePayload, ScheduledEmail } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  devLogin: (email?: string, name?: string) =>
    request<{ token: string; user: any }>('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    }),

  verifyGoogle: (payload: any) =>
    request<{ token: string; user: any }>('/auth/google/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<any>('/auth/me'),

  // Emails
  scheduleEmail: (payload: SchedulePayload) =>
    request<{ message: string; count: number }>('/emails/schedule', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getEmails: (status?: string) =>
    request<{ count: number; data: ScheduledEmail[] }>(`/emails${status ? `?status=${status}` : ''}`),

  searchEmails: (params: { q?: string; subject?: string; recipient?: string; status?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ source: string; data: ScheduledEmail[] }>(`/emails/search?${query}`);
  },

  cancelEmail: (id: string) =>
    request<{ message: string; id: string }>(`/emails/${id}`, {
      method: 'DELETE',
    }),

  // Slack
  connectSlackWebhook: (webhookUrl: string, teamName?: string) =>
    request<{ message: string; slackConnected: boolean; slackTeamName?: string }>('/slack/webhook', {
      method: 'POST',
      body: JSON.stringify({ webhookUrl, teamName }),
    }),

  disconnectSlack: () =>
    request<{ message: string; slackConnected: boolean }>('/slack/disconnect', {
      method: 'DELETE',
    }),
};
