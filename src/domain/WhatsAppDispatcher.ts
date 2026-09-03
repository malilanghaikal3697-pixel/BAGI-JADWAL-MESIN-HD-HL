import { Machine, ShiftAssignment, SHIFT_TYPE_INFO } from '../types';

export class WhatsAppDispatcher {
  static formatIndonesianDate(isoDate: string): string {
    try {
      const date = new Date(isoDate + 'T00:00:00');
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const dayName = days[date.getDay()];
      const monthName = months[date.getMonth()];
      return `${dayName}, ${date.getDate()} ${monthName} ${date.getFullYear()}`;
    } catch {
      return isoDate;
    }
  }

  /**
   * Sanitizes Indonesian phone numbers into international WhatsApp format (e.g., 0812 -> 62812).
   * Returns empty string if phone number is missing, empty, or invalid.
   */
  static cleanPhoneNumberForWhatsApp(rawPhone?: string | null): string {
    if (!rawPhone) return '';
    let cleaned = String(rawPhone).trim().replace(/[^0-9+]/g, '');
    if (!cleaned) return '';

    if (cleaned.startsWith('+62')) {
      cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }

    // Must have at least 9 digits to be a valid phone number (e.g., 6281234567)
    if (cleaned.length < 9) {
      return '';
    }
    return cleaned;
  }

  /**
   * Checks if a phone number string is valid for WhatsApp dispatch.
   */
  static isValidPhoneNumber(rawPhone?: string | null): boolean {
    const cleaned = this.cleanPhoneNumberForWhatsApp(rawPhone);
    return cleaned.length >= 9;
  }

  /**
   * Identifies default mock/sample numbers (e.g., 081234567801 .. 081234567817) so users can be warned.
   */
  static isSamplePhoneNumber(rawPhone?: string | null): boolean {
    if (!rawPhone) return false;
    const clean = rawPhone.replace(/[^0-9]/g, '');
    return (
      clean.startsWith('0812345678') ||
      clean.startsWith('62812345678') ||
      clean === '081234567890' ||
      clean === '081122334455'
    );
  }

  /**
   * Creates personal notification message for a single nurse.
   */
  static generateNurseMessage(
    assignment: ShiftAssignment,
    machines: Machine[],
    hospitalName: string = 'RS Happy Land Medical Centre',
    roomName: string = 'Ruang Dialisis Gedung Timur Lt.3'
  ): string {
    const formattedDate = this.formatIndonesianDate(assignment.date);
    const shiftIcon = assignment.shiftType === 'PAGI' ? '🌅' : '🌇';
    let shiftBadge = '';
    switch (assignment.shiftType) {
      case 'PAGI':
        shiftBadge = `${shiftIcon} SIF PAGI (07.00 - 14.00 WIB)`;
        break;
      case 'SIANG':
        shiftBadge = `${shiftIcon} SIF SIANG (12.00 - 19.00 WIB)`;
        break;
      case 'LIBUR':
        shiftBadge = '🌴 HARI LIBUR / OFF';
        break;
      case 'CUTI':
        shiftBadge = '🏖️ CUTI TAHUNAN';
        break;
      case 'SAKIT':
        shiftBadge = '🩺 IZIN / SAKIT';
        break;
    }

    const assignedMachines = this.getAssignedMachinesForAssignment(assignment, machines);

    const sb: string[] = [];
    sb.push(`🏥 ${hospitalName}`);
    sb.push(`📍 ${roomName}`);
    sb.push('━━━━━━━━━━━━━━━━━━━━━━');
    sb.push('📋 JADWAL DINAS & ALOKASI MESIN HD');
    sb.push(`👤 Nama: ${assignment.nurseName}`);
    sb.push(`📅 Tanggal: ${formattedDate}`);
    sb.push(`⏰ Sif: ${shiftBadge}`);

    const roleText = assignment.isLeader ? 'PJ Sif / Koordinator Sif' : 'Perawat Pelaksana HD';
    sb.push(`⭐ Peran: ${roleText}`);

    const dutyText = assignment.specialDuty ? assignment.specialDuty : '-';
    sb.push(`🏷️ Tugas Khusus PIC: ${dutyText}`);

    const isWorkShift = SHIFT_TYPE_INFO[assignment.shiftType]?.isWorkShift;
    if (isWorkShift) {
      sb.push(`📟 ALOKASI MESIN DIKELOLA (${assignedMachines.length} Mesin):`);
      if (assignedMachines.length === 0) {
        sb.push('*(Belum ada mesin yang ditugaskan)*');
      } else {
        assignedMachines.forEach((m) => {
          sb.push(`▶️ [${m.code}] ${m.name}`);
        });
      }

      sb.push('📝 SOP & Petunjuk Pelayanan:');
      sb.push('Lakukan briefing 15 menit sebelum sif dimulai');
      sb.push('Priming & pemeriksaan dialyzer sesuai standar keselamatan');
      sb.push('Monitoring TTV & parameter mesin tiap 30-60 menit');
      sb.push('Operan pasien & desinfeksi mesin bersama sif berikutnya');
    } else {
      sb.push('Selamat beristirahat dan mengisi kembali energi. Terima kasih atas dedikasi Anda! 🙏✨');
    }

    sb.push('━━━━━━━━━━━━━━━━━━━━━━');
    sb.push('Sistem Otomasi Jadwal & Alokasi HD HemoShift');

    return sb.join('\n');
  }

