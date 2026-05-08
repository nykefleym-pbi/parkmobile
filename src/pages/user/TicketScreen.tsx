import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { fmtDate, formatPeso } from '@/lib/helpers';
import { baseFee, penaltyAmt, totalOwed, totalPaid, remaining, isFullyPaid, isPartiallyPaid } from '@/lib/booking-utils';
import { Check, ArrowLeft } from 'lucide-react';

// ---------- Self-contained QR code generator (no dependency) ----------
// Implements QR Code Model 2, error correction level M, byte mode.
// Adequate for short payloads like booking IDs.
function generateQRMatrix(text: string): boolean[][] {
  const data = new TextEncoder().encode(text);
  // Pick smallest version that fits. Version 3 (29x29) holds ~84 bytes at level M.
  // Booking payload is ~40 bytes — version 2 (25x25) is enough.
  const version = data.length <= 14 ? 1 : data.length <= 26 ? 2 : data.length <= 42 ? 3 : 4;
  const size = 17 + version * 4;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Place finder patterns at three corners
  const placeFinder = (r: number, c: number) => {
    for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
      const rr = r + i, cc = c + j;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      reserved[rr][cc] = true;
      const inOuter = i >= 0 && i <= 6 && (j === 0 || j === 6) || j >= 0 && j <= 6 && (i === 0 || i === 6);
      const inInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      matrix[rr][cc] = inOuter || inInner;
    }
  };
  placeFinder(0, 0); placeFinder(0, size - 7); placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0; reserved[6][i] = true;
    matrix[i][6] = i % 2 === 0; reserved[i][6] = true;
  }
  // Dark module
  matrix[size - 8][8] = true; reserved[size - 8][8] = true;
  // Format info area reservation
  for (let i = 0; i < 9; i++) { reserved[8][i] = true; reserved[i][8] = true; }
  for (let i = 0; i < 8; i++) { reserved[8][size - 1 - i] = true; reserved[size - 1 - i][8] = true; }

  // Encode data: byte mode, error correction M
  const bits: number[] = [];
  // Mode indicator (4 bits): byte = 0100
  bits.push(0, 1, 0, 0);
  // Character count (8 bits for v1-9 byte mode)
  for (let i = 7; i >= 0; i--) bits.push((data.length >> i) & 1);
  // Data bytes
  for (const b of data) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  // Terminator
  bits.push(0, 0, 0, 0);

  // Capacity in data codewords for level M
  const capacities = [16, 28, 44, 64];
  const totalDataBytes = capacities[version - 1];
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);
  // Convert to bytes
  const dataBytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    dataBytes.push(b);
  }
  // Pad with alternating 236, 17
  let pad = 0;
  while (dataBytes.length < totalDataBytes) { dataBytes.push(pad === 0 ? 236 : 17); pad = 1 - pad; }

  // Reed-Solomon error correction
  const ecBytesPerVersion = [10, 16, 26, 18]; // level M, blocks 1
  const ecBytes = ecBytesPerVersion[version - 1];
  const rsBytes = reedSolomon(dataBytes, ecBytes);
  const allBytes = [...dataBytes, ...rsBytes];

  // Convert back to bits
  const finalBits: number[] = [];
  for (const b of allBytes) for (let i = 7; i >= 0; i--) finalBits.push((b >> i) & 1);

  // Place data bits in matrix (zigzag from bottom-right)
  let bitIdx = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (!reserved[row][cc]) {
          matrix[row][cc] = bitIdx < finalBits.length ? finalBits[bitIdx] === 1 : false;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  // Apply mask pattern 0: (row + col) % 2 === 0
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if (!reserved[r][c]) matrix[r][c] = matrix[r][c] !== ((r + c) % 2 === 0);
  }

  // Place format info (level M = 00, mask 0, BCH-encoded = 0x5412)
  const formatBits = 0x5412;
  for (let i = 0; i < 15; i++) {
    const bit = (formatBits >> (14 - i)) & 1;
    const on = bit === 1;
    if (i < 6) matrix[i][8] = on;
    else if (i < 8) matrix[i + 1][8] = on;
    else if (i < 9) matrix[8][7] = on;
    else matrix[8][14 - i] = on;

    if (i < 8) matrix[8][size - 1 - i] = on;
    else matrix[size - 15 + i][8] = on;
  }

  return matrix.map(row => row.map(v => v === true));
}

// Galois field arithmetic for Reed-Solomon (GF(256) with primitive poly 0x11D)
const GF_EXP: number[] = new Array(512);
const GF_LOG: number[] = new Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) { GF_EXP[i] = x; GF_LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function reedSolomon(data: number[], ecLen: number): number[] {
  // Generator polynomial
  let gen = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= GF_EXP[(GF_LOG[gen[j]] + i) % 255];
    }
    gen = next;
  }
  // Polynomial division
  const buf = [...data, ...new Array(ecLen).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = buf[i];
    if (coef !== 0) {
      const logCoef = GF_LOG[coef];
      for (let j = 0; j < gen.length; j++) {
        buf[i + j] ^= GF_EXP[(GF_LOG[gen[j]] + logCoef) % 255];
      }
    }
  }
  return buf.slice(data.length);
}
// ---------- End QR generator ----------

