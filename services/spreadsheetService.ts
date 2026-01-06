
import Papa from 'papaparse';
import { Assignment, Station } from '../types';

// ID Spreadsheet yang Anda berikan
const SHEET_ID = '1NSFmEGm3i1RgLCt1tSIaP9lYlfe8fnMMrsHeke_ZCiI';

/**
 * Fungsi ini menggunakan Google Visualization Query (gviz/tq) 
 * yang memungkinkan pengambilan data berdasarkan NAMA SHEET secara langsung.
 */
export const fetchSpreadsheetData = async (station: Station): Promise<Assignment[]> => {
  // Menggunakan endpoint gviz/tq dengan parameter sheet=NAMA_STATION
  const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(station)}`;

  try {
    const response = await fetch(CSV_URL);
    
    if (!response.ok) {
      throw new Error(`Sheet '${station}' tidak ditemukan atau spreadsheet tidak dapat diakses.`);
    }
    
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length === 0) {
            resolve([]);
            return;
          }

          const assignments: Assignment[] = results.data.map((row: any, index: number) => {
            const courierName = row['Nama Kurir'] || row['nama_kurir'] || 'Tanpa Nama';
            const packageCount = parseInt(row['Jumlah Paket'] || row['jumlah_paket']) || 0;
            const taskId = row['Task ID'] || row['task_id'] || `TASK-${station}-${index + 1}`;
            const statusStr = (row['Status'] || 'Pending').trim();
            const lastUpdated = row['Update Terakhir'] || row['update_terakhir'] || '-';

            return {
              id: `${station}-${index}`,
              courierName,
              packageCount,
              station: station,
              taskId,
              status: (['Pending', 'Ongoing', 'Completed'].includes(statusStr) ? statusStr : 'Pending') as any,
              lastUpdated
            };
          });
          
          const validAssignments = assignments.filter(a => a.courierName !== 'Tanpa Nama' || a.packageCount > 0);
          resolve(validAssignments);
        },
        error: (error: any) => {
          console.error(`Gagal memproses data CSV untuk ${station}:`, error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error(`Error fetching data for ${station}:`, error);
    throw error;
  }
};