  /**
   * Creates a group broadcast summary for the whole shift or day.
   */
  static generateGroupBroadcastMessage(
    dateStr: string,
    shiftType: 'PAGI' | 'SIANG' | null,
    assignments: ShiftAssignment[],
    machines: Machine[],
    hospitalName: string = 'RS Happy Land Medical Centre'
  ): string {
    const formattedDate = this.formatIndonesianDate(dateStr);
    const sb: string[] = [];
    sb.push('📢 *REKAP JADWAL & ALOKASI MESIN HD*');
    sb.push(`🏥 *${hospitalName}*`);
    sb.push(`📅 ${formattedDate}`);
    sb.push('━━━━━━━━━━━━━━━━━━━━━━');

    const shiftsToInclude: ('PAGI' | 'SIANG')[] = shiftType ? [shiftType] : ['PAGI', 'SIANG'];

    for (const st of shiftsToInclude) {
      const shiftIcon = st === 'PAGI' ? '🌅' : '🌇';
      const timeRange = st === 'PAGI' ? '07.00 - 14.00 WIB' : '12.00 - 19.00 WIB';
      sb.push(`\n${shiftIcon} *SIF ${st} (${timeRange})*`);
      const onDuty = this.sortAssignmentsByMachineOrder(
        assignments.filter((a) => a.shiftType === st),
        machines
      );

      if (onDuty.length === 0) {
        sb.push('_Tidak ada jadwal dinas terdata_');
      } else {
        onDuty.forEach((assign, index) => {
          const leaderTag = assign.isLeader ? ' 👑 (PJ Sif)' : '';
          const dutyTag = assign.specialDuty ? ` • [${assign.specialDuty}]` : '';
          const sortedMachines = this.getAssignedMachinesForAssignment(assign, machines);
          const mCodes = sortedMachines.map((m) => m.code).join(', ');
          const mSummary =
            sortedMachines.length > 0
              ? `${mCodes} (${sortedMachines.length} mesin)`
              : 'Belum ada mesin';

          sb.push(`${index + 1}. *${assign.nurseName}*${leaderTag}${dutyTag}`);
          sb.push(`   ↳ Alokasi: ${mSummary}`);
        });
      }
    }

    const dutyHolders = assignments.filter(
      (a) => a.specialDuty && (a.shiftType === 'PAGI' || a.shiftType === 'SIANG')
    );
    if (dutyHolders.length > 0) {
      sb.push('\n🏷️ *PENANGGUNG JAWAB KHUSUS HARI INI:*');
      dutyHolders.forEach((dh) => {
        sb.push(`• *${dh.specialDuty}:* ${dh.nurseName} (Sif ${dh.shiftType})`);
      });
    }

    const offList = assignments.filter((a) => a.shiftType === 'LIBUR');
    if (offList.length > 0) {
      sb.push('\n🌴 *LIBUR / OFF:*');
      sb.push(offList.map((a) => a.nurseName).join(', '));
      sb.push('');
    }

    sb.push('━━━━━━━━━━━━━━━━━━━━━━');
    sb.push('_Mohon hadir 15 menit sebelum operan sif dimulai. Semangat melayani!_ 💉🩺');

    return sb.join('\n');
  }

