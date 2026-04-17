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
import { supabase } from './lib/supabase';
import logo from './logo.png';

export default function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key
      const vapidResponse = await fetch(`${API_URL}/push/vapid-public-key`);
      const { public_key } = await vapidResponse.json();
      
      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: public_key
      });
      
      // Send to backend
      await fetch(`${API_URL}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
    } catch (err) {
      console.error('Push registration failed:', err);
    }
  };

  // PWA Update Awareness
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // 1 hour
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast('Update Available', {
        id: 'pwa-update',
        description: 'A new version of Kryonex is ready. Refresh to see the latest changes.',
        action: {
          label: 'Update Now',
          onClick: () => {
            setNeedRefresh(false);
            updateServiceWorker(true);
          },
        },
        onDismiss: () => setNeedRefresh(false),
        duration: Infinity,
        icon: <RefreshCw className="animate-spin text-graphite dark:text-white" size={16} />,
      });
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  useEffect(() => {
    // Theme initialization
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme !== 'light') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Push SW is now integrated via workbox importScripts in vite.config.ts

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Push notification prompt
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        toast('Stay Updated', {
          id: 'push-notify',
          description: 'Enable push notifications for Kryonex updates and alerts.',
          action: {
            label: 'Enable',
            onClick: () => {
              Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                  new Notification('Kryonex Notifications', { body: 'You will now receive system updates!' });
                  subscribeToPush();
                }
              });
            }
          },
          duration: 10000,
        });
      }, 2000);
    }

    // Realtime Project Notifications
    const channel = supabase
      .channel('projects-tracker')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projects_v2' },
        (payload: any) => {
          if (payload.new && payload.new.title) {
            if (Notification.permission === 'granted') {
              new Notification('New Project Published!', {
                body: `${payload.new.title} by ${payload.new.authorName || 'Anonymous'}`,
                icon: logo,
              });
            } else {
              toast('New Project!', {
                description: `${payload.new.title} is now available in the Studio.`,
                icon: <RefreshCw size={16} />
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      supabase.removeChannel(channel);
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

