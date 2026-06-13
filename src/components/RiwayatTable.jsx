// src/components/RiwayatTable.jsx
// DataTable riwayat sampah — TanStack Table v8
// Fitur: search, filter waktu, sort kolom, pagination, export Excel & PDF

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileSpreadsheet, FileText, Camera, Filter,
} from 'lucide-react';

// ─── Helper ───────────────────────────────────────────────────────────────────
const formatTgl = (date) => {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const FILTER_WAKTU = [
  { label: 'Semua', value: 'semua' },
  { label: 'Minggu Ini', value: 'minggu' },
  { label: 'Bulan Ini', value: 'bulan' },
  { label: 'Tahun Ini', value: 'tahun' },
];

const BADGE_CONFIG = {
  Organik:   { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', icon: '🌿' },
  Anorganik: { bg: 'bg-blue-100',  border: 'border-blue-400',  text: 'text-blue-800',  icon: '♻️' },
  B3:        { bg: 'bg-red-100',   border: 'border-red-400',   text: 'text-red-800',   icon: '⚠️' },
};

const BadgeMini = ({ jenis }) => {
  const c = BADGE_CONFIG[jenis] || BADGE_CONFIG['Anorganik'];
  return (
    <span className={`inline-flex items-center gap-1 ${c.bg} ${c.border} border ${c.text} text-sm font-bold px-2.5 py-1 rounded-lg whitespace-nowrap`}>
      {c.icon} {jenis}
    </span>
  );
};

// ─── Filter data berdasarkan periode ──────────────────────────────────────────
function filterByWaktu(data, filter) {
  if (filter === 'semua') return data;
  const now = new Date();
  return data.filter((row) => {
    const d = row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp);
    if (filter === 'minggu') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return d >= startOfWeek;
    }
    if (filter === 'bulan') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (filter === 'tahun') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function RiwayatTable({ data = [] }) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [filterWaktu, setFilterWaktu] = useState('semua');
  const [sorting, setSorting] = useState([{ id: 'timestamp', desc: true }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Terapkan filter waktu sebelum masuk ke TanStack Table
  const filteredByWaktu = useMemo(() => filterByWaktu(data, filterWaktu), [data, filterWaktu]);

  // Definisi kolom
  const columns = useMemo(() => [
    {
      id: 'no',
      header: 'No',
      size: 52,
      enableSorting: false,
      cell: ({ row, table }) => {
        const pageIndex = table.getState().pagination.pageIndex;
        const pageSize = table.getState().pagination.pageSize;
        return (
          <span className="text-gray-500 font-semibold text-sm">
            {pageIndex * pageSize + row.index + 1}
          </span>
        );
      },
    },
    {
      id: 'foto',
      header: 'Foto',
      size: 64,
      enableSorting: false,
      cell: ({ row }) => {
        const b64 = row.original.imageBase64;
        return b64 ? (
          <img
            src={`data:image/jpeg;base64,${b64}`}
            alt="sampah"
            className="w-12 h-12 object-cover rounded-xl shadow-sm"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <Camera size={20} className="text-gray-300" />
          </div>
        );
      },
    },
    {
      accessorKey: 'namaSampah',
      header: 'Nama Sampah',
      cell: ({ getValue }) => (
        <span className="font-bold text-gray-800 text-base">{getValue()}</span>
      ),
    },
    {
      accessorKey: 'jenisSampah',
      header: 'Jenis',
      size: 130,
      cell: ({ getValue }) => <BadgeMini jenis={getValue()} />,
    },
    {
      id: 'jumlahSatuan',
      header: 'Jumlah',
      size: 110,
      accessorFn: (row) => `${row.jumlah ?? '-'} ${row.satuan ?? ''}`.trim(),
      cell: ({ row }) => {
        const j = row.original.jumlah;
        const s = row.original.satuan;
        if (!j && !s) return <span className="text-gray-400 text-sm">-</span>;
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 font-black text-sm px-2.5 py-1 rounded-lg whitespace-nowrap">
            ⚖️ {j} {s}
          </span>
        );
      },
    },
    {
      accessorKey: 'catatan',
      header: 'Catatan',
      cell: ({ getValue }) => (
        <span className="text-gray-500 text-sm italic">
          {getValue() || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'timestamp',
      header: 'Tanggal & Waktu',
      size: 170,
      cell: ({ getValue }) => (
        <span className="text-gray-600 text-sm font-semibold whitespace-nowrap">
          {formatTgl(getValue())}
        </span>
      ),
      sortingFn: 'datetime',
    },
  ], []);

  const table = useReactTable({
    data: filteredByWaktu,
    columns,
    state: { globalFilter, sorting, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = filterValue.toLowerCase();
      return (
        row.original.namaSampah?.toLowerCase().includes(q) ||
        row.original.jenisSampah?.toLowerCase().includes(q) ||
        row.original.deskripsi?.toLowerCase().includes(q)
      );
    },
  });

  // ── Export Excel ─────────────────────────────────────────────────────────────
  const exportExcel = () => {
    const rows = table.getFilteredRowModel().rows.map((row, i) => ({
      'No': i + 1,
      'Nama Sampah': row.original.namaSampah,
      'Jenis Sampah': row.original.jenisSampah,
      'Jumlah': row.original.jumlah ?? '-',
      'Satuan': row.original.satuan ?? '-',
      'Catatan': row.original.catatan || '-',
      'Tanggal': formatTgl(row.original.timestamp),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 }, { wch: 28 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 35 }, { wch: 22 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Sampah');

    const label = filterWaktu === 'semua' ? 'Semua' :
      filterWaktu === 'minggu' ? 'Minggu-Ini' :
      filterWaktu === 'bulan' ? `Bulan-${new Date().toLocaleString('id-ID',{month:'long'})}` :
      `Tahun-${new Date().getFullYear()}`;
    XLSX.writeFile(wb, `PilahPinter_Riwayat_${label}.xlsx`);
  };

  // ── Export PDF ────────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PilahPinter — Laporan Riwayat Sampah', 14, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}`, 14, 22);

    const rows = table.getFilteredRowModel().rows.map((row, i) => [
      i + 1,
      row.original.namaSampah,
      row.original.jenisSampah,
      `${row.original.jumlah ?? '-'} ${row.original.satuan ?? ''}`.trim(),
      row.original.catatan || '-',
      formatTgl(row.original.timestamp),
    ]);

    autoTable(doc, {
      startY: 27,
      head: [['No', 'Nama Sampah', 'Jenis', 'Jumlah', 'Catatan', 'Tanggal & Waktu']],
      body: rows,
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: [22, 163, 74],  // hijau
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 55 },
        2: { halign: 'center', cellWidth: 35 },
        3: { cellWidth: 80 },
        4: { cellWidth: 45 },
      },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      didDrawCell: (data) => {
        // Warna badge jenis sampah
        if (data.section === 'body' && data.column.index === 2) {
          const val = data.cell.raw;
          const colors = {
            Organik:   [134, 239, 172],
            Anorganik: [147, 197, 253],
            B3:        [252, 165, 165],
          };
          if (colors[val]) {
            doc.setFillColor(...colors[val]);
            doc.roundedRect(data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2, 2, 2, 'F');
            doc.setFontSize(9);
            doc.setTextColor(30, 30, 30);
            doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
          }
        }
      },
    });

    // Footer halaman
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Halaman ${i} dari ${pageCount} — PilahPinter`, 14, doc.internal.pageSize.height - 8);
    }

    const label = filterWaktu === 'semua' ? 'Semua' :
      filterWaktu === 'minggu' ? 'Minggu-Ini' :
      filterWaktu === 'bulan' ? `Bulan-${new Date().toLocaleString('id-ID',{month:'long'})}` :
      `Tahun-${new Date().getFullYear()}`;
    doc.save(`PilahPinter_Riwayat_${label}.pdf`);
  };

  // ── Icon sort ─────────────────────────────────────────────────────────────────
  const SortIcon = ({ col }) => {
    if (!col.getCanSort()) return null;
    const sorted = col.getIsSorted();
    if (sorted === 'asc')  return <ChevronUp size={14} className="text-green-600 inline ml-1" />;
    if (sorted === 'desc') return <ChevronDown size={14} className="text-green-600 inline ml-1" />;
    return <ChevronsUpDown size={14} className="text-gray-300 inline ml-1" />;
  };

  const totalFiltered = table.getFilteredRowModel().rows.length;
  const jmlOrganiK   = filteredByWaktu.filter(r => r.jenisSampah === 'Organik').length;
  const jmlAnorganik = filteredByWaktu.filter(r => r.jenisSampah === 'Anorganik').length;
  const jmlB3        = filteredByWaktu.filter(r => r.jenisSampah === 'B3').length;

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
      {/* ── Header Tabel ────────────────────────────────────────────────────── */}
      <div className="p-5 border-b border-gray-100 space-y-4">
        {/* Baris 1: Judul + Export */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-gray-800">Riwayat Catatan Sampah</h3>
            <p className="text-sm text-gray-500 font-semibold mt-0.5">
              {totalFiltered} catatan ditemukan
              {globalFilter && ` untuk "${globalFilter}"`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              id="btn-export-excel"
              onClick={exportExcel}
              disabled={totalFiltered === 0}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 active:scale-95 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <FileSpreadsheet size={18} /> Excel
            </button>
            <button
              id="btn-export-pdf"
              onClick={exportPDF}
              disabled={totalFiltered === 0}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 active:scale-95 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <FileText size={18} /> PDF
            </button>
          </div>
        </div>

        {/* Statistik Mini */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
            <p className="text-2xl font-black text-green-700">{jmlOrganiK}</p>
            <p className="text-xs font-bold text-green-600">🌿 Organik</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-center">
            <p className="text-2xl font-black text-blue-700">{jmlAnorganik}</p>
            <p className="text-xs font-bold text-blue-600">♻️ Anorganik</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-center">
            <p className="text-2xl font-black text-red-700">{jmlB3}</p>
            <p className="text-xs font-bold text-red-600">⚠️ B3</p>
          </div>
        </div>

        {/* Baris 2: Search + Filter Waktu */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="input-search-riwayat"
              type="text"
              value={globalFilter}
              onChange={(e) => { setGlobalFilter(e.target.value); setPagination(p => ({ ...p, pageIndex: 0 })); }}
              placeholder="Cari nama sampah, jenis..."
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 focus:border-green-400 rounded-xl text-base font-semibold text-gray-700 placeholder:text-gray-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Filter Waktu */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <Filter size={15} className="text-gray-400 ml-1" />
            {FILTER_WAKTU.map((f) => (
              <button
                key={f.value}
                id={`btn-filter-${f.value}`}
                onClick={() => { setFilterWaktu(f.value); setPagination(p => ({ ...p, pageIndex: 0 })); }}
                className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-all ${
                  filterWaktu === f.value
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Rows per page */}
          <select
            id="select-rows-per-page"
            value={pagination.pageSize}
            onChange={(e) => { table.setPageSize(Number(e.target.value)); setPagination(p => ({ ...p, pageIndex: 0 })); }}
            className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 focus:outline-none focus:border-green-400 bg-white"
          >
            {[5, 10, 25, 50].map(n => (
              <option key={n} value={n}>{n} baris</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Tabel ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-100">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={`px-4 py-3 text-left text-sm font-black text-gray-600 uppercase tracking-wide whitespace-nowrap select-none ${
                      header.column.getCanSort() ? 'cursor-pointer hover:text-green-700 hover:bg-green-50 transition-colors' : ''
                    }`}
                    style={{ width: header.column.columnDef.size }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <SortIcon col={header.column} />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16">
                  <div className="text-4xl mb-3">🗂️</div>
                  <p className="text-gray-500 font-bold text-lg">
                    {globalFilter ? `Tidak ada hasil untuk "${globalFilter}"` : 'Belum ada catatan'}
                  </p>
                  {globalFilter && (
                    <button onClick={() => setGlobalFilter('')} className="mt-3 text-green-600 font-bold underline text-sm">
                      Hapus pencarian
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-50 hover:bg-green-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {table.getPageCount() > 0 && (
        <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          {/* Info */}
          <p className="text-sm font-semibold text-gray-500">
            Menampilkan{' '}
            <span className="text-gray-800 font-black">
              {pagination.pageIndex * pagination.pageSize + 1}–{Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalFiltered)}
            </span>
            {' '}dari{' '}
            <span className="text-gray-800 font-black">{totalFiltered}</span> catatan
          </p>

          {/* Tombol navigasi */}
          <div className="flex items-center gap-1">
            <PageBtn id="btn-page-first"    onClick={() => table.firstPage()}    disabled={!table.getCanPreviousPage()} icon={<ChevronsLeft size={16} />} />
            <PageBtn id="btn-page-prev"     onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} icon={<ChevronLeft  size={16} />} />

            {/* Nomor halaman */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(table.getPageCount(), 5) }, (_, i) => {
                let pageNum;
                const total = table.getPageCount();
                const cur   = pagination.pageIndex;
                if (total <= 5) { pageNum = i; }
                else if (cur < 3) { pageNum = i; }
                else if (cur > total - 3) { pageNum = total - 5 + i; }
                else { pageNum = cur - 2 + i; }
                return (
                  <button
                    key={pageNum}
                    id={`btn-page-${pageNum + 1}`}
                    onClick={() => table.setPageIndex(pageNum)}
                    className={`w-9 h-9 rounded-xl text-sm font-black transition-all ${
                      pagination.pageIndex === pageNum
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>

            <PageBtn id="btn-page-next"  onClick={() => table.nextPage()}   disabled={!table.getCanNextPage()} icon={<ChevronRight  size={16} />} />
            <PageBtn id="btn-page-last"  onClick={() => table.lastPage()}   disabled={!table.getCanNextPage()} icon={<ChevronsRight size={16} />} />
          </div>
        </div>
      )}
    </div>
  );
}

// Tombol navigasi kecil
const PageBtn = ({ id, onClick, disabled, icon }) => (
  <button
    id={id}
    onClick={onClick}
    disabled={disabled}
    className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-gray-700 transition-all active:scale-90"
  >
    {icon}
  </button>
);
