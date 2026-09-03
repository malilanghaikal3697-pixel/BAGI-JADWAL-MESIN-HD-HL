import React, { useState, useMemo } from 'react';
import { useHemo } from '../context/HemoContext';
import {
  Machine,
  MachineStatus,
  MachineCategory,
  MACHINE_CATEGORY_INFO,
  MACHINE_STATUS_INFO,
  ShiftType,
} from '../types';
import { MachineModal } from '../components/MachineModal';
import { RegenerateMachineAllocationModal } from '../components/RegenerateMachineAllocationModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import { WhatsAppDispatcher } from '../domain/WhatsAppDispatcher';
import {
  Cpu,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Activity,
  Layers,
  ShieldAlert,
  Sun,
  Sunset,
  CheckCircle2,
  Wrench,
  PowerOff,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

export const MachineLayoutScreen: React.FC = () => {
  const {
    isAdmin,
    machines,
    dailyAssignments,
    selectedDate,
    updateMachine,
    addMachine,
    deleteMachine,
    loadDefaultMachines,
    reallocateMachinesForDate,
    updateAssignment,
    showToast,
  } = useHemo();

  const [activeShiftView, setActiveShiftView] = useState<'PAGI' | 'SIANG'>('PAGI');
  const [selectedBayFilter, setSelectedBayFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  const [assigningMachine, setAssigningMachine] = useState<Machine | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);

  // Group machines by Bay for visual floor plan layout in room sequence
  const bays = useMemo(() => {
    const bayOrder: string[] = [];
    WhatsAppDispatcher.getSortedMachines(machines).forEach((m) => {
      if (!bayOrder.includes(m.bay)) {
        bayOrder.push(m.bay);
      }
    });
    return bayOrder;
  }, [machines]);

  // Nurses working on active shift
  const nursesOnShift = useMemo(() => {
    return dailyAssignments.filter((a) => a.shiftType === activeShiftView);
  }, [dailyAssignments, activeShiftView]);

  // Build a lookup map of machineId -> Nurse assigned on current date & shift
  const machineNurseMap = useMemo(() => {
    const map = new Map<number | string, { nurseName: string; isLeader: boolean; nurseId: number }>();
    const shiftAssignments = dailyAssignments.filter((a) => a.shiftType === activeShiftView);

    shiftAssignments.forEach((assignment) => {
      // 1. Resolve structured machines via WhatsAppDispatcher
      const assignedMachines = WhatsAppDispatcher.getAssignedMachinesForAssignment(assignment, machines);
      assignedMachines.forEach((m) => {
        const info = { nurseName: assignment.nurseName, isLeader: assignment.isLeader, nurseId: assignment.nurseId };
        map.set(m.id, info);
        map.set(String(m.id), info);
        if (m.code) {
          map.set(m.code.toUpperCase(), info);
          map.set(m.code.toLowerCase(), info);
        }
      });

      // 2. Also map raw assignedMachineIds
      (assignment.assignedMachineIds || []).forEach((mId) => {
        const info = { nurseName: assignment.nurseName, isLeader: assignment.isLeader, nurseId: assignment.nurseId };
        map.set(mId, info);
        map.set(Number(mId), info);
        map.set(String(mId), info);
      });
    });
    return map;
  }, [dailyAssignments, activeShiftView, machines]);

  // Filtered machines sorted by room layout: A01-A12 -> C01-C04 -> B01-B09 -> C05-C09
  const filteredMachines = useMemo(() => {
    const list = machines.filter((m) => {
      if (selectedBayFilter !== 'ALL' && m.bay !== selectedBayFilter) return false;
      if (selectedCategoryFilter !== 'ALL' && m.category !== selectedCategoryFilter) return false;
      if (selectedStatusFilter !== 'ALL' && m.status !== selectedStatusFilter) return false;
      return true;
    });
    return WhatsAppDispatcher.getSortedMachines(list);
  }, [machines, selectedBayFilter, selectedCategoryFilter, selectedStatusFilter]);

  // Unallocated active machines on current date & shift
  const unallocatedActiveMachines = useMemo(() => {
    return filteredMachines.filter((m) => {
      const isOperational =
        !m.status ||
        m.status.toUpperCase() === 'AKTIF' ||
        (m.status !== 'MAINTENANCE' && m.status !== 'RUSAK' && m.status !== 'TIDAK_DIGUNAKAN');
      if (!isOperational) return false;
      const assigned =
        machineNurseMap.get(m.id) ||
        machineNurseMap.get(String(m.id)) ||
        (m.code ? machineNurseMap.get(m.code.toUpperCase()) || machineNurseMap.get(m.code.toLowerCase()) : undefined);
      return !assigned;
    });
  }, [filteredMachines, machineNurseMap]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = machines.length;
    const active = machines.filter((m) => m.status === 'AKTIF').length;
    const maintenance = machines.filter((m) => m.status === 'MAINTENANCE').length;
    const broken = machines.filter((m) => m.status === 'RUSAK').length;
    const special = machines.filter((m) => m.category !== 'REGULER').length;
    return { total, active, maintenance, broken, special };
  }, [machines]);

  const handleToggleStatus = (machine: Machine) => {
    if (!isAdmin) return;
    const nextStatus: MachineStatus =
      machine.status === 'AKTIF'
        ? 'MAINTENANCE'
        : machine.status === 'MAINTENANCE'
        ? 'RUSAK'
        : 'AKTIF';

    updateMachine({
      ...machine,
      status: nextStatus,
    });
    showToast(`Status ${machine.code} diubah menjadi ${MACHINE_STATUS_INFO[nextStatus].label}`, 'info');
  };

  const handleSaveMachine = (m: Omit<Machine, 'id'> | Machine) => {
    if (!isAdmin) return;
    if ('id' in m) {
      updateMachine(m as Machine);
      showToast(`Mesin ${m.code} berhasil diperbarui`, 'success');
    } else {
      addMachine(m);
      showToast(`Mesin baru ${m.code} berhasil ditambahkan`, 'success');
    }
    setEditingMachine(null);
  };

  const handleManualAssign = (nurseAssignmentId: string, machineId: number) => {
    if (!isAdmin) return;
    const targetAssignment = dailyAssignments.find((a) => a.id === nurseAssignmentId);
    if (!targetAssignment) return;

    // Check if machine is already assigned to someone else in this shift and remove it
    dailyAssignments.forEach((a) => {
      if (a.shiftType === activeShiftView && a.assignedMachineIds.includes(machineId) && a.id !== targetAssignment.id) {
        const remaining = a.assignedMachineIds.filter((id) => id !== machineId);
        updateAssignment(a, a.shiftType, remaining, a.isLeader, a.notes, a.specialDuty);
      }
    });

    const updatedMachines = Array.from(new Set([...targetAssignment.assignedMachineIds, machineId]));
    updateAssignment(
      targetAssignment,
      targetAssignment.shiftType,
      updatedMachines,
      targetAssignment.isLeader,
      targetAssignment.notes,
      targetAssignment.specialDuty
    );
    showToast(`Mesin berhasil ditugaskan ke ${targetAssignment.nurseName}!`, 'success');
    setAssigningMachine(null);
  };

  return (
    <div className="pb-24 space-y-4">
      <ReadOnlyBanner actionDescription="menambah data mesin, merubah status operasional, atau mengalokasikan mesin HD" />

      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" />
              Denah {machines.length} Mesin Hemodialisa & Status Real-time
            </h2>
            <p className="text-xs text-slate-500">
              Monitoring alokasi bed, perawat penanggung jawab, dan status infeksius tanggal{' '}
              <b className="text-slate-800">{selectedDate}</b>
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Shift View Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveShiftView('PAGI')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeShiftView === 'PAGI'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-sky-500" />
                Sif Pagi
              </button>
              <button
                onClick={() => setActiveShiftView('SIANG')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeShiftView === 'SIANG'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sunset className="w-3.5 h-3.5 text-amber-500" />
                Sif Siang
              </button>
            </div>

            {isAdmin && (
              <>
                <button
                  onClick={loadDefaultMachines}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  title="Pulihkan dan pastikan semua 30 mesin HD tampil lengkap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Pulihkan 30 Mesin
                </button>

                <button
                  onClick={() => setIsReallocateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-blue-500/25 transition-all active:scale-98"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Generate Ulang Alokasi Adil
                </button>

                <button
                  onClick={() => {
                    setEditingMachine(null);
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Mesin
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-slate-500">Total Mesin HD</span>
            <div className="font-bold text-slate-800 text-base">{stats.total} Bed</div>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
            <span className="text-emerald-700">Aktif Beroperasi</span>
            <div className="font-bold text-emerald-800 text-base">{stats.active} Bed</div>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
            <span className="text-amber-700">Maintenance</span>
            <div className="font-bold text-amber-800 text-base">{stats.maintenance} Bed</div>
          </div>
          <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
            <span className="text-rose-700">Rusak / Off</span>
            <div className="font-bold text-rose-800 text-base">{stats.broken} Bed</div>
          </div>
          <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-100 col-span-2 sm:col-span-1">
            <span className="text-purple-700">Khusus & Isolasi</span>
            <div className="font-bold text-purple-800 text-base">{stats.special} Mesin</div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-semibold text-slate-500">Filter:</span>
          <select
            value={selectedBayFilter}
            onChange={(e) => setSelectedBayFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">Semua Ruang / Bay ({bays.length})</option>
            {bays.map((bay) => (
              <option key={bay} value={bay}>
                {bay}
              </option>
            ))}
          </select>

          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="REGULER">Reguler</option>
            <option value="HEPATITIS_B">Hepatitis B</option>
            <option value="HEPATITIS_C">Hepatitis C</option>
            <option value="ISOLASI">Isolasi Khusus</option>
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">Semua Status</option>
            <option value="AKTIF">Aktif</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="RUSAK">Rusak</option>
          </select>

          {(selectedBayFilter !== 'ALL' || selectedCategoryFilter !== 'ALL' || selectedStatusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedBayFilter('ALL');
                setSelectedCategoryFilter('ALL');
                setSelectedStatusFilter('ALL');
              }}
              className="px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Recovery Banner if machine list is incomplete */}
      {machines.length < 25 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">
                Daftar Mesin Berkurang ({machines.length} dari 30 Mesin HD Terdeteksi)
              </p>
              <p className="text-xs text-amber-700">
                Data mesin Anda mungkin sempat terpotong. Klik tombol di samping untuk memulihkan seluruh 30 mesin HD (A01-A12, C01-C04, B01-B09, C05-C09) secara lengkap.
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={loadDefaultMachines}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Pulihkan 30 Mesin HD Lengkap
            </button>
          )}
        </div>
      )}

      {/* Active Unallocated Machines Alert & One-Click Auto Allocate */}
      {unallocatedActiveMachines.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sky-950 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 shrink-0 mt-0.5">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-sky-900">
                {unallocatedActiveMachines.length} Mesin Aktif Belum Dialokasikan (Sif {activeShiftView === 'PAGI' ? 'Pagi' : 'Siang'}, {selectedDate})
              </p>
              <p className="text-xs text-sky-700">
                {nursesOnShift.length > 0
                  ? `Tersedia ${nursesOnShift.length} perawat berdinas pada Sif ${activeShiftView === 'PAGI' ? 'Pagi' : 'Siang'}. Klik tombol di samping untuk membagikan ${unallocatedActiveMachines.length} mesin ini secara adil dan merata ke seluruh perawat.`
                  : `Belum ada perawat yang dijadwalkan berdinas di Sif ${activeShiftView === 'PAGI' ? 'Pagi' : 'Siang'} pada tanggal ini. Atur dinas perawat di menu Jadwal Harian terlebih dahulu.`}
              </p>
            </div>
          </div>
          {isAdmin && nursesOnShift.length > 0 && (
            <button
              onClick={() => reallocateMachinesForDate(selectedDate, { rotateBays: true })}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              Alokasikan Otomatis Semua Mesin
            </button>
          )}
        </div>
      )}

      {/* Empty State when no machines match */}
      {filteredMachines.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">Tidak ada mesin yang cocok dengan filter</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {machines.length === 0
              ? 'Daftar mesin kosong. Silakan klik tombol "Pulihkan 30 Mesin" untuk memuat kembali seluruh mesin HD.'
              : 'Silakan sesuaikan filter Ruang/Bay, Kategori, atau Status untuk menampilkan mesin.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {(selectedBayFilter !== 'ALL' || selectedCategoryFilter !== 'ALL' || selectedStatusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSelectedBayFilter('ALL');
                  setSelectedCategoryFilter('ALL');
                  setSelectedStatusFilter('ALL');
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Reset Filter
              </button>
            )}
            <button
              onClick={loadDefaultMachines}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Pulihkan 30 Mesin HD
            </button>
          </div>
        </div>
      )}

      {/* Interactive Machine Floor Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredMachines.map((machine) => {
          const assigned =
            machineNurseMap.get(machine.id) ||
            machineNurseMap.get(String(machine.id)) ||
            (machine.code
              ? machineNurseMap.get(machine.code.toUpperCase()) || machineNurseMap.get(machine.code.toLowerCase())
              : undefined);
          const catInfo = MACHINE_CATEGORY_INFO[machine.category];
          const statusInfo = MACHINE_STATUS_INFO[machine.status];
          const isOperational =
            !machine.status ||
            machine.status.toUpperCase() === 'AKTIF' ||
            (machine.status !== 'MAINTENANCE' && machine.status !== 'RUSAK' && machine.status !== 'TIDAK_DIGUNAKAN');

          return (
            <div
              key={machine.id}
              className={`rounded-2xl p-4 border transition-all relative flex flex-col justify-between ${
                !isOperational
                  ? 'bg-slate-50 border-slate-200 opacity-80'
                  : assigned
                  ? 'bg-white border-blue-200 shadow-xs ring-1 ring-blue-500/10'
                  : 'bg-white border-slate-200 shadow-xs ring-1 ring-amber-400/30'
              }`}
            >
              {/* Top Header Card */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm shadow-xs ${
                        machine.category === 'ISOLASI'
                          ? 'bg-rose-600 text-white'
                          : machine.category === 'HEPATITIS_B'
                          ? 'bg-purple-600 text-white'
                          : machine.category === 'HEPATITIS_C'
                          ? 'bg-pink-600 text-white'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      {machine.code.replace('M-', '')}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{machine.name}</h4>
                      <p className="text-[11px] text-slate-500 truncate max-w-[130px]">
                        {machine.brandModel}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingMachine(machine);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Mesin"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(machine)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Ganti Status (Aktif / Maintenance / Rusak)"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setMachineToDelete(machine)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Mesin HD"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Bay & Category Badges */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                    {machine.bay}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md ${catInfo.badgeClass}`}>
                    {catInfo.label}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${statusInfo.colorClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                    {statusInfo.label}
                  </span>
                </div>

                {machine.notes && (
                  <p className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100 italic">
                    "{machine.notes}"
                  </p>
                )}
              </div>

              {/* Assigned Nurse Footer for Active Shift */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block mb-1">
                  PJ Perawat ({activeShiftView}):
                </span>
                {assigned ? (
                  <div className="flex items-center justify-between bg-blue-50/80 p-2 rounded-xl border border-blue-200/60">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        {assigned.nurseName.charAt(0)}
                      </div>
                      <span className="font-semibold text-xs text-blue-950 truncate">
                        {assigned.nurseName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {assigned.isLeader && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                          KATIM
                        </span>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => setAssigningMachine(machine)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold px-1.5 py-0.5 hover:bg-blue-100/80 rounded transition-colors"
                          title="Pindahkan alokasi mesin"
                        >
                          Ubah
                        </button>
                      )}
                    </div>
                  </div>
                ) : isOperational ? (
                  <div className="flex items-center justify-between bg-amber-50 text-amber-900 p-2 rounded-xl text-xs border border-amber-200/60">
                    <div className="flex items-center gap-1.5 truncate">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-[11px] font-semibold">Belum dialokasikan</span>
                    </div>
                    {isAdmin && nursesOnShift.length > 0 && (
                      <button
                        onClick={() => setAssigningMachine(machine)}
                        className="text-[10px] font-bold px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow-2xs transition-colors cursor-pointer"
                        title="Tugaskan mesin ini langsung ke perawat"
                      >
                        Tugaskan
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-100 text-slate-500 p-2 rounded-xl text-xs flex items-center gap-1.5">
                    <PowerOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[11px]">Mesin tidak aktif</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Direct Assign Modal */}
      {assigningMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Tugaskan Mesin {assigningMachine.code}
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih perawat dinas Sif {activeShiftView === 'PAGI' ? 'Pagi' : 'Siang'} ({selectedDate})
                </p>
              </div>
              <button
                onClick={() => setAssigningMachine(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {nursesOnShift.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Tidak ada perawat dinas pada sif ini. Silakan tentukan dinas perawat di menu Jadwal Harian terlebih dahulu.
                </div>
              ) : (
                nursesOnShift.map((assignment) => {
                  const currentCount = assignment.assignedMachineIds.length;
                  const isCurrentHolder = assignment.assignedMachineIds.includes(assigningMachine.id);

                  return (
                    <button
                      key={assignment.id}
                      onClick={() => handleManualAssign(assignment.id, assigningMachine.id)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        isCurrentHolder
                          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                          {assignment.nurseName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            {assignment.nurseName}
                            {assignment.isLeader && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded">
                                KATIM
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            Memegang {currentCount} mesin saat ini
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        {isCurrentHolder ? (
                          <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-md">
                            Penanggung Jawab
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md group-hover:bg-blue-600 group-hover:text-white">
                            Pilih
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  reallocateMachinesForDate(selectedDate, { rotateBays: true });
                  setAssigningMachine(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
              >
                <Cpu className="w-3.5 h-3.5" />
                Alokasikan Otomatis Semua Mesin
              </button>
              <button
                onClick={() => setAssigningMachine(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Machine Add/Edit Modal */}
      <MachineModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMachine(null);
        }}
        onSave={handleSaveMachine}
        onDelete={(m) => setMachineToDelete(m)}
        machine={editingMachine}
      />

      {isReallocateModalOpen && (
        <RegenerateMachineAllocationModal
          isOpen={isReallocateModalOpen}
          onClose={() => setIsReallocateModalOpen(false)}
          defaultScope="DAILY"
        />
      )}

      {/* Delete Machine Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!machineToDelete}
        onClose={() => setMachineToDelete(null)}
        onConfirm={() => {
          if (machineToDelete) {
            deleteMachine(machineToDelete.id);
            setMachineToDelete(null);
          }
        }}
        title="Hapus Mesin Dialisis"
        message={`Apakah Anda yakin ingin menghapus Mesin ${machineToDelete?.code || ''} (${machineToDelete?.name || ''}) dari ${machineToDelete?.bay || ''}? Mesin ini akan dihapus dari denah dan jadwal penugasan perawat.`}
        itemName={machineToDelete ? `${machineToDelete.code} - ${machineToDelete.name} (${machineToDelete.bay})` : undefined}
        confirmButtonText="Hapus Mesin"
        note="⚠️ Catatan: Mesin ini akan dihapus dari denah ruangan dan seluruh alokasi sif. Anda dapat memulihkan seluruh 30 mesin HD kapan saja melalui tombol 'Pulihkan 30 Mesin'."
      />
    </div>
  );
};
