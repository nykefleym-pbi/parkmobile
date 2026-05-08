import { Booking } from './types';
   import { totalOwed, totalPaid, remaining } from './booking-utils';
   import { isoDate, today } from './helpers';

   export function exportTicketsCSV(list: Booking[]) {
     const rows = [
       ['Booking', 'Slot', 'Resident', 'Block/Lot', 'Email', 'Plate', 'Vehicle', 'Start', 'End', 'Status', 'Owed', 'Paid', 'Balance'],
       ...list.map(b => [
         b.id, b.slotId, b.userName, b.userBlklot, b.userEmail, b.car.plate, b.car.name,
         b.startDate, b.endDate, b.status,
         totalOwed(b), totalPaid(b), remaining(b),
       ]),
     ];
     downloadCSV(rows, `tickets-${isoDate(today())}.csv`);
   }

   function downloadCSV(rows: (string | number)[][], filename: string) {
     const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
     const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url; a.download = filename; a.click();
     URL.revokeObjectURL(url);
   }
