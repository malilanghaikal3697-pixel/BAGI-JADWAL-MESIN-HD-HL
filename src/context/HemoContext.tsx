import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  Nurse,
  Machine,
  ShiftAssignment,
  AppSettings,
  FairnessReport,
  ShiftType,
  MachineStatus,
} from '../types';
import { INITIAL_MACHINES, SAMPLE_NURSES, INITIAL_SETTINGS } from '../data/initialData';
import { FairSchedulerEngine } from '../domain/FairSchedulerEngine';
import { WhatsAppDispatcher } from '../domain/WhatsAppDispatcher';
import { GoogleSheetsService } from '../domain/GoogleSheetsService';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';

export interface HemoContextType {
  isAdmin: boolean;
  nurses: Nurse[];
  machines: Machine[];
  assignments: ShiftAssignment[];
  settings: AppSettings;
  selectedDate: string;
  selectedYear: number;
  selectedMonth: number;
  currentMonth: string;
  setCurrentMonth: (monthStr: string) => void;
  dailyAssignments: ShiftAssignment[];
  monthlyAssignments: ShiftAssignment[];
  fairnessReport: FairnessReport | null;
  isGenerating: boolean;
  isSyncing: boolean;
  isCloudConnected: boolean;
  isCloudLoaded: boolean;
  syncAllDataToCloud: () => Promise<boolean>;
  toastMessage: string | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  selectDate: (date: string) => void;
  selectMonth: (year: number, month: number) => void;
  setShift: (date: string, nurseId: number, shiftType: ShiftType) => void;
  generateSchedule: (force?: boolean) => void;
  generateMonthlySchedule: (monthStr?: string) => void;
  generateDailyMachineAllocation: (date?: string) => void;
  reallocateMachinesForDate: (
    date?: string,
    options?: {
      rotateBays?: boolean;
      leaderLighterLoad?: boolean;
      consecutiveIsolationProtection?: boolean;
      shuffleNurses?: boolean;
    }
  ) => void;
  reallocateMachinesForMonth: (
    monthStr?: string,
    options?: {
      rotateBays?: boolean;
      leaderLighterLoad?: boolean;
      consecutiveIsolationProtection?: boolean;
      shuffleNurses?: boolean;
    }
  ) => void;
  importScheduleAssignments: (
    importedAssignments: ShiftAssignment[],
    targetMonth: string,
    replaceExisting?: boolean,
    newNurses?: Nurse[]
  ) => void;
  updateAssignment: (
    assignment: ShiftAssignment,
    newShiftType: ShiftType,
    newMachines: number[],
    isLeader: boolean,
    notes: string,
    specialDuty?: string | null
  ) => void;
  addNurse: (nurse: Omit<Nurse, 'id'> | Nurse) => void;
  updateNurse: (nurse: Nurse) => void;
  addOrUpdateNurse: (nurse: Partial<Nurse> & { name: string; phone: string }) => void;
  deleteNurse: (id: number) => void;
  clearAllNurses: () => void;
  loadSampleNurses: () => void;
  addMachine: (machine: Omit<Machine, 'id'> | Machine) => void;
  updateMachine: (machine: Machine) => void;
  addOrUpdateMachine: (machine: Partial<Machine> & { name: string; code: string; bay: string }) => void;
  deleteMachine: (id: number) => void;
  loadDefaultMachines: () => void;
  toggleMachineStatus: (id: number) => void;
  setMachineStatus: (id: number, newStatus: MachineStatus, reason?: string) => void;
  setAllMachinesActive: () => void;
  updateSettings: (newSettings: AppSettings) => void;
  markAssignmentWhatsAppSent: (assignmentId: string, phone?: string) => void;
  dispatchWhatsAppToNurse: (assignment: ShiftAssignment) => void;
  dispatchGroupBroadcast: (shiftType: 'PAGI' | 'SIANG' | null) => void;
  dispatchHeadNurseReport: (
    headNursePhone?: string,
    headNurseName?: string,
    directWhatsApp?: boolean
  ) => void;
  syncToGoogleSheets: () => Promise<void>;
  syncWithGoogleSheets: () => Promise<boolean>;
  downloadCsv: () => void;
  copyTable: () => Promise<void>;
  resetToInitialData: () => void;
}

const HemoContext = createContext<HemoContextType | undefined>(undefined);

