import React, { useState } from 'react';
import { useHemo } from '../context/HemoContext';
import { WhatsAppDispatcher } from '../domain/WhatsAppDispatcher';
import { X, Send, Copy, FileText, CheckCircle2, AlertTriangle, ExternalLink, Globe, Phone } from 'lucide-react';

interface HeadNurseReportModalProps {
  onClose: () => void;
}

export const HeadNurseReportModal: React.FC<HeadNurseReportModalProps> = ({ onClose }) => {
  const { settings, updateSettings, dailyAssignments, machines, selectedDate, showToast } = useHemo();
  const [headNurseName, setHeadNurseName] = useState(settings.headNurseName || 'Kepala Ruang HD');
  const [headNursePhone, setHeadNursePhone] = useState(settings.headNursePhone || '');
  const [saveToSettings, setSaveToSettings] = useState(true);
  const [copied, setCopied] = useState(false);

  const isSample = WhatsAppDispatcher.isSamplePhoneNumber(headNursePhone);
  const isValid = WhatsAppDispatcher.isValidPhoneNumber(headNursePhone);
  const isMobile = WhatsAppDispatcher.isMobileDevice();

  const reportText = WhatsAppDispatcher.generateHeadNurseDailyAllocationMessage(
    selectedDate,
    dailyAssignments,
    machines,
    settings.hospitalName,
    settings.roomName,
    headNurseName
  );

  const handleCopy = async () => {
    const ok = await WhatsAppDispatcher.copyToClipboard(reportText);
    if (ok) {
      setCopied(true);
      showToast('Laporan harian berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } else {
      showToast('Gagal menyalin laporan.', 'error');
    }
  };

  const persistSettingsIfRequested = () => {
    if (saveToSettings && (headNurseName !== settings.headNurseName || headNursePhone !== settings.headNursePhone)) {
      updateSettings({
        ...settings,
        headNurseName: headNurseName.trim(),
        headNursePhone: headNursePhone.trim(),
      });
    }
  };

  const handleSendWA = () => {
    if (!headNursePhone.trim()) {
      showToast('Masukkan nomor WhatsApp Kepala Ruangan terlebih dahulu, atau gunakan opsi "Pilih Kontak di WA".', 'info');
      return;
    }

    if (isSample) {
      const confirmSend = window.confirm(
        `Nomor "${headNursePhone}" terdeteksi sebagai nomor contoh bawaan sistem (081234567801).\n\nApakah Anda ingin tetap membuka WhatsApp dengan nomor ini, atau ingin menggantinya dulu dengan nomor asli Karu?`
      );
      if (!confirmSend) return;
    }

    persistSettingsIfRequested();
    WhatsAppDispatcher.openWhatsApp(headNursePhone.trim(), reportText);
    showToast(`Membuka WhatsApp untuk ${headNurseName}... Teks laporan disalin!`, 'success');
    onClose();
  };

  const handleSendGeneralWA = () => {
    persistSettingsIfRequested();
    WhatsAppDispatcher.openWhatsApp(null, reportText);
    showToast(`Membuka WhatsApp... Silakan pilih kontak ${headNurseName}!`, 'success');
    onClose();
  };

  const handleSendDesktopWeb = () => {
    persistSettingsIfRequested();
    WhatsAppDispatcher.openWhatsApp(headNursePhone.trim() || null, reportText, true);
    showToast('Membuka WhatsApp Web di browser baru...', 'success');
    onClose();
  };

  const manualUrl = WhatsAppDispatcher.getWhatsAppUrl(headNursePhone, reportText);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 my-8 space-y-4 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center shadow-xs border border-blue-200 dark:border-blue-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Laporan Harian ke Karu</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Urutan Alokasi Mesin
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{WhatsAppDispatcher.formatIndonesianDate(selectedDate)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
          {/* Karu Identity Inputs */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Kepala Ruang
                </label>
                <input
                  type="text"
                  value={headNurseName}
                  onChange={(e) => setHeadNurseName(e.target.value)}
                  placeholder="Contoh: Ns. Hendra Wijaya, S.Kep"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    No. WhatsApp Karu
                  </label>
                  {isSample && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Nomor Contoh
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  value={headNursePhone}
                  onChange={(e) => setHeadNursePhone(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {isSample && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60">
                Nomor di atas adalah nomor contoh bawaan sistem. Silakan ganti dengan nomor WhatsApp aktif Karu Anda agar chat langsung terbuka ke kontaknya.
              </p>
            )}

            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={saveToSettings}
                onChange={(e) => setSaveToSettings(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <span className="text-[11px] font-medium">
                Simpan nomor & nama ini secara permanen ke Pengaturan Sistem
              </span>
            </label>
          </div>

          {/* Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pratinjau Format Pesan Laporan (Urut Alokasi Mesin)
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className={copied ? 'text-emerald-600 font-bold' : ''}>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
              </button>
            </div>
            <div className="bg-[#EFEAE2] dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-300/80 dark:border-slate-800 max-h-56 overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-xs border border-blue-200/50 dark:border-blue-900/30 font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {reportText}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Primary Action: Direct WhatsApp App */}
            <button
              type="button"
              onClick={handleSendWA}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-soft-sm transition-all active:scale-98 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Kirim ke No. WA Karu</span>
            </button>

            {/* General WhatsApp: Select from Contact List */}
            <button
              type="button"
              onClick={handleSendGeneralWA}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all active:scale-98 cursor-pointer"
              title="Buka WhatsApp dan pilih kontak Karu secara manual"
            >
              <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Pilih Kontak di WA</span>
            </button>

            {/* WhatsApp Web Browser Option */}
            <button
              type="button"
              onClick={handleSendDesktopWeb}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all active:scale-98 cursor-pointer"
              title="Buka WhatsApp Web di tab browser baru (Cocok untuk Laptop/PC)"
            >
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Buka WA Web (PC)</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1">
            <span>Teks laporan otomatis disalin ke clipboard saat diklik.</span>
            <a
              href={manualUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <span>Buka link manual</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
