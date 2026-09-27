import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Email Job Scheduler',
  description: 'Production-grade Email Job Scheduler powered by BullMQ, Redis, Ethereal SMTP & Elasticsearch',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        {children}
      </body>
    </html>
  );
}
