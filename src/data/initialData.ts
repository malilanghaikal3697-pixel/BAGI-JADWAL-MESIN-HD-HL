import { Machine, Nurse, AppSettings } from '../types';

export const INITIAL_MACHINES: Machine[] = [
  // 1. Urutan Pertama: Bay A (A01 - A12)
  { id: 1, code: "A01", name: "Mesin HD A01", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 2, code: "A02", name: "Mesin HD A02", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 3, code: "A03", name: "Mesin HD A03", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 4, code: "A04", name: "Mesin HD A04", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 5, code: "A05", name: "Mesin HD A05", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 6, code: "A06", name: "Mesin HD A06", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 7, code: "A07", name: "Mesin HD A07", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 8, code: "A08", name: "Mesin HD A08", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 9, code: "A09", name: "Mesin HD A09", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 10, code: "A10", name: "Mesin HD A10", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 11, code: "A11", name: "Mesin HD A11", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 12, code: "A12", name: "Mesin HD A12", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },

  // 2. Urutan Kedua: Bay C Depan (C01 - C04)
  { id: 13, code: "C01", name: "Mesin HD C01", bay: "Bay C (Depan)", category: "REGULER", status: "AKTIF", brandModel: "Nipro Surdial 55Plus" },
  { id: 14, code: "C02", name: "Mesin HD C02", bay: "Bay C (Depan)", category: "REGULER", status: "AKTIF", brandModel: "Nipro Surdial 55Plus" },
  { id: 15, code: "C03", name: "Mesin HD C03", bay: "Bay C (Depan)", category: "REGULER", status: "AKTIF", brandModel: "Nipro Surdial 55Plus" },
  { id: 16, code: "C04", name: "Mesin HD C04", bay: "Bay C (Depan)", category: "REGULER", status: "AKTIF", brandModel: "Nipro Surdial 55Plus" },

  // 3. Urutan Ketiga: Bay B (B01 - B09)
  { id: 17, code: "B01", name: "Mesin HD B01", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 18, code: "B02", name: "Mesin HD B02", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 19, code: "B03", name: "Mesin HD B03", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 20, code: "B04", name: "Mesin HD B04", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 21, code: "B05", name: "Mesin HD B05", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 22, code: "B06", name: "Mesin HD B06", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 23, code: "B07", name: "Mesin HD B07", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 24, code: "B08", name: "Mesin HD B08", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 25, code: "B09", name: "Mesin HD B09", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },

  // 4. Urutan Keempat: Bay C Khusus & Isolasi (C05 - C09)
  { id: 26, code: "C05", name: "Mesin HD C05", bay: "Bay C (Khusus & Isolasi)", category: "REGULER", status: "AKTIF", brandModel: "Nipro Surdial 55Plus" },
  { id: 27, code: "C06", name: "Mesin HD C06 (Hep B)", bay: "Bay C (Khusus & Isolasi)", category: "HEPATITIS_B", status: "AKTIF", brandModel: "Fresenius 4008S Dedicated", notes: "Khusus Hepatitis B" },
  { id: 28, code: "C07", name: "Mesin HD C07 (Hep C)", bay: "Bay C (Khusus & Isolasi)", category: "HEPATITIS_C", status: "AKTIF", brandModel: "Gambro AK98 Dedicated", notes: "Khusus Hepatitis C" },
  { id: 29, code: "C08", name: "Mesin HD C08 (Isolasi)", bay: "Bay C (Khusus & Isolasi)", category: "ISOLASI", status: "AKTIF", brandModel: "Fresenius 5008S Multi-filter", notes: "Ruang Isolasi Tekanan Negatif" },
  { id: 30, code: "C09", name: "Mesin HD C09 (Isolasi)", bay: "Bay C (Khusus & Isolasi)", category: "ISOLASI", status: "AKTIF", brandModel: "Fresenius 5008S Multi-filter", notes: "Ruang Isolasi Tekanan Negatif / Cito" },
];

