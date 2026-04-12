/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import LoginPage from './pages/LoginPage';
import UserPortal from './pages/UserPortal';
import AdminPortal from './pages/AdminPortal';
import { ScrollProgress } from './components/ScrollProgress';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { AuthGuard } from './components/AuthGuard';

export default function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // PWA Update Awareness
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast('Update Available', {
        description: 'A new version of Kryonex is ready. Refresh to see the latest changes.',
        action: {
          label: 'Update Now',
          onClick: () => updateServiceWorker(true),
        },
        duration: Infinity,
        icon: <RefreshCw className="animate-spin text-graphite dark:text-white" size={16} />,
      });
    }
  }, [needRefresh, updateServiceWorker]);

  useEffect(() => {
    // Theme initialization
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme !== 'light') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="min-h-screen bg-pearl dark:bg-obsidian flex flex-col items-center justify-center p-6 text-center transition-colors duration-300">
        <div className="w-16 h-16 bg-graphite dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-obsidian font-bold shadow-lg shadow-graphite/20 dark:shadow-white/10 mb-8">
          <WifiOff size={32} />
        </div>
        <h1 className="text-3xl font-bold text-graphite dark:text-white mb-4">You're Offline</h1>
        <p className="text-slate-500 max-w-md">
          This application requires an internet connection to sync projects and run inferences. Please check your network settings.
        </p>
      </div>
    );
  }

  return (
    <Router>
      <ScrollProgress />
      <Toaster position="bottom-center" theme="system" />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route 
          path="/portal" 
          element={
            <AuthGuard>
              <UserPortal />
            </AuthGuard>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <AuthGuard requireAdmin>
              <AdminPortal />
            </AuthGuard>
          } 
        />
      </Routes>
    </Router>
  );
}

