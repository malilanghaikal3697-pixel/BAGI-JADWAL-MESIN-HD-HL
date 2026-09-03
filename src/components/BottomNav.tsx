import React from 'react';
import { CalendarDays, CalendarRange, HeartPulse, Users, FileSpreadsheet, UserCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export type TabKey = 'daily' | 'monthly' | 'machines' | 'nurses' | 'reports' | 'account';

interface BottomNavProps {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const { currentThemeConfig } = useTheme();
  const { canManageRoster } = useAuth();

  const allTabs = [
    { key: 'daily' as TabKey, label: 'Harian & WA', icon: CalendarDays },
    { key: 'monthly' as TabKey, label: 'Jadwal 1 Bulan', icon: CalendarRange },
    { key: 'machines' as TabKey, label: 'Mesin HD', icon: HeartPulse },
    { key: 'nurses' as TabKey, label: 'Perawat', icon: Users, adminOnly: true },
    { key: 'reports' as TabKey, label: 'Laporan & Sync', icon: FileSpreadsheet, adminOnly: true },
    { key: 'account' as TabKey, label: 'Akun Saya', icon: UserCircle },
  ];

  const visibleTabs = allTabs.filter((tab) => !tab.adminOnly || canManageRoster);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 px-2 sm:px-4 pb-2 pt-1 transition-colors safe-bottom-bar pointer-events-none"
      id="bottom-nav-bar"
    >
      <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-soft-lg px-2 py-1.5 flex items-center justify-around gap-1 transition-all">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChangeTab(tab.key)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-2xl transition-all duration-200 min-h-[46px] touch-manipulation select-none active:scale-95 ${
                isActive
                  ? 'text-sky-600 dark:text-sky-400 font-extrabold bg-sky-50 dark:bg-sky-950/60 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 transition-all duration-200 ${
                  isActive
                    ? 'scale-110 text-sky-600 dark:text-sky-400 stroke-[2.4] drop-shadow-2xs'
                    : 'text-slate-400 dark:text-slate-500 stroke-[1.8]'
                }`}
              />
              <span className="text-[10px] tracking-tight whitespace-nowrap leading-none">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1.5 h-1 rounded-full bg-sky-500 dark:bg-sky-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
