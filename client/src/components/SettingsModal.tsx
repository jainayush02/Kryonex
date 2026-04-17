import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(window.deferredPrompt || null);

  useEffect(() => {
    // Catch it if it was assigned on window right before mount
    if (window.deferredPrompt && !deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 dark:bg-obsidian/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full max-w-lg bg-white/80 dark:bg-obsidian/80 backdrop-blur-2xl border border-slate-200 dark:border-graphite rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-graphite/50 flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-graphite dark:text-white">Settings & Info</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-graphite dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* About Section */}
              <section>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 sm:mb-4">About the Platform</h3>
                <div className="p-3 sm:p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-graphite/50 space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  <p>
                    This is a sophisticated, minimalist portfolio and project management dashboard designed by Ayush Jain.
                  </p>
                  <p>
                    It features a futuristic Glassmorphism UI, adaptive layouts, and simulated AI capabilities like natural language search and micro-demos.
                  </p>
                </div>
              </section>

              {/* App Install Section */}
              {deferredPrompt && (
                <section>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 sm:mb-4">App</h3>
                  <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-graphite/50">
                    <div>
                      <div className="text-sm sm:text-base font-medium text-graphite dark:text-white">Install App</div>
                      <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Install as a Progressive Web App</div>
                    </div>
                    <Button onClick={handleInstallClick} size="sm" className="gap-2 text-xs sm:text-sm">
                      <Download size={16} /> Install
                    </Button>
                  </div>
                </section>
              )}

              {/* Appearance Section */}
              <section>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 sm:mb-4">Appearance</h3>
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-graphite/50">
                  <div>
                    <div className="text-sm sm:text-base font-medium text-graphite dark:text-white">Theme Preference</div>
                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Toggle between light and dark mode</div>
                  </div>
                  <ThemeToggle />
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
