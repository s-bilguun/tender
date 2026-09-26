import { TenderItem } from './types';

export function exportTendersToCSV(tenders: TenderItem[], filename = 'tender-export.csv') {
  if (!tenders || tenders.length === 0) return;

  const headers = [
    'Тендерийн код',
    'Тендерийн нэр',
    'Захиалагч байгууллага',
    'Төсөвт өртөг (₮)',
    'Тендерийн баталгаа (₮)',
    'Эхлэх огноо',
    'Дуусах огноо',
    'Статус',
    'Холбоос'
  ];

  const rows = tenders.map((t) => [
    `"${(t.tenderCode || t.invitationNumber || '').replace(/"/g, '""')}"`,
    `"${(t.tenderName || '').replace(/"/g, '""')}"`,
    `"${(t.budgetEntityName || '').replace(/"/g, '""')}"`,
    t.totalBudget || 0,
    t.yearBudget || 0,
    `"${t.publishDate || ''}"`,
    `"${t.receiveDate || ''}"`,
    `"${(t.docStatusName || '').replace(/"/g, '""')}"`,
    `"${typeof window !== 'undefined' ? `${window.location.origin}/tender/${t.invitationId}` : ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