  /**
   * Calculates priority rank based on the hospital dialysis room's physical layout order:
   * 1. A01 - A12
   * 2. C01 - C04
   * 3. B01 - B09
   * 4. C05 - C09
   */
  static getRoomMachineRank(target: Machine | string | number): number {
    let str = '';
    if (typeof target === 'object' && target !== null) {
      str = target.code || target.name || String(target.id);
    } else {
      str = String(target ?? '');
    }

    str = str.trim().toUpperCase();

    // Match letter (A, B, or C) and digits (e.g. A01, A1, B-05, C04)
    const match =
      str.match(/\b([ABC])\s*[-_]?\s*0*(\d+)\b/) ||
      str.match(/([ABC])\s*[-_]?\s*0*(\d+)/);

    if (match) {
      const letter = match[1];
      const num = parseInt(match[2], 10);

      if (letter === 'A') {
        if (num >= 1 && num <= 12) {
          return num; // A01..A12 -> Ranks 1 .. 12
        }
        return 100 + num; // Any other A
      } else if (letter === 'C') {
        if (num >= 1 && num <= 4) {
          return 12 + num; // C01..C04 -> Ranks 13 .. 16
        } else if (num >= 5 && num <= 9) {
          return 25 + (num - 4); // C05..C09 -> Ranks 26 .. 30 (after B01..B09 which ends at 25)
        }
        return 300 + num; // Any other C
      } else if (letter === 'B') {
        if (num >= 1 && num <= 9) {
          return 16 + num; // B01..B09 -> Ranks 17 .. 25 (after C01..C04 which ends at 16)
        }
        return 200 + num; // Any other B
      }
    }

    // Fallback for M-01 .. M-25 or other numeric patterns
    const numOnly = parseInt(str.replace(/\D/g, ''), 10);
    if (!isNaN(numOnly)) {
      return 1000 + numOnly;
    }

    return 9999;
  }

  /**
   * Helper to retrieve sorted assigned machines for an assignment,
   * safely resolving machine IDs (numeric or string) or machine codes.
   */
  static getAssignedMachinesForAssignment(
    assign: ShiftAssignment,
    machines: Machine[]
  ): Machine[] {
    const ids = assign.assignedMachineIds || [];
    const list: Machine[] = [];
    ids.forEach((mId) => {
      const found = machines.find(
        (m) =>
          m.id === mId ||
          String(m.id) === String(mId) ||
          (m.code && m.code.toLowerCase() === String(mId).toLowerCase()) ||
          (m.code &&
            m.code.replace(/[^A-Za-z0-9]/g, '').toLowerCase() ===
              String(mId).replace(/[^A-Za-z0-9]/g, '').toLowerCase())
      );
      if (found && !list.some((existing) => existing.id === found.id)) {
        list.push(found);
      }
    });
    return this.getSortedMachines(list);
  }