export const SAMPLE_NURSES: Nurse[] = [
  { id: 1, name: "Ns. Hendra Wijaya, S.Kep", nip: "198503122008011002", phone: "081234567801", role: "KARU", isActive: true, defaultOffDay: null, skillLevel: "Senior", specialDuty: null },
  { id: 2, name: "Ns. Siti Rahmawati, S.Kep", nip: "198807242010012004", phone: "081234567802", role: "KATIM", isActive: true, defaultOffDay: null, skillLevel: "Senior", specialDuty: null },
  { id: 3, name: "Ns. Budi Santoso, S.Kep", nip: "198909152012011003", phone: "081234567803", role: "KATIM", isActive: true, defaultOffDay: null, skillLevel: "Senior", specialDuty: null },
  { id: 4, name: "Ns. Dewi Anggraini, S.Kep", nip: "199104022014012001", phone: "081234567804", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Senior", specialDuty: "BHP" },
  { id: 5, name: "Ns. Ahmad Fauzi, S.Kep", nip: "199208192015011005", phone: "081234567805", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Senior", specialDuty: "NATRIUM RO" },
  { id: 6, name: "Ns. Nurul Hidayah, A.Md.Kep", nip: "199301112016012002", phone: "081234567806", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Medium", specialDuty: "FARMASI & LOGISTIK" },
  { id: 7, name: "Ns. Rian Pratama, A.Md.Kep", nip: "199312052017011001", phone: "081234567807", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Medium", specialDuty: "REUSE DIALYZER" },
  { id: 8, name: "Ns. Eka Putri Lestari, S.Kep", nip: "199405202018012003", phone: "081234567808", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Medium", specialDuty: "BHP" },
  { id: 9, name: "Ns. Muhammad Rizky, A.Md.Kep", nip: "199410142018011002", phone: "081234567809", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Medium", specialDuty: "NATRIUM RO" },
  { id: 10, name: "Ns. Tri Wahyuni, A.Md.Kep", nip: "199502282019012004", phone: "081234567810", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Medium", specialDuty: "FARMASI & LOGISTIK" },
  { id: 11, name: "Ns. Bayu Kurniawan, S.Kep", nip: "199507172019011001", phone: "081234567811", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Medium", specialDuty: "IPCN / PPI HD" },
  { id: 12, name: "Ns. Fitri Handayani, A.Md.Kep", nip: "199603092020012002", phone: "081234567812", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Junior", specialDuty: "KLAIM & DOKUMEN BPJS" },
  { id: 13, name: "Ns. Dimas Ardiansyah, S.Kep", nip: "199609252020011003", phone: "081234567813", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Junior", specialDuty: "BHP" },
  { id: 14, name: "Ns. Ratna Sari, A.Md.Kep", nip: "199701302021012001", phone: "081234567814", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Junior", specialDuty: "NATRIUM RO" },
  { id: 15, name: "Ns. Ilham Saputra, A.Md.Kep", nip: "199708122021011004", phone: "081234567815", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Junior", specialDuty: "FARMASI & LOGISTIK" },
  { id: 16, name: "Ns. Dian Permatasari, S.Kep", nip: "199804052022012003", phone: "081234567816", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Junior", specialDuty: null },
  { id: 17, name: "Ns. Aditya Nugraha, A.Md.Kep", nip: "199811212022011002", phone: "081234567817", role: "PELAKSANA", isActive: true, defaultOffDay: null, skillLevel: "Junior", specialDuty: null }
];

export const INITIAL_SETTINGS: AppSettings = {
  id: 1,
  hospitalName: "RS Happy Land Medical Centre",
  roomName: "Ruang Dialisis Gedung Timur Lt.3",
  headNurseName: "Kepala Ruang HD",
  headNursePhone: "081234567801",
  googleSheetWebhookUrl: "",
  googleSpreadsheetIdOrUrl: "",
  autoSyncGoogleSheets: false,
  minNursesPerShift: 8,
  maxConsecutiveWorkDays: 5,
  lastSyncTimestamp: 0,
  lastSyncStatus: "Belum pernah disinkronkan"
};
