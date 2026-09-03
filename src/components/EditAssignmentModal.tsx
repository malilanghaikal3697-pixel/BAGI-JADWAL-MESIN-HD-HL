import React, { useState, useEffect } from 'react';
import { ShiftAssignment, ShiftType, Machine, SHIFT_TYPE_INFO, SPECIAL_DUTY_OPTIONS } from '../types';
import { X, Check, Crown, Tag, CheckCircle2, Zap, Sliders, Calendar, ArrowRight } from 'lucide-react';

interface EditAssignmentModalProps {
  assignment: ShiftAssignment | null;
  machines: Machine[];
  onClose: () => void;
  onSave: (
    assignment: ShiftAssignment,
    newShiftType: ShiftType,
    newMachines: number[],
    isLeader: boolean,
    notes: string,
    specialDuty?: string | null
  ) => void;
}

export const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({
  assignment,
  machines,
  onClose,
  onSave,
}) => {
  const [shiftType, setShiftType] = useState<ShiftType>(assignment?.shiftType || 'PAGI');
  const [selectedMachines, setSelectedMachines] = useState<number[]>(assignment?.assignedMachineIds || []);
  const [isLeader, setIsLeader] = useState<boolean>(assignment?.isLeader || false);
  const [notes, setNotes] = useState<string>(assignment?.notes || '');
  const [specialDuty, setSpecialDuty] = useState<string | null>(assignment?.specialDuty || null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  useEffect(() => {
    if (assignment) {
      setShiftType(assignment.shiftType);
      setSelectedMachines(assignment.assignedMachineIds || []);
      setIsLeader(assignment.isLeader);
      setNotes(assignment.notes || '');
      setSpecialDuty(assignment.specialDuty || null);
      // Auto expand advanced if there are assigned machines, leader, or notes
      if (
        (assignment.assignedMachineIds && assignment.assignedMachineIds.length > 0) ||
        assignment.isLeader ||
        assignment.notes
      ) {
        setShowAdvanced(true);
      }
    }
  }, [assignment]);

  if (!assignment) return null;

  // Format date in Indonesian
  const formatIndoDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const toggleMachine = (id: number) => {
    setSelectedMachines((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id].sort((a, b) => a - b)
    );
  };

  // Instant 1-Click Shift Change: Changes shift immediately & closes modal
  const handleQuickShiftSelect = (st: ShiftType) => {
    const isWork = SHIFT_TYPE_INFO[st]?.isWorkShift;
    const machinesToKeep = isWork ? selectedMachines : [];
    const leaderToKeep = isWork ? isLeader : false;
    onSave(assignment, st, machinesToKeep, leaderToKeep, notes, specialDuty);
    onClose();
  };

  // Save complete configuration with advanced parameters
  const handleSaveAll = () => {
    const isWork = SHIFT_TYPE_INFO[shiftType]?.isWorkShift;
    onSave(
      assignment,
      shiftType,
      isWork ? selectedMachines : [],
      isWork ? isLeader : false,
      notes,
      specialDuty
    );
    onClose();
  };

  const isWorkShift = SHIFT_TYPE_INFO[shiftType]?.isWorkShift;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs overflow-y-auto antialiased">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                Ubah Jadwal Sif
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatIndoDate(assignment.date)}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-1">
              {assignment.nurseName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          
          {/* Quick 1-Click Shift Selector Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Pilih Sif (1x Klik Langsung Simpan):</span>
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Cukup klik salah satu
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(['PAGI', 'SIANG', 'LIBUR', 'CUTI', 'SAKIT'] as ShiftType[]).map((st) => {
                const info = SHIFT_TYPE_INFO[st];
                const isCurrent = assignment.shiftType === st;
                const isSelected = shiftType === st;

                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleQuickShiftSelect(st)}
                    className={`p-3 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between group active:scale-98 ${
                      isCurrent
                        ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 ring-2 ring-sky-500/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center shadow-xs shrink-0 ${info.badgeClass}`}
                      >
                        {info.code}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {info.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-600 text-white leading-tight">
                              Aktif
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          {info.timeRange}
                        </span>
                      </div>
                    </div>

                    <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:border-sky-300 transition-all shrink-0">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle Advanced / Full Configuration Button */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                <span>Pengaturan Lanjutan (Alokasi Mesin, PJ Sif & Tugas Khusus)</span>
              </span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                {showAdvanced ? 'Tutup Detail ▲' : 'Buka Detail ▼'}
              </span>
            </button>
          </div>

          {/* Advanced Section: PJ Sif, Machines, Duties & Notes */}
          {showAdvanced && (
            <div className="space-y-4 pt-1 animate-in fade-in-50 duration-150">
              
              {/* PJ Sif Checkbox */}
              {isWorkShift && (
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300">
                        Koordinator / PJ Sif (Katim)
                      </span>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        Memimpin operan dan koordinasi pelayanan sif HD
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isLeader}
                    onChange={(e) => setIsLeader(e.target.checked)}
                    className="w-5 h-5 rounded-lg text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer"
                  />
                </div>
              )}

              {/* Machine Allocation Selection */}
              {isWorkShift && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Alokasi Mesin HD ({selectedMachines.length} Mesin Dipilih)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMachines([])}
                        className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                      >
                        Reset Mesin
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {machines.map((m) => {
                      const isSelected = selectedMachines.includes(m.id);
                      const isSpec = m.category !== 'REGULER';
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleMachine(m.id)}
                          className={`p-2 rounded-xl text-xs font-semibold border flex flex-col items-center transition-all ${
                            isSelected
                              ? 'bg-sky-600 border-sky-600 text-white shadow-2xs font-bold'
                              : m.status !== 'AKTIF'
                              ? 'bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <span className="font-extrabold">{m.code}</span>
                          <span className="text-[9px] truncate max-w-full opacity-80">
                            {isSpec ? m.category.substring(0, 5) : `M${m.id}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tugas Khusus / PIC Ruangan */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    Tugas Khusus / PIC Ruangan
                  </label>
                  {specialDuty && (
                    <button
                      type="button"
                      onClick={() => setSpecialDuty(null)}
                      className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                    >
                      Hapus Tugas
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {Object.entries(SPECIAL_DUTY_OPTIONS).map(([code, opt]) => {
                    const isSelected = specialDuty === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setSpecialDuty(isSelected ? null : code)}
                        className={`p-2 rounded-xl border text-left text-[11px] transition-all flex items-center justify-between ${
                          isSelected
                            ? `${opt.badgeClass} ring-1 ring-blue-500/40 font-bold shadow-2xs`
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                        }`}
                      >
                        <span className="truncate">{opt.shortName}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-current" />}
                      </button>
                    );
                  })}
                </div>

                {specialDuty && SPECIAL_DUTY_OPTIONS[specialDuty] && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-850 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <b>Tanggung Jawab:</b> {SPECIAL_DUTY_OPTIONS[specialDuty].description}
                  </p>
                )}
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Catatan Sif
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: PJ Sif Pagi, Pasien isolasi khusus"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Save Complete Settings Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-extrabold bg-sky-700 hover:bg-sky-800 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pengaturan Lengkap</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Perubahan otomatis tersinkronisasi
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
