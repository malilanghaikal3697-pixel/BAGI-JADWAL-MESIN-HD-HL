import React, { useState } from 'react';
import { useHemo } from '../context/HemoContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ThemeSelectorModal } from './ThemeSelectorModal';
import { AuthModal } from './AuthModal';
import {
  Activity,
  ShieldCheck,
  Database,
  Palette,
  Moon,
  Sun,
  User,
  Cloud,
  CheckCircle2,
  Lock,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  onNavigateToAccount?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateToAccount }) => {
  const { settings, nurses, machines, isCloudConnected } = useHemo();
  const { currentThemeConfig, isDark } = useTheme();
  const { userProfile, isAuthenticated, role, logout } = useAuth();
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleAccountClick = () => {
    if (onNavigateToAccount) {
      onNavigateToAccount();
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const activeNurses = nurses.filter((n) => n.isActive).length;
  const activeMachines = machines.filter((m) => m.status === 'AKTIF').length;

  return (
    <>
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 shadow-soft transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          {/* Logo & Hospital Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr ${currentThemeConfig.primaryGradient} flex items-center justify-center text-white shadow-soft-md ring-1 ring-white/30 dark:ring-white/10 shrink-0 transform hover:scale-105 transition-transform`}
            >
              <Activity className="w-5 h-5 drop-shadow-xs" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
                  HemoShift HD
                </h1>
                <span className="text-[9px] sm:text-[10px] font-bold tracking-wider bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full border border-sky-200/80 dark:border-sky-800/80 hidden xs:inline-block shadow-2xs">
                  25 MESIN • 17 PERAWAT
                </span>
                {isCloudConnected && (
                  <span
                    className="inline-flex items-center gap-1.5 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs"
                    title="Database Cloud Firestore terhubung secara real-time"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    Live Sync
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[170px] sm:max-w-xs md:max-w-md mt-0.5">
                {settings.hospitalName} &bull; <span className="text-slate-700 dark:text-slate-300 font-semibold">{settings.roomName}</span>
              </p>
            </div>
          </div>

          {/* Action Bar (Stats, Theme Selector, Auth Profile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{activeNurses} Perawat Aktif</span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold shadow-2xs">
              <Database className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{activeMachines}/{machines.length} Mesin HD</span>
            </div>

            {/* Theme Switcher Button */}
            <button
              onClick={() => setIsThemeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/90 dark:hover:bg-slate-700/90 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 font-bold transition-all shadow-2xs min-h-[38px] active:scale-95"
              title="Ganti Tema & Warna Tampilan"
            >
              <Palette className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span className="hidden md:inline">Tema</span>
              {isDark ? (
                <Moon className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              )}
            </button>

            {/* User Account / Profile & Logout Button */}
            {isAuthenticated && userProfile ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleAccountClick}
                  className={`inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border font-bold transition-all shadow-2xs min-h-[38px] active:scale-95 ${
                    role === 'admin'
                      ? 'bg-purple-50/90 dark:bg-purple-950/70 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 hover:bg-purple-100/90'
                      : role === 'karu'
                      ? 'bg-amber-50/90 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100/90'
                      : 'bg-sky-50/90 dark:bg-sky-950/70 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 hover:bg-sky-100/90'
                  }`}
                  title={`Akun: ${userProfile.displayName} (${
                    role === 'admin' ? 'Administrator Sistem' : role === 'karu' ? 'Kepala Ruangan' : 'Perawat Pelaksana'
                  }). Klik untuk membuka pengaturan akun.`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg text-white flex items-center justify-center text-xs font-black shadow-2xs ${
                      role === 'admin'
                        ? 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                        : role === 'karu'
                        ? 'bg-gradient-to-tr from-amber-500 to-orange-600'
                        : 'bg-gradient-to-tr from-sky-600 to-blue-600'
                    }`}
                  >
                    {userProfile.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block max-w-[90px] md:max-w-[130px] truncate leading-tight">
                    <span className="block text-[11px] font-bold truncate">
                      {userProfile.displayName.split(',')[0]}
                    </span>
                    <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      {role === 'admin' ? 'Admin IT' : role === 'karu' ? 'Karu HD' : 'Perawat'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={logout}
                  className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/60 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/60 transition-colors min-h-[38px] min-w-[38px]"
                  title="Keluar dari Sistem (Logout)"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-extrabold transition-all shadow-soft-md min-h-[38px] active:scale-95"
                title="Masuk atau Daftar Akun untuk Kelola Jadwal"
              >
                <User className="w-3.5 h-3.5" />
                <span>Masuk / Daftar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
};