export default function TicketScreen() {
  const { bookings, setActiveTab, setScreen } = useApp();
  const bk = bookings[bookings.length - 1];
  const [qrSvg, setQrSvg] = useState<string>('');

  useEffect(() => {
    if (!bk) return;
    try {
      const payload = JSON.stringify({ v: 1, id: bk.id, slot: bk.slotId });
      const matrix = generateQRMatrix(payload);
      const size = matrix.length;
      const cell = 6;
      const margin = cell * 2;
      const total = size * cell + margin * 2;
      let rects = '';
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        if (matrix[r][c]) {
          rects += `<rect x="${margin + c * cell}" y="${margin + r * cell}" width="${cell}" height="${cell}" fill="#1A1A18"/>`;
        }
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="160" height="160" style="border-radius: 12px; background: #fff;"><rect width="${total}" height="${total}" fill="#fff"/>${rects}</svg>`;
      setQrSvg(svg);
    } catch {
      setQrSvg('');
    }
  }, [bk]);

  if (!bk) return null;

  return (
    <div className="pa-screen-content">
      <div className="pa-sbar" style={{ justifyContent: 'space-between' }}>
        <button className="pa-back pa-fu" onClick={() => { setActiveTab('search'); setScreen('home'); }}>
          <ArrowLeft size={18} /> Home
        </button>
        <button
          className="pa-tk-link"
          onClick={() => { setActiveTab('bookings'); setScreen('home'); }}
        >
          My Bookings →
        </button>
      </div>
      <div className="pa-tc">
        <div className="pa-tk-top-row pa-pop" style={{ justifyContent: 'center' }}>
          <div className="pa-sc-chk">
            <Check size={22} stroke="var(--pa-grn)" strokeWidth={2.5} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600 }}>Booking confirmed</p>
        </div>
        <div className="pa-ticket pa-fu pa-d1">
          <div className="pa-tkhd">
            <h2>Parking Pass</h2>
            <div className="pa-sn">{bk.slotId}</div>
          </div>
          <div className="pa-tk-div">
            <div className="pa-tk-notch l" /><div className="pa-tk-notch r" />
          </div>
          <div className="pa-tkbd">
            <div className="pa-tkr"><div className="pa-tkf"><label>Location</label><p>{bk.locName}</p></div></div>
            <div className="pa-tkr">
              <div className="pa-tkf"><label>Start</label><p>{fmtDate(bk.startDate)}</p></div>
              <div className="pa-tkf" style={{ textAlign: 'right' }}><label>Expires</label><p>{fmtDate(bk.endDate)}</p></div>
            </div>
            <div className="pa-tkr">
              <div className="pa-tkf"><label>Vehicle</label><p>{bk.car.name}</p></div>
              <div className="pa-tkf" style={{ textAlign: 'right' }}><label>Plate</label><p>{bk.car.plate}</p></div>
            </div>
            {penaltyAmt(bk) > 0 && bk.penalty && (
              <div className="pa-tkr">
                <div className="pa-tkf"><label>Penalty ({bk.penalty.days}d)</label><p style={{ color: '#EF6C00' }}>{formatPeso(penaltyAmt(bk))}</p></div>
                <div className="pa-tkf" style={{ textAlign: 'right' }}><label>Total Owed</label><p style={{ color: 'var(--pa-red)' }}>{formatPeso(totalOwed(bk))}</p></div>
              </div>
            )}
            {totalPaid(bk) > 0 && (
              <div className="pa-tkr">
                <div className="pa-tkf"><label>Paid</label><p style={{ color: 'var(--pa-grn)' }}>{formatPeso(totalPaid(bk))}</p></div>
                <div className="pa-tkf" style={{ textAlign: 'right' }}><label>Balance</label><p style={{ color: remaining(bk) > 0 ? 'var(--pa-red)' : 'var(--pa-grn)' }}>{formatPeso(remaining(bk))}</p></div>
              </div>
            )}
            <div className="pa-tkr">
              <div className="pa-tkf"><label>Total</label><p>{formatPeso(baseFee(bk))}</p></div>
              <div className="pa-tkf" style={{ textAlign: 'right' }}><label>Status</label><p style={{ color: isFullyPaid(bk) ? 'var(--pa-grn)' : isPartiallyPaid(bk) ? '#EF6C00' : 'var(--pa-red)' }}>{isFullyPaid(bk) ? 'Paid' : isPartiallyPaid(bk) ? 'Partial' : 'Unpaid'}</p></div>
            </div>
            <div className="pa-qr-wrap">
              {qrSvg ? (
                <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
              ) : (
                <div style={{ width: 160, height: 160, borderRadius: 12, background: 'var(--pa-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--pa-tx2)', margin: '0 auto' }}>
                  Generating…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
