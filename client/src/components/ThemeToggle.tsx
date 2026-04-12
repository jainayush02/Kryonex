import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/Button';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    // Default to dark if no preference saved
    return savedTheme ? savedTheme === 'dark' : true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isDark: boolean }>;
      setIsDark(customEvent.detail.isDark);
    };

    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { isDark: newTheme } }));
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme} className="w-10 h-10 p-0 rounded-full">
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