export const HemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { canManageRoster, isKaru, isAdmin: isSystemAdmin } = useAuth();

  const checkKaruPermission = (actionName: string = 'melakukan tindakan ini'): boolean => {
    if (!canManageRoster) {
      showToast(
        `Akses Ditolak: Hanya Kepala Ruangan (Karu) atau Administrator yang berwenang untuk ${actionName}.`,
        'error'
      );
      return false;
    }
    return true;
  };

  const today = new Date();
  const initialDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
  const initialMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState<string>(initialDateStr);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [currentMonth, setCurrentMonthState] = useState<string>(initialMonthStr);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [isCloudLoaded, setIsCloudLoaded] = useState<boolean>(false);

  // Local storage state with initial fallbacks
  const [nurses, setNurses] = useState<Nurse[]>(() => {
    const saved = localStorage.getItem('hemo_nurses_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Nurse[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        return SAMPLE_NURSES;
      }
    }
    return SAMPLE_NURSES;
  });

  const [machines, setMachines] = useState<Machine[]>(() => {
    const saved = localStorage.getItem('hemo_machines_v1');
    const deletedIds = new Set<number>(
      JSON.parse(localStorage.getItem('hemo_deleted_machine_ids') || '[]')
    );
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Machine[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Auto-upgrade legacy default 25 machines (M-01..M-25) to the room sequence (A01-A12, C01-C04, B01-B09, C05-C09)
          if (parsed.length === 25 && parsed[0]?.code === 'M-01') {
            return INITIAL_MACHINES;
          }
          // Ensure any standard machine (e.g. C05-C09) not explicitly deleted is included
          const existingIds = new Set(parsed.map((m) => m.id));
          const existingCodes = new Set(parsed.map((m) => m.code?.toUpperCase()));
          const missing = INITIAL_MACHINES.filter(
            (m) => !deletedIds.has(m.id) && !existingIds.has(m.id) && !existingCodes.has(m.code?.toUpperCase())
          );
          if (missing.length > 0) {
            return [...parsed, ...missing];
          }
          return parsed;
        }
      } catch {
        return INITIAL_MACHINES;
      }
    }
    return INITIAL_MACHINES;
  });

  const [assignments, setAssignments] = useState<ShiftAssignment[]>(() => {
    const saved = localStorage.getItem('hemo_assignments_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('hemo_settings_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_SETTINGS;
      }
    }
    return INITIAL_SETTINGS;
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isInitialCloudLoad = useRef(true);

  const showToast = (msg: string, _type?: 'success' | 'error' | 'info') => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const clearToast = () => setToastMessage(null);

  // Auto-persist changes to localStorage
  useEffect(() => {
    localStorage.setItem('hemo_nurses_v1', JSON.stringify(nurses));
  }, [nurses]);

  useEffect(() => {
    localStorage.setItem('hemo_machines_v1', JSON.stringify(machines));
  }, [machines]);

  useEffect(() => {
    localStorage.setItem('hemo_assignments_v1', JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem('hemo_settings_v1', JSON.stringify(settings));
  }, [settings]);

  // Helper functions for cloud sync & data sanitization
  const sanitizeAssignmentForFirestore = (item: ShiftAssignment): ShiftAssignment => {
    return {
      id: item.id,
      date: item.date,
      shiftType: item.shiftType,
      nurseId: item.nurseId,
      nurseName: item.nurseName || '',
      nursePhone: item.nursePhone || '',
      assignedMachineIds: Array.isArray(item.assignedMachineIds) ? item.assignedMachineIds : [],
      isLeader: Boolean(item.isLeader),
      isWhatsAppSent: Boolean(item.isWhatsAppSent),
      notes: item.notes || '',
      specialDuty: item.specialDuty || null,
    };
  };

  const sanitizeMachineForFirestore = (machine: Machine): Machine => {
    return {
      id: machine.id,
      code: machine.code || '',
      name: machine.name || '',
      bay: machine.bay || 'Bay A (Reguler)',
      category: machine.category || 'REGULER',
      status: machine.status || 'AKTIF',
      brandModel: machine.brandModel || '',
      notes: machine.notes ?? '',
    };
  };

  const syncNurseToCloud = async (nurse: Nurse) => {
    try {
      const sanitizedNurse: Nurse = {
        ...nurse,
        nip: nurse.nip || '',
        phone: nurse.phone || '',
        specialDuty: nurse.specialDuty || null,
        defaultOffDay: nurse.defaultOffDay !== undefined ? nurse.defaultOffDay : null,
      };
      await setDoc(doc(db, 'nurses', String(nurse.id)), sanitizedNurse);
    } catch (e) {
      console.warn('Could not sync nurse to Firestore:', e);
    }
  };

  const syncAllNursesToCloud = async (nursesList: Nurse[]) => {
    try {
      for (let i = 0; i < nursesList.length; i += 400) {
        const chunk = nursesList.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach((nurse) => {
          const sanitizedNurse: Nurse = {
            ...nurse,
            nip: nurse.nip || '',
            phone: nurse.phone || '',
            specialDuty: nurse.specialDuty || null,
            defaultOffDay: nurse.defaultOffDay !== undefined ? nurse.defaultOffDay : null,
          };
          batch.set(doc(db, 'nurses', String(nurse.id)), sanitizedNurse);
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('Could not sync all nurses to Firestore:', e);
    }
  };

  const syncMachineToCloud = async (machine: Machine) => {
    try {
      const sanitized = sanitizeMachineForFirestore(machine);
      await setDoc(doc(db, 'machines', String(machine.id)), sanitized);
    } catch (e) {
      console.warn('Could not sync machine to Firestore:', e);
    }
  };

  const syncAllMachinesToCloud = async (machinesList: Machine[]) => {
    try {
      for (let i = 0; i < machinesList.length; i += 400) {
        const chunk = machinesList.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach((m) => {
          const sanitized = sanitizeMachineForFirestore(m);
          batch.set(doc(db, 'machines', String(m.id)), sanitized);
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('Could not sync all machines to Firestore:', e);
    }
  };

  const syncAssignmentToCloud = async (assignment: ShiftAssignment) => {
    try {
      const sanitized = sanitizeAssignmentForFirestore(assignment);
      await setDoc(doc(db, 'assignments', assignment.id), sanitized);
    } catch (e) {
      console.warn('Could not sync assignment to Firestore:', e);
    }
  };

  const syncBatchAssignmentsToCloud = async (newAssignments: ShiftAssignment[]) => {
    try {
      for (let i = 0; i < newAssignments.length; i += 400) {
        const chunk = newAssignments.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          const sanitized = sanitizeAssignmentForFirestore(item);
          const ref = doc(db, 'assignments', item.id);
          batch.set(ref, sanitized);
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('Batch cloud sync error:', e);
    }
  };

  // Firestore Real-Time Subscriptions
  useEffect(() => {
    let unsubNurses = () => {};
    let unsubMachines = () => {};
    let unsubAssignments = () => {};
    let unsubSettings = () => {};

    try {
      // 1. Listen to Nurses collection
      unsubNurses = onSnapshot(
        collection(db, 'nurses'),
        (snapshot) => {
          setIsCloudConnected(true);
          if (!snapshot.empty) {
            const cloudNurses = snapshot.docs.map((d) => d.data() as Nurse);
            cloudNurses.sort((a, b) => a.id - b.id);
            setNurses(cloudNurses);
          } else {
            // Seed sample nurses only if both cloud and local state are empty
            setNurses((prev) => {
              if (prev && prev.length > 0) {
                syncAllNursesToCloud(prev);
                return prev;
              }
              syncAllNursesToCloud(SAMPLE_NURSES);
              return SAMPLE_NURSES;
            });
          }
        },
        (err) => {
          console.warn('Firestore nurses listener error:', err);
        }
      );

      // 2. Listen to Machines collection with safe merging
      unsubMachines = onSnapshot(
        collection(db, 'machines'),
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudMachines = snapshot.docs.map((d) => d.data() as Machine);
            cloudMachines.sort((a, b) => a.id - b.id);

            setMachines((prev) => {
              const deletedIds = new Set<number>(
                JSON.parse(localStorage.getItem('hemo_deleted_machine_ids') || '[]')
              );
              const healthyPrev = prev.length >= 25 ? prev : INITIAL_MACHINES;
              const baseList = healthyPrev.filter((m) => !deletedIds.has(m.id));
              const cloudMap = new Map(cloudMachines.map((m) => [m.id, m]));

              // Merge cloud updates into baseList (ensures notes/status updates are applied while keeping all machines)
              const merged = baseList.map((m) => {
                const cloudM = cloudMap.get(m.id);
                if (cloudM) {
                  return {
                    ...m,
                    ...cloudM,
                    notes: cloudM.notes ?? '',
                  };
                }
                return m;
              });

              // Also retain any cloud machines that were created dynamically
              cloudMachines.forEach((cm) => {
                if (!deletedIds.has(cm.id) && !merged.some((m) => m.id === cm.id)) {
                  merged.push({
                    ...cm,
                    notes: cm.notes ?? '',
                  });
                }
              });

              // Check if any standard INITIAL_MACHINES (e.g. C05-C09) are missing
              const mergedIds = new Set(merged.map((m) => m.id));
              const mergedCodes = new Set(merged.map((m) => m.code?.toUpperCase()));
              const missingInitial = INITIAL_MACHINES.filter(
                (m) => !deletedIds.has(m.id) && !mergedIds.has(m.id) && !mergedCodes.has(m.code?.toUpperCase())
              );
              if (missingInitial.length > 0) {
                merged.push(...missingInitial);
              }

              merged.sort((a, b) => a.id - b.id);

              // CRITICAL: If Firestore is missing machines (e.g. only 20 or 25 machines),
              // immediately upload the full list so cloud has the complete dataset!
              if (cloudMachines.length < 30 && merged.length >= 30) {
                syncAllMachinesToCloud(merged);
              }

              return merged;
            });
          } else {
            // Collection is empty: seed full INITIAL_MACHINES into Firestore
            setMachines((prev) => {
              const list = prev.length >= 25 ? prev : INITIAL_MACHINES;
              syncAllMachinesToCloud(list);
              return list;
            });
          }
        },
        (err) => {
          console.warn('Firestore machines listener error:', err);
        }
      );

      // 3. Listen to Assignments collection
      unsubAssignments = onSnapshot(
        collection(db, 'assignments'),
        (snapshot) => {
          setIsCloudLoaded(true);
          if (!snapshot.empty) {
            const rawCloudAssignments = snapshot.docs.map((d) => d.data() as ShiftAssignment);
            // Deduplicate assignments by (date, nurseId) so each nurse has at most 1 assignment per date
            const dedupMap = new Map<string, ShiftAssignment>();
            rawCloudAssignments.forEach((ca) => {
              const key = `${ca.date}_${ca.nurseId}`;
              const existing = dedupMap.get(key);
              if (!existing) {
                dedupMap.set(key, ca);
              } else {
                // Prefer assignment with working shift and allocated machines
                const caWorking = ca.shiftType === 'PAGI' || ca.shiftType === 'SIANG';
                const exWorking = existing.shiftType === 'PAGI' || existing.shiftType === 'SIANG';
                const caMach = (ca.assignedMachineIds || []).length;
                const exMach = (existing.assignedMachineIds || []).length;
                if ((caWorking && !exWorking) || (caWorking === exWorking && caMach > exMach)) {
                  dedupMap.set(key, ca);
                }
              }
            });

            const cloudAssignments = Array.from(dedupMap.values());

            setAssignments((prev) => {
              const prevMap = new Map<string, ShiftAssignment>();
              prev.forEach((a) => prevMap.set(a.id, a));

              return cloudAssignments.map((ca) => {
                const prevA = prevMap.get(ca.id);
                return {
                  ...ca,
                  specialDuty: ca.specialDuty ?? prevA?.specialDuty ?? null,
                };
              });
            });
          } else {
            // Cloud is empty. Check if local already has assignments to upload to cloud:
            setAssignments((prev) => {
              if (prev && prev.length > 0) {
                syncBatchAssignmentsToCloud(prev);
                return prev;
              }
              // Only if both cloud and local are empty, generate an initial schedule and save to cloud:
              const activeN = nurses.filter((n) => n.isActive);
              if (activeN.length > 0) {
                const initSched = FairSchedulerEngine.generateMonthlySchedule(
                  selectedYear,
                  selectedMonth,
                  nurses,
                  machines
                );
                if (initSched.length > 0) {
                  syncBatchAssignmentsToCloud(initSched);
                  return initSched;
                }
              }
              return [];
            });
          }
        },
        (err) => {
          console.warn('Firestore assignments listener error:', err);
          setIsCloudLoaded(true);
        }
      );

      // 4. Listen to Settings doc
      unsubSettings = onSnapshot(
        doc(db, 'settings', 'config'),
        (snapshot) => {
          if (snapshot.exists()) {
            setSettings(snapshot.data() as AppSettings);
          }
        },
        (err) => {
          console.warn('Firestore settings listener error:', err);
        }
      );
    } catch (e) {
      console.warn('Firestore initialization error:', e);
    }

    return () => {
      unsubNurses();
      unsubMachines();
      unsubAssignments();
      unsubSettings();
    };
  }, []);

  const setCurrentMonth = (monthStr: string) => {
    setCurrentMonthState(monthStr);
    const parts = monthStr.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      setSelectedYear(y);
      setSelectedMonth(m);
    }
  };

  const selectDate = (date: string) => {
    setSelectedDate(date);
    try {
      const parts = date.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (y !== selectedYear || m !== selectedMonth) {
          setSelectedYear(y);
          setSelectedMonth(m);
          setCurrentMonthState(`${y}-${String(m).padStart(2, '0')}`);
        }
      }
    } catch {
      // ignore
    }
  };

  const selectMonth = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    setCurrentMonthState(monthStr);
    const curr = new Date();
    if (curr.getFullYear() === year && curr.getMonth() + 1 === month) {
      setSelectedDate(
        `${year}-${String(month).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`
      );
    } else {
      setSelectedDate(`${year}-${String(month).padStart(2, '0')}-01`);
    }
  };

  const dailyAssignments = useMemo(() => {
    const nurseMap = new Map(nurses.map((n) => [n.id, n]));
    const existingMap = new Map<number, ShiftAssignment>();

    // 1. Gather all existing assignments for selectedDate that belong to CURRENT valid nurses
    assignments
      .filter((a) => a.date === selectedDate && nurseMap.has(a.nurseId))
      .forEach((a) => {
        const nurse = nurseMap.get(a.nurseId)!;
        existingMap.set(a.nurseId, {
          ...a,
          nurseName: nurse.name,
          nursePhone: nurse.phone,
          specialDuty: nurse.specialDuty !== undefined ? (nurse.specialDuty || null) : a.specialDuty,
        });
      });

    // 2. Guarantee that EVERY nurse in `nurses` has an assignment on selectedDate
    return nurses.map((nurse) => {
      const existing = existingMap.get(nurse.id);
      if (existing) return existing;

      return {
        id: `${selectedDate}-auto-${nurse.id}`,
        date: selectedDate,
        shiftType: (nurse.isActive ? 'LIBUR' : 'CUTI') as ShiftType,
        nurseId: nurse.id,
        nurseName: nurse.name,
        nursePhone: nurse.phone,
        assignedMachineIds: [],
        isLeader: nurse.role === 'KATIM' || nurse.role === 'KARU',
        isWhatsAppSent: false,
        notes: nurse.isActive ? 'Off / Belum Terjadwal' : 'Non-aktif',
        specialDuty: nurse.specialDuty || null,
      };
    });
  }, [assignments, selectedDate, nurses]);

  const monthlyAssignments = useMemo(() => {
    const prefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const validNurseIds = new Set(nurses.map((n) => n.id));
    return assignments.filter((a) => a.date.startsWith(prefix) && validNurseIds.has(a.nurseId));
  }, [assignments, selectedYear, selectedMonth, nurses]);

  const fairnessReport = useMemo(() => {
    return FairSchedulerEngine.calculateFairnessReport(
      selectedYear,
      selectedMonth,
      nurses,
      monthlyAssignments
    );
  }, [selectedYear, selectedMonth, nurses, monthlyAssignments]);

  const generateSchedule = (_force: boolean = true) => {
    if (!checkKaruPermission('menyusun jadwal otomatis')) return;
    const activeNurses = nurses.filter((n) => n.isActive);
    if (activeNurses.length === 0) {
      showToast('Belum ada perawat aktif. Silakan tambahkan data perawat di menu Tim Perawat.');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      try {
        const prefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        const newMonthSchedule = FairSchedulerEngine.generateMonthlySchedule(
          selectedYear,
          selectedMonth,
          nurses,
          machines,
          Date.now()
        );

        setAssignments((prev) => {
          const existingMonthMap = new Map<string, ShiftAssignment>();
          prev.filter((a) => a.date.startsWith(prefix)).forEach((a) => {
            existingMonthMap.set(`${a.date}_${a.nurseId}`, a);
          });

          const mergedMonthSchedule = newMonthSchedule.map((newAsg) => {
            const existing = existingMonthMap.get(`${newAsg.date}_${newAsg.nurseId}`);
            const nurse = nurses.find((n) => n.id === newAsg.nurseId);
            return {
              ...newAsg,
              specialDuty: existing?.specialDuty || nurse?.specialDuty || null,
            };
          });

          const otherMonths = prev.filter((a) => !a.date.startsWith(prefix));
          const updated = [...otherMonths, ...mergedMonthSchedule];
          syncBatchAssignmentsToCloud(mergedMonthSchedule);
          return updated;
        });

        showToast(`Pembagian jadwal & mesin bulan ${selectedMonth}/${selectedYear} berhasil dibuat otomatis!`, 'success');
      } catch (err) {
        showToast(`Gagal membuat jadwal: ${err instanceof Error ? err.message : String(err)}`, 'error');
      } finally {
        setIsGenerating(false);
      }
    }, 200);
  };

  const generateMonthlySchedule = (monthStr?: string) => {
    if (!checkKaruPermission('menyusun jadwal 1 bulan')) return;
    const targetMonth = monthStr || currentMonth;
    const parts = targetMonth.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);

    const activeNurses = nurses.filter((n) => n.isActive);
    if (activeNurses.length === 0) {
      showToast('Belum ada perawat aktif.', 'error');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      try {
        const prefix = `${y}-${String(m).padStart(2, '0')}`;
        const newMonthSchedule = FairSchedulerEngine.generateMonthlySchedule(
          y,
          m,
          nurses,
          machines,
          Date.now()
        );

        setAssignments((prev) => {
          const existingMonthMap = new Map<string, ShiftAssignment>();
          prev.filter((a) => a.date.startsWith(prefix)).forEach((a) => {
            existingMonthMap.set(`${a.date}_${a.nurseId}`, a);
          });

          const mergedMonthSchedule = newMonthSchedule.map((newAsg) => {
            const existing = existingMonthMap.get(`${newAsg.date}_${newAsg.nurseId}`);
            const nurse = nurses.find((n) => n.id === newAsg.nurseId);
            return {
              ...newAsg,
              specialDuty: existing?.specialDuty || nurse?.specialDuty || null,
            };
          });

          const otherMonths = prev.filter((a) => !a.date.startsWith(prefix));
          const updated = [...otherMonths, ...mergedMonthSchedule];
          syncBatchAssignmentsToCloud(mergedMonthSchedule);
          return updated;
        });

        showToast(`Jadwal bulan ${m}/${y} berhasil digenerate secara adil!`, 'success');
      } catch (err) {
        showToast(`Gagal: ${err instanceof Error ? err.message : String(err)}`, 'error');
      } finally {
        setIsGenerating(false);
      }
    }, 200);
  };

  const setShift = (date: string, nurseId: number, shiftType: ShiftType) => {
    if (!checkKaruPermission('mengubah sif perawat')) return;
    const nurse = nurses.find((n) => n.id === nurseId);
    if (!nurse) return;

    setAssignments((prev) => {
      const existing = prev.find((a) => a.date === date && a.nurseId === nurseId);
      if (existing) {
        const updatedAssignment: ShiftAssignment = {
          ...existing,
          shiftType,
          assignedMachineIds:
            shiftType === 'LIBUR' || shiftType === 'CUTI' || shiftType === 'SAKIT'
              ? []
              : existing.assignedMachineIds,
          specialDuty: existing.specialDuty ?? (nurse.specialDuty || null),
        };
        syncAssignmentToCloud(updatedAssignment);
        return prev.map((a) => (a.id === existing.id ? updatedAssignment : a));
      } else {
        const newAssignment: ShiftAssignment = {
          id: `${date}_${nurseId}_${Date.now()}`,
          date,
          shiftType,
          nurseId,
          nurseName: nurse.name,
          nursePhone: nurse.phone,
          assignedMachineIds: [],
          isLeader: nurse.role === 'KATIM',
          isWhatsAppSent: false,
          notes: '',
          specialDuty: nurse.specialDuty || null,
        };
        syncAssignmentToCloud(newAssignment);
        return [...prev, newAssignment];
      }
    });
  };

  const generateDailyMachineAllocation = (date: string = selectedDate) => {
    if (!checkKaruPermission('mengalokasikan mesin harian')) return;
    const activeNurses = nurses.filter((n) => n.isActive);
    if (activeNurses.length === 0) {
      showToast('Belum ada perawat aktif.', 'error');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      try {
        const activeMachines = machines.filter(
          (m) =>
            (m.status || 'AKTIF').toUpperCase() === 'AKTIF' &&
            m.status !== 'MAINTENANCE' &&
            m.status !== 'RUSAK' &&
            m.status !== 'TIDAK_DIGUNAKAN'
        );

        if (activeMachines.length === 0) {
          showToast('Tidak ada mesin berstatus AKTIF.', 'error');
          return;
        }

        // Daily source: use existing assignments for this date or dailyAssignments fallback
        const existingDaily = assignments.filter((a) => a.date === date);
        const dailySourceRaw =
          existingDaily.length > 0
            ? existingDaily
            : date === selectedDate && dailyAssignments.length > 0
            ? dailyAssignments
            : [];

        if (dailySourceRaw.length === 0) {
          generateSchedule(true);
        } else {
          // Deduplicate daily assignments by nurseId, prioritizing working shifts
          const uniqueDailyMap = new Map<number, ShiftAssignment>();
          dailySourceRaw.forEach((a) => {
            const nId = Number(a.nurseId);
            const existing = uniqueDailyMap.get(nId);
            if (!existing) {
              uniqueDailyMap.set(nId, a);
            } else {
              const isWorking = a.shiftType === 'PAGI' || a.shiftType === 'SIANG';
              const isExistingWorking = existing.shiftType === 'PAGI' || existing.shiftType === 'SIANG';
              if (isWorking && !isExistingWorking) {
                uniqueDailyMap.set(nId, a);
              }
            }
          });
          const dailySource = Array.from(uniqueDailyMap.values());

          const getOrCreateNurse = (a: ShiftAssignment): Nurse => {
            const found = nurses.find((n) => Number(n.id) === Number(a.nurseId));
            if (found) return found;
            return {
              id: Number(a.nurseId) || 999,
              name: a.nurseName,
              nip: '',
              phone: a.nursePhone || '',
              role: a.isLeader ? 'KATIM' : 'PELAKSANA',
              isActive: true,
              defaultOffDay: null,
              skillLevel: 'Senior',
              specialDuty: a.specialDuty || null,
            };
          };

          const pagiAssignments = dailySource.filter((a) => a.shiftType === 'PAGI');
          const siangAssignments = dailySource.filter((a) => a.shiftType === 'SIANG');

          const pagiNurses = pagiAssignments.map(getOrCreateNurse);
          const siangNurses = siangAssignments.map(getOrCreateNurse);

          const dayNumber = parseInt(date.split('-')[2] || '1', 10);
          const pagiAlloc = FairSchedulerEngine.allocateMachinesFairly(
            pagiNurses,
            activeMachines,
            dayNumber,
            'PAGI'
          );
          const siangAlloc = FairSchedulerEngine.allocateMachinesFairly(
            siangNurses,
            activeMachines,
            dayNumber,
            'SIANG'
          );

          const updatedDaily = dailySource.map((a) => {
            const nId = Number(a.nurseId);
            let assignedMachineIds: number[] = [];
            if (a.shiftType === 'PAGI') {
              assignedMachineIds = pagiAlloc[nId] || (pagiAlloc as Record<string, number[]>)[String(a.nurseId)] || [];
            } else if (a.shiftType === 'SIANG') {
              assignedMachineIds = siangAlloc[nId] || (siangAlloc as Record<string, number[]>)[String(a.nurseId)] || [];
            }
            return {
              ...a,
              assignedMachineIds,
            };
          });

          setAssignments((prev) => {
            const otherDates = prev.filter((a) => a.date !== date);
            return [...otherDates, ...updatedDaily];
          });
          syncBatchAssignmentsToCloud(updatedDaily);

          // Clean up any stale duplicate docs from Firestore
          const updatedIds = new Set(updatedDaily.map((a) => a.id));
          const staleDocIds = existingDaily
            .filter((a) => !updatedIds.has(a.id))
            .map((a) => a.id);
          staleDocIds.forEach(async (sId) => {
            try {
              await deleteDoc(doc(db, 'assignments', sId));
            } catch (e) {
              console.warn('Could not delete stale doc:', sId, e);
            }
          });
        }
        showToast(`Pembagian seluruh ${activeMachines.length} mesin aktif tanggal ${date} berhasil dialokasikan secara adil!`, 'success');
      } catch (err) {
        showToast(`Gagal: ${err instanceof Error ? err.message : String(err)}`, 'error');
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  };

  const reallocateMachinesForDate = (
    date: string = selectedDate,
    options: {
      rotateBays?: boolean;
      leaderLighterLoad?: boolean;
      consecutiveIsolationProtection?: boolean;
      shuffleNurses?: boolean;
    } = {}
  ) => {
    if (!checkKaruPermission('mengalokasikan mesin secara adil')) return;
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const activeMachines = machines.filter(
          (m) =>
            (m.status || 'AKTIF').toUpperCase() === 'AKTIF' &&
            m.status !== 'MAINTENANCE' &&
            m.status !== 'RUSAK' &&
            m.status !== 'TIDAK_DIGUNAKAN'
        );
        if (activeMachines.length === 0) {
          showToast('Tidak ada mesin berstatus AKTIF.', 'error');
          return;
        }

        const existingDaily = assignments.filter((a) => a.date === date);
        const dailySourceRaw =
          existingDaily.length > 0
            ? existingDaily
            : date === selectedDate && dailyAssignments.length > 0
            ? dailyAssignments
            : [];

        if (dailySourceRaw.length === 0) {
          showToast(`Tidak ditemukan jadwal dinas pada tanggal ${date}. Buat jadwal terlebih dahulu.`, 'error');
          return;
        }

        // Deduplicate daily assignments by nurseId, prioritizing working shifts
        const uniqueDailyMap = new Map<number, ShiftAssignment>();
        dailySourceRaw.forEach((a) => {
          const nId = Number(a.nurseId);
          const existing = uniqueDailyMap.get(nId);
          if (!existing) {
            uniqueDailyMap.set(nId, a);
          } else {
            const isWorking = a.shiftType === 'PAGI' || a.shiftType === 'SIANG';
            const isExistingWorking = existing.shiftType === 'PAGI' || existing.shiftType === 'SIANG';
            if (isWorking && !isExistingWorking) {
              uniqueDailyMap.set(nId, a);
            }
          }
        });
        const dailySource = Array.from(uniqueDailyMap.values());

        const getOrCreateNurse = (a: ShiftAssignment): Nurse => {
          const found = nurses.find((n) => Number(n.id) === Number(a.nurseId));
          if (found) return found;
          return {
            id: Number(a.nurseId) || 999,
            name: a.nurseName,
            nip: '',
            phone: a.nursePhone || '',
            role: a.isLeader ? 'KATIM' : 'PELAKSANA',
            isActive: true,
            defaultOffDay: null,
            skillLevel: 'Senior',
            specialDuty: a.specialDuty || null,
          };
        };

        const pagiAssignments = dailySource.filter((a) => a.shiftType === 'PAGI');
        const siangAssignments = dailySource.filter((a) => a.shiftType === 'SIANG');

        const pagiNurses = pagiAssignments.map(getOrCreateNurse);
        const siangNurses = siangAssignments.map(getOrCreateNurse);

        const dayNumber = parseInt(date.split('-')[2] || '1', 10);
        const fourMachineTracker: Record<number, number> = {};
        const isolationTracker: Record<number, number> = {};
        const lastDayIso: Record<number, boolean> = {};

        const effectiveOptions = {
          shuffleNurses: true,
          rotateBays: true,
          ...options,
        };

        const pagiAlloc = FairSchedulerEngine.allocateMachinesWithOptions(
          pagiNurses,
          activeMachines,
          dayNumber,
          'PAGI',
          fourMachineTracker,
          isolationTracker,
          lastDayIso,
          effectiveOptions
        );

        const siangAlloc = FairSchedulerEngine.allocateMachinesWithOptions(
          siangNurses,
          activeMachines,
          dayNumber,
          'SIANG',
          fourMachineTracker,
          isolationTracker,
          lastDayIso,
          effectiveOptions
        );

        const updatedDaily = dailySource.map((a) => {
          const nId = Number(a.nurseId);
          let assignedMachineIds: number[] = [];
          if (a.shiftType === 'PAGI') {
            assignedMachineIds = pagiAlloc[nId] || (pagiAlloc as Record<string, number[]>)[String(a.nurseId)] || [];
          } else if (a.shiftType === 'SIANG') {
            assignedMachineIds = siangAlloc[nId] || (siangAlloc as Record<string, number[]>)[String(a.nurseId)] || [];
          }
          return {
            ...a,
            assignedMachineIds,
          };
        });

        setAssignments((prev) => {
          const otherDates = prev.filter((a) => a.date !== date);
          return [...otherDates, ...updatedDaily];
        });

        syncBatchAssignmentsToCloud(updatedDaily);

        // Clean up any stale duplicate docs from Firestore
        const updatedIds = new Set(updatedDaily.map((a) => a.id));
        const staleDocIds = existingDaily
          .filter((a) => !updatedIds.has(a.id))
          .map((a) => a.id);
        staleDocIds.forEach(async (sId) => {
          try {
            await deleteDoc(doc(db, 'assignments', sId));
          } catch (e) {
            console.warn('Could not delete stale doc:', sId, e);
          }
        });
        showToast(
          `Alokasi ${activeMachines.length} mesin aktif tanggal ${date} berhasil digenerate ulang & perawat diacak adil tanpa merubah jadwal sif!`,
          'success'
        );
      } catch (err) {
        showToast(`Gagal alokasi mesin: ${err instanceof Error ? err.message : String(err)}`, 'error');
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  };

  const reallocateMachinesForMonth = (
    monthStr: string = currentMonth,
    options: {
      rotateBays?: boolean;
      leaderLighterLoad?: boolean;
      consecutiveIsolationProtection?: boolean;
      shuffleNurses?: boolean;
    } = {}
  ) => {
    if (!checkKaruPermission('mengalokasikan mesin bulanan')) return;
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const activeMachines = machines.filter(
          (m) =>
            (m.status || 'AKTIF').toUpperCase() === 'AKTIF' &&
            m.status !== 'MAINTENANCE' &&
            m.status !== 'RUSAK' &&
            m.status !== 'TIDAK_DIGUNAKAN'
        );
        if (activeMachines.length === 0) {
          showToast('Tidak ada mesin berstatus AKTIF.', 'error');
          return;
        }

        const effectiveOptions = {
          shuffleNurses: true,
          rotateBays: true,
          ...options,
        };

        const updatedSchedule = FairSchedulerEngine.reallocateMonthlyMachinesPreservingShifts(
          monthStr,
          assignments,
          nurses,
          activeMachines,
          effectiveOptions
        );

        setAssignments(updatedSchedule);
        const monthOnly = updatedSchedule.filter((a) => a.date.startsWith(monthStr));
        syncBatchAssignmentsToCloud(monthOnly);

        showToast(
          `Alokasi ${activeMachines.length} mesin aktif untuk bulan ${monthStr} berhasil digenerate ulang & perawat diacak adil tanpa merubah jadwal sif!`,
          'success'
        );
      } catch (err) {
        showToast(`Gagal alokasi mesin bulanan: ${err instanceof Error ? err.message : String(err)}`, 'error');
      } finally {
        setIsGenerating(false);
      }
    }, 200);
  };

  const importScheduleAssignments = (
    importedAssignments: ShiftAssignment[],
    targetMonth: string,
    replaceExisting: boolean = true,
    newNurses?: Nurse[]
  ) => {
    if (!checkKaruPermission('mengimpor jadwal')) return;
    if (!importedAssignments || importedAssignments.length === 0) {
      showToast('Tidak ada data jadwal yang dapat diimpor.', 'error');
      return;
    }

    try {
      let activeNursesList = nurses;
      if (newNurses && newNurses.length > 0) {
        const existingNurseIds = new Set(nurses.map((n) => n.id));
        const toAdd = newNurses.filter((n) => !existingNurseIds.has(n.id));
        if (toAdd.length > 0) {
          activeNursesList = [...nurses, ...toAdd];
          setNurses(activeNursesList);
          syncAllNursesToCloud(activeNursesList);
        }
      }

      let combined: ShiftAssignment[] = [];
      if (replaceExisting) {
        // Remove all previous assignments for targetMonth and replace with imported, preserving specialDuty
        const existingMap = new Map<string, ShiftAssignment>();
        const existingForMonth = assignments.filter((a) => a.date.startsWith(targetMonth));
        existingForMonth.forEach((a) => {
          existingMap.set(`${a.date}-${a.nurseId}`, a);
        });

        const preservedImported = importedAssignments.map((newAsg) => {
          const prev = existingMap.get(`${newAsg.date}-${newAsg.nurseId}`);
          const nurse = activeNursesList.find((n) => n.id === newAsg.nurseId);
          return {
            ...newAsg,
            specialDuty: newAsg.specialDuty || prev?.specialDuty || nurse?.specialDuty || null,
          };
        });

        const others = assignments.filter((a) => !a.date.startsWith(targetMonth));
        combined = [...others, ...preservedImported];
        setAssignments(combined);
        syncBatchAssignmentsToCloud(preservedImported);

        // Clean up old documents for targetMonth from Firestore whose IDs are not in preservedImported
        const newIds = new Set(preservedImported.map((a) => a.id));
        const oldDocIds = existingForMonth
          .filter((a) => !newIds.has(a.id))
          .map((a) => a.id);
        oldDocIds.forEach(async (oldId) => {
          try {
            await deleteDoc(doc(db, 'assignments', oldId));
          } catch (e) {
            console.warn('Could not delete old assignment during import replacement:', oldId, e);
          }
        });
      } else {
        // Merge: replace only matching IDs/dates
        const importMap = new Map<string, ShiftAssignment>();
        importedAssignments.forEach((a) => importMap.set(`${a.date}-${a.nurseId}`, a));

        const kept = assignments.filter((a) => !importMap.has(`${a.date}-${a.nurseId}`));
        combined = [...kept, ...importedAssignments];
        setAssignments(combined);
        syncBatchAssignmentsToCloud(importedAssignments);
      }

      showToast(
        `Sukses mengimpor ${importedAssignments.length} data jadwal untuk periode ${targetMonth}!${
          newNurses && newNurses.length > 0 ? ` Termasuk ${newNurses.length} perawat baru didaftarkan.` : ''
        }`,
        'success'
      );
    } catch (err) {
      showToast(`Gagal mengimpor jadwal: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const updateAssignment = (
    assignment: ShiftAssignment,
    newShiftType: ShiftType,
    newMachines: number[],
    isLeader: boolean,
    notes: string,
    specialDuty?: string | null
  ) => {
    if (!checkKaruPermission('mengubah penugasan dinas')) return;
    const updated: ShiftAssignment = {
      ...assignment,
      shiftType: newShiftType,
      assignedMachineIds: newMachines,
      isLeader,
      notes,
      specialDuty: specialDuty !== undefined ? (specialDuty || null) : (assignment.specialDuty || null),
    };
    syncAssignmentToCloud(updated);
    setAssignments((prev) => {
      const exists = prev.some(
        (a) => a.id === assignment.id || (a.date === assignment.date && Number(a.nurseId) === Number(assignment.nurseId))
      );
      if (exists) {
        return prev.map((a) =>
          a.id === assignment.id || (a.date === assignment.date && Number(a.nurseId) === Number(assignment.nurseId))
            ? updated
            : a
        );
      }
      return [...prev, updated];
    });
    showToast(`Perubahan jadwal ${assignment.nurseName} berhasil disimpan.`, 'success');
  };

  const addNurse = (nurseData: Omit<Nurse, 'id'> | Nurse) => {
    if (!checkKaruPermission('menambah data perawat')) return;
    const nextId = nurses.length > 0 ? Math.max(...nurses.map((n) => n.id)) + 1 : 1;
    const newNurse: Nurse = {
      ...nurseData,
      id: 'id' in nurseData ? nurseData.id : nextId,
    };
    syncNurseToCloud(newNurse);
    setNurses((prev) => [...prev, newNurse]);
    showToast(`Perawat ${newNurse.name} berhasil ditambahkan.`, 'success');
  };

  const updateNurse = (nurse: Nurse) => {
    if (!checkKaruPermission('mengubah data perawat')) return;
    syncNurseToCloud(nurse);
    setNurses((prev) => prev.map((n) => (n.id === nurse.id ? nurse : n)));
    setAssignments((prev) => {
      const updated = prev.map((a) =>
        a.nurseId === nurse.id
          ? {
              ...a,
              nurseName: nurse.name,
              nursePhone: nurse.phone,
              specialDuty: nurse.specialDuty !== undefined ? (nurse.specialDuty || null) : a.specialDuty,
            }
          : a
      );
      const affected = updated.filter((a) => a.nurseId === nurse.id);
      if (affected.length > 0) {
        syncBatchAssignmentsToCloud(affected);
      }
      return updated;
    });
    showToast(`Data ${nurse.name} berhasil diperbarui.`, 'success');
  };

  const addOrUpdateNurse = (nurseData: Partial<Nurse> & { name: string; phone: string }) => {
    if (!nurseData.id) {
      addNurse({
        name: nurseData.name,
        nip: nurseData.nip || '',
        phone: nurseData.phone,
        role: nurseData.role || 'PELAKSANA',
        isActive: nurseData.isActive !== undefined ? nurseData.isActive : true,
        defaultOffDay: nurseData.defaultOffDay || null,
        skillLevel: nurseData.skillLevel || 'Senior',
        specialDuty: nurseData.specialDuty || null,
      });
    } else {
      const existing = nurses.find((n) => n.id === nurseData.id);
      const updatedNurse: Nurse = {
        ...(existing || {}),
        ...nurseData,
        id: nurseData.id,
        name: nurseData.name,
        phone: nurseData.phone,
        specialDuty: nurseData.specialDuty !== undefined ? (nurseData.specialDuty || null) : (existing?.specialDuty || null),
      } as Nurse;
      updateNurse(updatedNurse);
    }
  };

  const deleteNurse = (id: number) => {
    if (!checkKaruPermission('menghapus data perawat')) return;
    const target = nurses.find((n) => n.id === id);
    try {
      const deleted = JSON.parse(localStorage.getItem('hemo_deleted_nurse_ids') || '[]');
      if (!deleted.includes(id)) {
        localStorage.setItem('hemo_deleted_nurse_ids', JSON.stringify([...deleted, id]));
      }
      deleteDoc(doc(db, 'nurses', String(id)));
    } catch (e) {
      console.warn('Could not delete nurse from Firestore:', e);
    }
    setNurses((prev) => prev.filter((n) => n.id !== id));
    setAssignments((prev) => prev.filter((a) => a.nurseId !== id));
    showToast(`Data perawat ${target?.name || ''} berhasil dihapus.`, 'info');
  };

  const clearAllNurses = () => {
    if (!checkKaruPermission('menghapus semua perawat')) return;
    setNurses([]);
    setAssignments([]);
    showToast('Semua data perawat dan jadwal telah dikosongkan.', 'info');
  };

  const loadSampleNurses = () => {
    if (!checkKaruPermission('memuat data perawat percontohan')) return;
    setNurses(SAMPLE_NURSES);
    SAMPLE_NURSES.forEach((n) => syncNurseToCloud(n));
    const newSched = FairSchedulerEngine.generateMonthlySchedule(
      selectedYear,
      selectedMonth,
      SAMPLE_NURSES,
      machines
    );
    setAssignments(newSched);
    syncBatchAssignmentsToCloud(newSched);
    showToast('17 data perawat percontohan berhasil dimuat.', 'success');
  };

  const addMachine = (machineData: Omit<Machine, 'id'> | Machine) => {
    if (!checkKaruPermission('menambah mesin HD')) return;
    const nextId = machines.length > 0 ? Math.max(...machines.map((m) => m.id)) + 1 : 1;
    const newMachine: Machine = {
      ...machineData,
      id: 'id' in machineData ? machineData.id : nextId,
    };
    syncMachineToCloud(newMachine);
    setMachines((prev) => [...prev, newMachine]);
    showToast(`Mesin ${newMachine.name} (${newMachine.code}) berhasil ditambahkan.`, 'success');
  };

  const updateMachine = (machine: Machine) => {
    if (!checkKaruPermission('mengubah data mesin HD')) return;
    syncMachineToCloud(machine);
    setMachines((prev) => prev.map((m) => (m.id === machine.id ? machine : m)));
    showToast(`Data mesin ${machine.name} berhasil diperbarui.`, 'success');
  };

  const addOrUpdateMachine = (machineData: Partial<Machine> & { name: string; code: string; bay: string }) => {
    if (!machineData.id) {
      addMachine({
        code: machineData.code || `M-${String(machines.length + 1).padStart(2, '0')}`,
        name: machineData.name || `Mesin HD ${String(machines.length + 1).padStart(2, '0')}`,
        bay: machineData.bay || 'Bay A (Reguler)',
        category: machineData.category || 'REGULER',
        status: machineData.status || 'AKTIF',
        brandModel: machineData.brandModel || 'Fresenius 4008S',
        notes: machineData.notes || '',
      });
    } else {
      const updatedMachine = { ...machineData } as Machine;
      syncMachineToCloud(updatedMachine);
      setMachines((prev) =>
        prev.map((m) => (m.id === machineData.id ? updatedMachine : m))
      );
      showToast(`Data ${machineData.name} berhasil diperbarui.`, 'success');
    }
  };

  const deleteMachine = (id: number) => {
    if (!checkKaruPermission('menghapus mesin HD')) return;
    const target = machines.find((m) => m.id === id);
    try {
      const deleted = JSON.parse(localStorage.getItem('hemo_deleted_machine_ids') || '[]');
      if (!deleted.includes(id)) {
        localStorage.setItem('hemo_deleted_machine_ids', JSON.stringify([...deleted, id]));
      }
      deleteDoc(doc(db, 'machines', String(id)));
    } catch (e) {
      console.warn('Could not delete machine from Firestore:', e);
    }
    setMachines((prev) => prev.filter((m) => m.id !== id));
    setAssignments((prev) =>
      prev.map((a) => ({
        ...a,
        assignedMachineIds: (a.assignedMachineIds || []).filter((mId) => mId !== id),
      }))
    );
    showToast(`Mesin ${target?.name || ''} (${target?.code || ''}) berhasil dihapus.`, 'info');
  };

  const loadDefaultMachines = () => {
    if (!checkKaruPermission('memulihkan denah 30 mesin HD')) return;
    localStorage.removeItem('hemo_deleted_machine_ids');
    setMachines(INITIAL_MACHINES);
    syncAllMachinesToCloud(INITIAL_MACHINES);
    showToast('Seluruh 30 mesin HD (A01-A12, C01-C04, B01-B09, C05-C09) berhasil dimuat lengkap dan disinkronkan.', 'success');
  };

  const toggleMachineStatus = (id: number) => {
    if (!checkKaruPermission('mengubah status mesin HD')) return;
    const target = machines.find((m) => m.id === id);
    if (!target) return;
    const newStatus: MachineStatus = target.status === 'AKTIF' ? 'TIDAK_DIGUNAKAN' : 'AKTIF';
    const updated = { ...target, status: newStatus };
    syncMachineToCloud(updated);
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? updated : m))
    );
    generateDailyMachineAllocation(selectedDate);
    const label = newStatus === 'AKTIF' ? 'Aktif Normal' : 'Tidak Digunakan';
    showToast(`${target.name} diubah menjadi: ${label}`, 'info');
  };

  const setMachineStatus = (id: number, newStatus: MachineStatus, reason: string = '') => {
    if (!checkKaruPermission('mengubah status mesin HD')) return;
    const target = machines.find((m) => m.id === id);
    if (!target) return;
    const newNotes = reason ? (target.notes ? `${target.notes} | ${reason}` : reason) : target.notes;
    const updated = { ...target, status: newStatus, notes: newNotes };
    syncMachineToCloud(updated);
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? updated : m))
    );
    generateDailyMachineAllocation(selectedDate);
    showToast(`${target.name} diset: ${newStatus}`, 'info');
  };

  const setAllMachinesActive = () => {
    if (!checkKaruPermission('mengaktifkan semua mesin HD')) return;
    setMachines((prev) => {
      const updated = prev.map((m) => ({ ...m, status: 'AKTIF' as MachineStatus }));
      syncAllMachinesToCloud(updated);
      return updated;
    });
    generateDailyMachineAllocation(selectedDate);
    showToast('Semua 30 mesin berhasil diaktifkan.', 'success');
  };

  const updateSettings = (newSettings: AppSettings) => {
    if (!checkKaruPermission('mengubah pengaturan sistem')) return;
    setSettings(newSettings);
    try {
      setDoc(doc(db, 'settings', 'config'), newSettings);
    } catch (e) {
      console.warn('Could not sync settings to Firestore:', e);
    }
    showToast('Pengaturan berhasil disimpan.', 'success');
  };

  const markAssignmentWhatsAppSent = (assignmentId: string, phone?: string) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === assignmentId) {
          return {
            ...a,
            isWhatsAppSent: true,
            ...(phone ? { nursePhone: phone } : {}),
          };
        }
        return a;
      })
    );
  };

  const dispatchWhatsAppToNurse = (assignment: ShiftAssignment) => {
    const nurse = nurses.find((n) => n.id === assignment.nurseId);
    const targetPhone = assignment.nursePhone || nurse?.phone || '';
    const msg = WhatsAppDispatcher.generateNurseMessage(
      assignment,
      machines,
      settings.hospitalName,
      settings.roomName
    );

    WhatsAppDispatcher.openWhatsApp(targetPhone, msg);
    markAssignmentWhatsAppSent(assignment.id, targetPhone);
    showToast(`Membuka WhatsApp untuk ${assignment.nurseName}... Teks pesan disalin!`, 'success');
  };

  const dispatchGroupBroadcast = (shiftType: 'PAGI' | 'SIANG' | null) => {
    const msg = WhatsAppDispatcher.generateGroupBroadcastMessage(
      selectedDate,
      shiftType,
      dailyAssignments,
      machines,
      settings.hospitalName
    );
    WhatsAppDispatcher.openWhatsApp(null, msg);
    showToast('Membuka WhatsApp untuk Broadcast Grup HD... Teks pesan disalin!', 'success');
  };

  const dispatchHeadNurseReport = (
    headNursePhone?: string,
    headNurseName?: string,
    directWhatsApp: boolean = true
  ) => {
    const targetPhone = headNursePhone || settings.headNursePhone;
    const targetName = headNurseName || settings.headNurseName || 'Kepala Ruang HD';
    const msg = WhatsAppDispatcher.generateHeadNurseDailyAllocationMessage(
      selectedDate,
      dailyAssignments,
      machines,
      settings.hospitalName,
      settings.roomName,
      targetName
    );

    if (directWhatsApp && targetPhone) {
      WhatsAppDispatcher.openWhatsApp(targetPhone, msg);
      showToast(`Laporan harian dikirim ke ${targetName} via WhatsApp.`, 'success');
    } else {
      WhatsAppDispatcher.shareOrCopy(msg, `Laporan Harian Pembagian Mesin HD ${selectedDate}`);
      showToast(`Laporan harian berhasil disalin untuk ${targetName}.`, 'success');
    }
  };

  const syncToGoogleSheets = async () => {
    setIsSyncing(true);
    try {
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const result = await GoogleSheetsService.syncToGoogleSheets(
        settings.googleSheetWebhookUrl,
        monthStr,
        nurses,
        machines,
        monthlyAssignments
      );
      setSettings((prev) => ({
        ...prev,
        lastSyncTimestamp: Date.now(),
        lastSyncStatus: result.message,
      }));
      showToast(result.message, result.isSuccess ? 'success' : 'error');
    } catch (err) {
      showToast(`Gagal sync: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncWithGoogleSheets = async (): Promise<boolean> => {
    setIsSyncing(true);
    try {
      const monthStr = currentMonth;
      const result = await GoogleSheetsService.syncToGoogleSheets(
        settings.googleSheetWebhookUrl,
        monthStr,
        nurses,
        machines,
        monthlyAssignments
      );
      setSettings((prev) => ({
        ...prev,
        lastSyncTimestamp: Date.now(),
        lastSyncStatus: result.message,
      }));
      return result.isSuccess;
    } catch {
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const downloadCsv = () => {
    const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    GoogleSheetsService.downloadCsvFile(monthStr, monthlyAssignments, machines);
    showToast('File CSV berhasil diunduh.', 'success');
  };

  const copyTable = async () => {
    const ok = await GoogleSheetsService.copyTableToClipboard(monthlyAssignments, machines);
    if (ok) {
      showToast('Tabel tersalin! Silakan tempel (Paste) di Google Sheets / Excel.', 'success');
    } else {
      showToast('Gagal menyalin tabel ke clipboard.', 'error');
    }
  };

  const resetToInitialData = () => {
    if (!checkKaruPermission('mereset data ke awal')) return;
    localStorage.removeItem('hemo_deleted_machine_ids');
    localStorage.removeItem('hemo_deleted_nurse_ids');
    setNurses(SAMPLE_NURSES);
    setMachines(INITIAL_MACHINES);
    setSettings(INITIAL_SETTINGS);
    syncAllNursesToCloud(SAMPLE_NURSES);
    syncAllMachinesToCloud(INITIAL_MACHINES);
    const initialSchedule = FairSchedulerEngine.generateMonthlySchedule(
      selectedYear,
      selectedMonth,
      SAMPLE_NURSES,
      INITIAL_MACHINES
    );
    setAssignments(initialSchedule);
    syncBatchAssignmentsToCloud(initialSchedule);
    localStorage.removeItem('hemo_nurses_v1');
    localStorage.removeItem('hemo_machines_v1');
    localStorage.removeItem('hemo_assignments_v1');
    localStorage.removeItem('hemo_settings_v1');
    showToast('Data berhasil direset ke pengaturan awal 17 perawat & 30 mesin (A01-A12, C01-C04, B01-B09, C05-C09).', 'info');
  };

  const syncAllDataToCloud = async (): Promise<boolean> => {
    if (!checkKaruPermission('mengunggah data ke cloud')) return false;
    setIsSyncing(true);
    try {
      if (nurses.length > 0) {
        await syncAllNursesToCloud(nurses);
      }
      if (machines.length > 0) {
        await syncAllMachinesToCloud(machines);
      }
      if (assignments.length > 0) {
        await syncBatchAssignmentsToCloud(assignments);
      }
      await setDoc(doc(db, 'settings', 'config'), settings);
      setIsCloudConnected(true);
      showToast(
        `Berhasil! Seluruh ${assignments.length} jadwal, ${nurses.length} perawat, dan ${machines.length} mesin tersinkron & terkunci di Cloud Firestore.`,
        'success'
      );
      return true;
    } catch (err) {
      showToast(`Gagal sinkronisasi cloud: ${err instanceof Error ? err.message : String(err)}`, 'error');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <HemoContext.Provider
      value={{
        isAdmin: canManageRoster,
        nurses,
        machines,
        assignments,
        settings,
        selectedDate,
        selectedYear,
        selectedMonth,
        currentMonth,
        setCurrentMonth,
        dailyAssignments,
        monthlyAssignments,
        fairnessReport,
        isGenerating,
        isSyncing,
        isCloudConnected,
        isCloudLoaded,
        syncAllDataToCloud,
        toastMessage,
        showToast,
        clearToast,
        selectDate,
        selectMonth,
        setShift,
        generateSchedule,
        generateMonthlySchedule,
        generateDailyMachineAllocation,
        reallocateMachinesForDate,
        reallocateMachinesForMonth,
        importScheduleAssignments,
        updateAssignment,
        addNurse,
        updateNurse,
        addOrUpdateNurse,
        deleteNurse,
        clearAllNurses,
        loadSampleNurses,
        addMachine,
        updateMachine,
        addOrUpdateMachine,
        deleteMachine,
        loadDefaultMachines,
        toggleMachineStatus,
        setMachineStatus,
        setAllMachinesActive,
        updateSettings,
        markAssignmentWhatsAppSent,
        dispatchWhatsAppToNurse,
        dispatchGroupBroadcast,
        dispatchHeadNurseReport,
        syncToGoogleSheets,
        syncWithGoogleSheets,
        downloadCsv,
        copyTable,
        resetToInitialData,
      }}
    >
      {children}
    </HemoContext.Provider>
  );
};

export const useHemo = () => {
  const context = useContext(HemoContext);
  if (!context) {
    throw new Error('useHemo must be used within a HemoProvider');
  }
  return context;
};