  /**
   * Helper to sort machines in the hospital room's physical order:
   * 1. A01 - A12
   * 2. C01 - C04
   * 3. B01 - B09
   * 4. C05 - C09
   */
  static getSortedMachines(machines: Machine[]): Machine[] {
    return [...machines].sort((a, b) => {
      const rankA = this.getRoomMachineRank(a);
      const rankB = this.getRoomMachineRank(b);
      if (rankA !== rankB) return rankA - rankB;

      if (a.code && b.code) {
        const cmp = a.code.localeCompare(b.code, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        if (cmp !== 0) return cmp;
      }
      return a.id - b.id;
    });
  }

  /**
   * Sorts shift assignments based on the physical room layout sequence of their allocated machines:
   * Nurses allocated lower priority machines (A01-A12 -> C01-C04 -> B01-B09 -> C05-C09) appear first.
   * Nurses without machine allocations are placed at the end.
   */
  static sortAssignmentsByMachineOrder(
    assignments: ShiftAssignment[],
    machines: Machine[]
  ): ShiftAssignment[] {
    const sortedAllMachines = this.getSortedMachines(machines);
    const machineRankMap = new Map<string, number>();
    sortedAllMachines.forEach((m, idx) => {
      machineRankMap.set(String(m.id), idx);
      if (m.code) {
        machineRankMap.set(m.code.toLowerCase(), idx);
        machineRankMap.set(m.code.replace(/[^A-Za-z0-9]/g, '').toLowerCase(), idx);
      }
    });

    const getMachineRanks = (assign: ShiftAssignment): number[] => {
      const assignedMachines = this.getAssignedMachinesForAssignment(assign, machines);
      if (assignedMachines.length === 0) return [Number.MAX_SAFE_INTEGER];

      const ranks = assignedMachines.map((m) => this.getRoomMachineRank(m));
      ranks.sort((a, b) => a - b);
      return ranks.length > 0 ? ranks : [Number.MAX_SAFE_INTEGER];
    };

    return [...assignments].sort((a, b) => {
      const ranksA = getMachineRanks(a);
      const ranksB = getMachineRanks(b);
      const len = Math.max(ranksA.length, ranksB.length);
      for (let i = 0; i < len; i++) {
        const rA = ranksA[i] !== undefined ? ranksA[i] : Number.MAX_SAFE_INTEGER;
        const rB = ranksB[i] !== undefined ? ranksB[i] : Number.MAX_SAFE_INTEGER;
        if (rA !== rB) return rA - rB;
      }
      return a.nurseName.localeCompare(b.nurseName);
    });
  }

  /**
   * Helper to format clean room/bay names.
   */
  static cleanBayName(bay: string): string {
    if (!bay) return 'Reguler';
    return bay
      .replace(' (Reguler)', '')
      .replace('Ruang Khusus ', '')
      .replace('Ruang Isolasi Tekanan Negatif', 'Isolasi')
      .replace('Ruang ', '')
      .trim();
  }

  /**
   * Helper to format machine codes summary cleanly (e.g. M-01 s/d M-04 (4 mesin)).
   */
  static formatMachineSummary(machineCodes: string[]): string {
    if (machineCodes.length === 0) return 'Belum ada mesin';
    if (machineCodes.length <= 2) return `${machineCodes.join(', ')} (${machineCodes.length} mesin)`;

    const nums = machineCodes.map((c) => parseInt(c.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n));
    let isContiguous = nums.length === machineCodes.length;
    if (isContiguous) {
      for (let i = 0; i < nums.length - 1; i++) {
        if (nums[i + 1] !== nums[i] + 1) {
          isContiguous = false;
          break;
        }
      }
    }

    if (isContiguous && machineCodes.length >= 3) {
      return `${machineCodes[0]} s/d ${machineCodes[machineCodes.length - 1]} (${machineCodes.length} mesin)`;
    }
    return `${machineCodes.join(', ')} (${machineCodes.length} mesin)`;
  }

  /**
   * Creates comprehensive daily machine allocation report specifically for Head Nurse (Kepala Ruangan).
   * Formats the list of staff ordered by their machine allocations (e.g. nurse with M-01 first, then M-05, etc.).
   */
  static generateHeadNurseDailyAllocationMessage(
    dateStr: string,
    assignments: ShiftAssignment[],
    machines: Machine[],
    hospitalName: string = 'RS Happy Land Medical Centre',
    roomName: string = 'Ruang Dialisis Gedung Timur Lt.3',
    headNurseName: string = 'Kepala Ruang HD'
  ): string {
    const formattedDate = this.formatIndonesianDate(dateStr);
    const activeMachines = machines.filter((m) => m.status === 'AKTIF');
    const unusedMachines = machines.filter((m) => m.status === 'TIDAK_DIGUNAKAN');
    const maintMachines = machines.filter((m) => m.status === 'MAINTENANCE');
    const brokenMachines = machines.filter((m) => m.status === 'RUSAK');
    const nonActiveMachines = machines.filter((m) => m.status !== 'AKTIF');

    const sb: string[] = [];
    sb.push('📋 *LAPORAN HARIAN PEMBAGIAN MESIN & SIF HEMODIALISA*');
    sb.push(`🏥 *${hospitalName}*`);
    sb.push(`📍 ${roomName}`);
    sb.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    sb.push(`Kepada Yth. *${headNurseName || 'Kepala Ruang Hemodialisa'}*`);
    sb.push(`📅 *Hari / Tanggal:* ${formattedDate}`);

    let capDetails = `📟 *Kapasitas Mesin:* ${machines.length} Mesin Total (${activeMachines.length} Aktif Beroperasi`;
    if (unusedMachines.length > 0) capDetails += `, ${unusedMachines.length} Tidak Digunakan`;
    if (maintMachines.length > 0) capDetails += `, ${maintMachines.length} Maintenance`;
    if (brokenMachines.length > 0) capDetails += `, ${brokenMachines.length} Rusak`;
    capDetails += ')\n';
    sb.push(capDetails);

    // 1. SIF PAGI
    const pagiAssignments = this.sortAssignmentsByMachineOrder(
      assignments.filter((a) => a.shiftType === 'PAGI'),
      machines
    );
    const pagiLeader = pagiAssignments.find((a) => a.isLeader);

    sb.push('🌅 *SIF PAGI (07.00 - 14.00 WIB)*');
    if (pagiLeader) {
      sb.push(`👑 *PJ Sif:* ${pagiLeader.nurseName}`);
    }
    sb.push(`👥 *Jumlah Perawat Dinas:* ${pagiAssignments.length} Orang`);
    sb.push('📊 *Rincian Alokasi Mesin per Perawat (Urut Alokasi Mesin):*');
    if (pagiAssignments.length === 0) {
      sb.push('   _(Belum ada jadwal sif pagi terdata)_');
    } else {
      pagiAssignments.forEach((assign, idx) => {
        const roleTag = assign.isLeader ? ' (PJ Sif)' : '';
        const dutyTag = assign.specialDuty ? ` [PIC: ${assign.specialDuty}]` : '';
        const sortedList = this.getAssignedMachinesForAssignment(assign, machines);
        const mCodes = sortedList.map((m) => m.code).join(', ');
        const mSummary =
          sortedList.length > 0
            ? `${mCodes} (${sortedList.length} mesin)`
            : 'Belum ada mesin';
        sb.push(`   ${idx + 1}. *${assign.nurseName}*${roleTag}${dutyTag}`);
        sb.push(`      ↳ Alokasi: ${mSummary}`);
      });
    }
    sb.push('');

    // 2. SIF SIANG
    const siangAssignments = this.sortAssignmentsByMachineOrder(
      assignments.filter((a) => a.shiftType === 'SIANG'),
      machines
    );
    const siangLeader = siangAssignments.find((a) => a.isLeader);

    sb.push('🌇 *SIF SIANG (12.00 - 19.00 WIB)*');
    if (siangLeader) {
      sb.push(`👑 *PJ Sif:* ${siangLeader.nurseName}`);
    }
    sb.push(`👥 *Jumlah Perawat Dinas:* ${siangAssignments.length} Orang`);
    sb.push('📊 *Rincian Alokasi Mesin per Perawat (Urut Alokasi Mesin):*');
    if (siangAssignments.length === 0) {
      sb.push('   _(Belum ada jadwal sif siang terdata)_');
    } else {
      siangAssignments.forEach((assign, idx) => {
        const roleTag = assign.isLeader ? ' (PJ Sif)' : '';
        const dutyTag = assign.specialDuty ? ` [PIC: ${assign.specialDuty}]` : '';
        const sortedList = this.getAssignedMachinesForAssignment(assign, machines);
        const mCodes = sortedList.map((m) => m.code).join(', ');
        const mSummary =
          sortedList.length > 0
            ? `${mCodes} (${sortedList.length} mesin)`
            : 'Belum ada mesin';
        sb.push(`   ${idx + 1}. *${assign.nurseName}*${roleTag}${dutyTag}`);
        sb.push(`      ↳ Alokasi: ${mSummary}`);
      });
    }
    sb.push('');

    // 3. PENANGGUNG JAWAB KHUSUS (PIC) BERTUGAS HARI INI
    const onDutyHolders = assignments.filter(
      (a) => a.specialDuty && (a.shiftType === 'PAGI' || a.shiftType === 'SIANG')
    );
    if (onDutyHolders.length > 0) {
      sb.push('🏷️ *PENANGGUNG JAWAB KHUSUS (PIC) BERTUGAS HARI INI:*');
      onDutyHolders.forEach((dh) => {
        sb.push(`• *${dh.specialDuty}:* ${dh.nurseName} (Sif ${dh.shiftType})`);
      });
      sb.push('');
    }

    // 4. STATUS LIBUR / CUTI / SAKIT
    const offList = assignments.filter((a) => a.shiftType === 'LIBUR');
    const cutiList = assignments.filter((a) => a.shiftType === 'CUTI');
    const sakitList = assignments.filter((a) => a.shiftType === 'SAKIT');

    if (offList.length > 0 || cutiList.length > 0 || sakitList.length > 0) {
      sb.push('🌴 *STATUS TIDAK BERDINAS:*');
      if (offList.length > 0) {
        sb.push(`• Libur/Off (${offList.length}): ${offList.map((a) => a.nurseName).join(', ')}`);
      }
      if (cutiList.length > 0) {
        sb.push(`• Cuti (${cutiList.length}): ${cutiList.map((a) => a.nurseName).join(', ')}`);
      }
      if (sakitList.length > 0) {
        sb.push(`• Sakit/Izin (${sakitList.length}): ${sakitList.map((a) => a.nurseName).join(', ')}`);
      }
      sb.push('');
    }

    // 4. STATUS MESIN NON-AKTIF
    if (nonActiveMachines.length > 0) {
      sb.push('⚠️ *STATUS MESIN NON-AKTIF / STANDBY / MAINTENANCE:*');
      nonActiveMachines.forEach((m) => {
        const noteStr = m.notes ? ` [${m.notes}]` : '';
        sb.push(`• ${m.code} (${m.name}) - *${m.status}*${noteStr}`);
      });
      sb.push('');
    }

    sb.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    sb.push('_Laporan otomatis dibuat dari Sistem Jadwal & Alokasi HemoShift HD._');

    return sb.join('\n');
  }

  /**
   * Detects whether the current client is a mobile device (Android, iOS, iPad).
   */
  static isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      navigator.userAgent || ''
    );
  }

  /**
   * Copies text cleanly to clipboard with automatic fallback.
   */
  static async copyToClipboard(text: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Continue to fallback
      }
    }

    if (typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Generates a safe, UTF-8 encoded WhatsApp URL (api.whatsapp.com or web.whatsapp.com).
   * Note: We avoid whatsapp:// custom scheme because it does not support multi-byte UTF-8 encoding on mobile OS,
   * which causes emojis (🏥, 📍, 📋, etc.) to be converted into replacement characters ().
   */
  static getWhatsAppUrl(
    phoneNumber?: string | null,
    message: string = '',
    options?: { preferWebWhatsApp?: boolean }
  ): string {
    const cleaned = this.cleanPhoneNumberForWhatsApp(phoneNumber);
    const encoded = encodeURIComponent(message);

    if (options?.preferWebWhatsApp) {
      if (cleaned) {
        return `https://web.whatsapp.com/send?phone=${cleaned}&text=${encoded}`;
      }
      return `https://web.whatsapp.com/send?text=${encoded}`;
    }

    if (cleaned) {
      return `https://api.whatsapp.com/send?phone=${cleaned}&text=${encoded}`;
    }
    return `https://api.whatsapp.com/send?text=${encoded}`;
  }

  /**
   * Opens WhatsApp directly with target phone number and prefilled message.
   * Uses verified Universal Links (api.whatsapp.com) to ensure 100% UTF-8 emoji support
   * without converting emojis like 🏥, 📍, 📋 into .
   * Also copies text to clipboard as an automatic backup.
   */
  static openWhatsApp(
    phoneNumber: string | undefined | null,
    message: string,
    preferDesktopWeb: boolean = false
  ): boolean {
    // 1. Always copy text to clipboard as a safety net
    this.copyToClipboard(message);

    const isMobile = this.isMobileDevice();
    const targetUrl = this.getWhatsAppUrl(phoneNumber, message, { preferWebWhatsApp: preferDesktopWeb });

    // 2. Mobile Strategy:
    // Using https://api.whatsapp.com triggers Android App Links / iOS Universal Links
    // directly opening the WhatsApp app with full UTF-8 emoji fidelity.
    if (isMobile && !preferDesktopWeb) {
      try {
        window.location.href = targetUrl;
        return true;
      } catch {
        // Fallback to window.open
        window.open(targetUrl, '_blank');
        return true;
      }
    }

    // 3. Desktop Strategy: Open web or desktop link in a new tab
    try {
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        // Fallback if browser blocked popup: use link click
        const a = document.createElement('a');
        a.href = targetUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            if (document.body.contains(a)) document.body.removeChild(a);
          } catch {}
        }, 500);
      }
      return true;
    } catch {
      window.location.href = targetUrl;
      return true;
    }
  }

  /**
   * Shares message via navigator.share or copies to clipboard.
   */
  static async shareOrCopy(message: string, title: string = 'Jadwal & Alokasi Mesin HD'): Promise<boolean> {
    // Try copying to clipboard first
    await this.copyToClipboard(message);

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: message,
        });
        return true;
      } catch {
        return true;
      }
    }

    return true;
  }
}
