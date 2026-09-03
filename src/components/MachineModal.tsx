import React, { useState, useEffect } from 'react';
import { Machine, MachineCategory, MachineStatus, MACHINE_CATEGORY_INFO, MACHINE_STATUS_INFO } from '../types';
import { X, Cpu, Layers, Activity, FileText, Trash2 } from 'lucide-react';

interface MachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (machine: Omit<Machine, 'id'> | Machine) => void;
  onDelete?: (machine: Machine) => void;
  machine?: Machine | null;
}

export const MachineModal: React.FC<MachineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  machine,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [bay, setBay] = useState('Bay A (Reguler)');
  const [category, setCategory] = useState<MachineCategory>('REGULER');
  const [status, setStatus] = useState<MachineStatus>('AKTIF');
  const [brandModel, setBrandModel] = useState('Fresenius 4008S');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (machine) {
      setCode(machine.code);
      setName(machine.name);
      setBay(machine.bay);
      setCategory(machine.category);
      setStatus(machine.status);
      setBrandModel(machine.brandModel);
      setNotes(machine.notes || '');
    } else {
      setCode('M-');
      setName('');
      setBay('Bay A (Reguler)');
      setCategory('REGULER');
      setStatus('AKTIF');
      setBrandModel('Fresenius 4008S');
      setNotes('');
    }
  }, [machine, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    if (machine) {
      onSave({
        ...machine,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        bay: bay.trim(),
        category,
        status,
        brandModel: brandModel.trim(),
        notes: notes.trim(),
      });
    } else {
      onSave({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        bay: bay.trim(),
        category,
        status,
        brandModel: brandModel.trim(),
        notes: notes.trim(),
      });
    }
    onClose();
  };

  const bayOptions = [
    'Bay A (Reguler)',
    'Bay B (Reguler)',
    'Bay C (Reguler)',
    'Ruang Khusus Hepatitis B',
    'Ruang Khusus Hepatitis C',
    'Ruang Isolasi Tekanan Negatif',
    'VIP Dialysis Room',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        id="machine-modal-dialog"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">
                {machine ? 'Ubah Data Mesin HD' : 'Tambah Mesin Dialisis'}
              </h3>
              <p className="text-xs text-slate-500">Unit Hemodialisa (25 Bed Total)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Mesin *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="misal: M-01"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Display Bed / Mesin *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="misal: Mesin HD 01"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Zona / Ruang / Bay
              </label>
              <div className="relative">
                <select
                  value={bay}
                  onChange={(e) => setBay(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 appearance-none font-medium"
                >
                  {bayOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori Infeksius / Khusus
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MachineCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
              >
                {Object.entries(MACHINE_CATEGORY_INFO).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Operasional
              </label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MachineStatus)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
                >
                  {Object.entries(MACHINE_STATUS_INFO).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
                <Activity className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Merk & Model Mesin
              </label>
              <input
                type="text"
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                placeholder="Fresenius 4008S, Nipro Surdial, B.Braun"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Khusus / Maintenance Log
            </label>
            <div className="relative">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="misal: Kalibrasi pompa heparin tgl 12, RO filter baru..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
            <div>
              {machine && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete(machine);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Mesin
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-500/30 transition-colors"
              >
                {machine ? 'Simpan Perubahan' : 'Tambah Mesin'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
