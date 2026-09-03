import React, { useState, useMemo } from 'react';
import { useHemo } from '../context/HemoContext';
import { Nurse, SPECIAL_DUTY_OPTIONS, SpecialDutyInfo, ShiftAssignment } from '../types';
import { SpecialDutyBadge } from './SpecialDutyBadge';
import {
  X,
  Tag,
  Calendar,
  Users,
  Check,
  Crown,
  BookOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface SpecialDutyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  initialNurseId?: number;
}

export const SpecialDutyModal: React.FC<SpecialDutyModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialNurseId,
}) => {
  const {
    nurses,
    updateNurse,
    assignments,
    updateAssignment,
    selectedDate: globalSelectedDate,
    showToast,
    isAdmin,
  } = useHemo();

  const [activeTab, setActiveTab] = useState<'NURSES' | 'DAILY' | 'GUIDE'>('NURSES');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTargetDate, setSelectedTargetDate] = useState<string>(
    initialDate || globalSelectedDate || new Date().toISOString().split('T')[0]
  );
  const [selectedNurseId, setSelectedNurseId] = useState<number | null>(initialNurseId || null);

  // Group duties distribution
  const dutyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(SPECIAL_DUTY_OPTIONS).forEach((k) => {
      counts[k] = 0;
    });
    nurses.forEach((n) => {
      if (n.specialDuty && counts[n.specialDuty] !== undefined) {
        counts[n.specialDuty]++;
      }
    });
    return counts;
  }, [nurses]);

  // Filtered nurses for Tab 1
  const filteredNurses = useMemo(() => {
    return nurses.filter((n) => {
      const q = searchQuery.toLowerCase();
      const matchName = n.name.toLowerCase().includes(q);
      const matchDuty = n.specialDuty ? n.specialDuty.toLowerCase().includes(q) : false;
      const matchRole = n.role.toLowerCase().includes(q);
      return matchName || matchDuty || matchRole;
    });
  }, [nurses, searchQuery]);

  // Daily assignments for Tab 2
  const dailyAssignments = useMemo(() => {
    return assignments.filter((a) => a.date === selectedTargetDate);
  }, [assignments, selectedTargetDate]);

  const dailyMap = useMemo(() => {
    const map = new Map<number, ShiftAssignment>();
    dailyAssignments.forEach((a) => map.set(a.nurseId, a));
    return map;
  }, [dailyAssignments]);

  if (!isOpen) return null;

  // Handle changing routine special duty for a nurse
  const handleAssignNurseDuty = (nurse: Nurse, dutyCode: string | null) => {
    if (!isAdmin) {
      showToast('Hanya Kepala Ruangan (Karu) atau Admin yang berwenang merubah tugas khusus.', 'info');
      return;
    }
    const updated: Nurse = {
      ...nurse,
      specialDuty: dutyCode || null,
    };
    updateNurse(updated);
    showToast(
      dutyCode
        ? `Tugas khusus ${nurse.name} diubah menjadi ${dutyCode}.`
        : `Tugas khusus ${nurse.name} telah dikosongkan.`,
      'success'
    );
  };

  // Handle changing duty for a specific date
  const handleAssignDailyDuty = (
    nurse: Nurse,
    dutyCode: string | null,
    isLeaderOverride?: boolean
  ) => {
    if (!isAdmin) {
      showToast('Hanya Kepala Ruangan (Karu) atau Admin yang berwenang merubah penugasan harian.', 'info');
      return;
    }

    const existingAsg = dailyMap.get(nurse.id);
    if (existingAsg) {
      updateAssignment(
        existingAsg,
        existingAsg.shiftType,
        existingAsg.assignedMachineIds || [],
        isLeaderOverride !== undefined ? isLeaderOverride : existingAsg.isLeader,
        existingAsg.notes || '',
        dutyCode || null
      );
    } else {
      // Create new assignment for this date
      const newAsg: ShiftAssignment = {
        id: `${selectedTargetDate}_${nurse.id}_${Date.now()}`,
        date: selectedTargetDate,
        shiftType: 'LIBUR',
        nurseId: nurse.id,
        nurseName: nurse.name,
        nursePhone: nurse.phone,
        assignedMachineIds: [],
        isLeader: isLeaderOverride || nurse.role === 'KATIM',
        isWhatsAppSent: false,
        notes: '',
        specialDuty: dutyCode || null,
      };
      updateAssignment(
        newAsg,
        'LIBUR',
        [],
        isLeaderOverride || false,
        '',
        dutyCode || null
      );
    }
    showToast(
      dutyCode
        ? `Tugas tanggal ${selectedTargetDate} untuk ${nurse.name}: ${dutyCode}`
        : `Tugas tanggal ${selectedTargetDate} untuk ${nurse.name} dikosongkan`,
      'success'
    );
  };

  // Date Navigation for Tab 2
  const shiftDate = (days: number) => {
    try {
      const parts = selectedTargetDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + days);
      const newDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      setSelectedTargetDate(newDateStr);
    } catch {
      // ignore
    }
  };

  // Format date indonesian
  const formatIndoDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs overflow-y-auto antialiased">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 my-6 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Menu Penginputan Tugas Khusus Ruangan HD
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Dialisis Unit
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Alokasikan penanggung jawab PIC ruangan (BHP, RO, Farmasi, Reuse, PPI, Dokumen BPJS) & PJ Sif
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 bg-white dark:bg-slate-900 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('NURSES')}
            className={`flex items-center gap-2 pb-3 px-3 border-b-2 text-xs font-black transition-all ${
              activeTab === 'NURSES'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tugas Pokok Perawat (PIC Tetap)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold border border-indigo-200 dark:border-indigo-800">
              {nurses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('DAILY')}
            className={`flex items-center gap-2 pb-3 px-3 border-b-2 text-xs font-black transition-all ${
              activeTab === 'DAILY'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Tugas Khusus Harian (Per Tanggal)</span>
          </button>

          <button
            onClick={() => setActiveTab('GUIDE')}
            className={`flex items-center gap-2 pb-3 px-3 border-b-2 text-xs font-black transition-all ${
              activeTab === 'GUIDE'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Panduan SOP Ruangan</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: PENUGASAN RUTIN PERAWAT (PIC TETAP RUANGAN) */}
          {activeTab === 'NURSES' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Duty Overview Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {Object.entries(SPECIAL_DUTY_OPTIONS).map(([code, opt]) => {
                  const count = dutyCounts[code] || 0;
                  return (
                    <div
                      key={code}
                      className={`p-2.5 rounded-2xl border flex flex-col justify-between transition-all ${
                        count > 0
                          ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 shadow-2xs'
                          : 'bg-slate-50/40 dark:bg-slate-800/30 border-dashed border-slate-200 dark:border-slate-800 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-black truncate text-slate-800 dark:text-slate-200">
                          {opt.shortName}
                        </span>
                        <span className="text-[11px] font-extrabold px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                          {count}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate mt-1">
                        {opt.label.split('(')[0]}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Search Bar & Instruction */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari perawat atau tugas khusus..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  💡 <b>Tip:</b> Klik tombol tugas di bawah perawat untuk langsung mengalokasikan PIC ruangan.
                </span>
              </div>

              {/* Nurse List with Quick Duty Assignment Buttons */}
              <div className="space-y-2.5">
                {filteredNurses.map((nurse) => {
                  const currentDuty = nurse.specialDuty;
                  const isHighlighted = selectedNurseId === nurse.id;

                  return (
                    <div
                      key={nurse.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isHighlighted
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        
                        {/* Nurse Info */}
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                            {nurse.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                {nurse.name}
                              </span>
                              <span
                                className={`text-[10px] font-black px-2 py-0.2 rounded-md ${
                                  nurse.role === 'KARU'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : nurse.role === 'KATIM'
                                    ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {nurse.role}
                              </span>
                              {nurse.nip && (
                                <span className="text-[10px] text-slate-400">
                                  NIP: {nurse.nip}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-slate-500">Status Tugas:</span>
                              {currentDuty ? (
                                <SpecialDutyBadge duty={currentDuty} size="xs" />
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Belum ada tugas khusus
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick 1-Click Duty Selector Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {Object.entries(SPECIAL_DUTY_OPTIONS).map(([code, opt]) => {
                            const isSelected = currentDuty === code;
                            return (
                              <button
                                key={code}
                                type="button"
                                onClick={() => handleAssignNurseDuty(nurse, isSelected ? null : code)}
                                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 active:scale-95 ${
                                  isSelected
                                    ? `${opt.badgeClass} ring-2 ring-indigo-500/30 font-black shadow-xs`
                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                                }`}
                                title={`${opt.label}: ${opt.description}`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-current" />}
                                <span>{opt.shortName}</span>
                              </button>
                            );
                          })}

                          {currentDuty && (
                            <button
                              type="button"
                              onClick={() => handleAssignNurseDuty(nurse, null)}
                              className="px-2 py-1.5 rounded-xl text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition-colors"
                              title="Hapus tugas khusus"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PENUGASAN HARIAN / PER TANGGAL */}
          {activeTab === 'DAILY' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              
              {/* Date Selector Header */}
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
                  <button
                    onClick={() => shiftDate(-1)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-2xs text-slate-700 dark:text-slate-200"
                    title="Hari Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 px-3">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <input
                      type="date"
                      value={selectedTargetDate}
                      onChange={(e) => setSelectedTargetDate(e.target.value)}
                      className="text-xs sm:text-sm font-black bg-transparent border-0 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={() => shiftDate(1)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-2xs text-slate-700 dark:text-slate-200"
                    title="Hari Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">
                    {formatIndoDate(selectedTargetDate)}
                  </span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                    Atur PJ Sif & Tugas Khusus khusus untuk tanggal ini
                  </span>
                </div>
              </div>

              {/* Table of Nurses on this Date */}
              <div className="space-y-3">
                {nurses.map((nurse) => {
                  const asg = dailyMap.get(nurse.id);
                  const shiftType = asg?.shiftType || 'LIBUR';
                  const isLeader = asg?.isLeader || false;
                  const activeDuty = asg?.specialDuty || nurse.specialDuty || null;
                  const hasCustomDutyOnDate = Boolean(asg?.specialDuty);

                  const isWorking = shiftType === 'PAGI' || shiftType === 'SIANG';

                  return (
                    <div
                      key={nurse.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isWorking
                          ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-2xs'
                          : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 opacity-70'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                              shiftType === 'PAGI'
                                ? 'bg-sky-500 text-white'
                                : shiftType === 'SIANG'
                                ? 'bg-amber-500 text-white'
                                : shiftType === 'CUTI'
                                ? 'bg-teal-500 text-white'
                                : shiftType === 'SAKIT'
                                ? 'bg-rose-500 text-white'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {shiftType === 'PAGI'
                              ? 'P'
                              : shiftType === 'SIANG'
                              ? 'S'
                              : shiftType === 'CUTI'
                              ? 'C'
                              : shiftType === 'SAKIT'
                              ? 'SKT'
                              : 'L'}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                {nurse.name}
                              </span>
                              {isLeader && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                                  <Crown className="w-3 h-3 text-amber-600" />
                                  PJ Sif (Katim)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span>Sif: <b>{shiftType}</b></span>
                              <span>•</span>
                              <span>
                                Tugas Hari Ini:{' '}
                                {activeDuty ? (
                                  <b className="text-indigo-600 dark:text-indigo-400">{activeDuty}</b>
                                ) : (
                                  'Standar Pelayanan HD'
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Controls for this Nurse on this date */}
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {isWorking && (
                            <button
                              type="button"
                              onClick={() => handleAssignDailyDuty(nurse, activeDuty, !isLeader)}
                              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 ${
                                isLeader
                                  ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-black'
                                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                              }`}
                              title="Tandai sebagai PJ Sif / Katim untuk tanggal ini"
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>{isLeader ? 'PJ Sif Aktif' : 'Jadikan PJ Sif'}</span>
                            </button>
                          )}

                          <select
                            value={asg?.specialDuty || ''}
                            onChange={(e) =>
                              handleAssignDailyDuty(nurse, e.target.value || null)
                            }
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Gunakan Tugas Rutin ({nurse.specialDuty || 'Tanpa Tugas'})</option>
                            {Object.entries(SPECIAL_DUTY_OPTIONS).map(([code, opt]) => (
                              <option key={code} value={code}>
                                {opt.shortName} - {opt.label.split('(')[0]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PANDUAN SOP TUGAS KHUSUS RUANGAN HD */}
          {activeTab === 'GUIDE' && (
            <div className="space-y-3 animate-in fade-in-50 duration-150">
              <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 rounded-2xl text-xs text-sky-900 dark:text-sky-200 space-y-1">
                <h4 className="font-black text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  Standar Pelayanan Dialisis Unit Hemodialisa
                </h4>
                <p className="text-[11px] text-sky-700 dark:text-sky-300">
                  Pembagian PIC (Person In Charge) memastikan kesiapan sarana, keselamatan pasien (patient safety), dan kelancaran klaim asuransi BPJS secara terstandarisasi.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(SPECIAL_DUTY_OPTIONS).map(([code, opt]) => (
                  <div
                    key={code}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <SpecialDutyBadge duty={code} size="md" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        SOP HD
                      </span>
                    </div>
                    <h5 className="text-xs font-black text-slate-900 dark:text-white">
                      {opt.label}
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {opt.description}
                    </p>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Perawat Bertugas: <b>{dutyCounts[code] || 0} orang</b></span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">Wajib Catat Logbook</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 text-xs">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Perubahan otomatis tersinkronisasi ke Cloud Firestore & profil perawat
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-extrabold bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-xs transition-colors active:scale-95"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
