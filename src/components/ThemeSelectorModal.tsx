import React from 'react';
import { useTheme, THEME_OPTIONS, AppTheme } from '../context/ThemeContext';
import { X, Palette, Check, Sparkles, Sun, Moon } from 'lucide-react';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  const handleSelectTheme = (themeId: AppTheme) => {
    setTheme(themeId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        id="theme-selector-modal"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                Pilih Tema Tampilan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kustomisasi warna dan mode visual sesuai kenyamanan kerja Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Options Grid */}
        <div className="p-6 overflow-y-auto space-y-3 text-sm">
          {THEME_OPTIONS.map((opt) => {
            const isSelected = theme === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => handleSelectTheme(opt.id)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-4 select-none ${
                  isSelected
                    ? 'border-blue-600 dark:border-sky-500 bg-blue-50/40 dark:bg-slate-800/80 shadow-md ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Theme Color Preview Swatch */}
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${opt.bgPreview} shadow-md flex items-center justify-center text-white shrink-0`}
                  >
                    {opt.isDark ? (
                      <Moon className="w-5 h-5 text-amber-300" />
                    ) : (
                      <Sun className="w-5 h-5 text-amber-100" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {opt.name}
                      </h4>
                      {opt.isDark && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                          Dark Mode
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {opt.tagline}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isSelected ? (
                    <div className="w-7 h-7 rounded-full bg-blue-600 dark:bg-sky-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Tema disimpan otomatis di browser
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-xl transition-colors shadow-xs"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
