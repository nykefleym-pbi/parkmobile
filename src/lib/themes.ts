export const THEMES: Record<string, {
  name: string; acc: string; grn: string; 'grn-s': string; bg: string; sf: string;
  tx: string; tx2: string; soft: string; brd: string; swatch: string; stx: string;
}> = {
  green: { name: 'Green', acc: '#2D6A4F', grn: '#2D6A4F', 'grn-s': '#E8F5E9', bg: '#FAFAF8', sf: '#FFFFFF', tx: '#1A1A18', tx2: '#92918B', soft: '#F0F0EC', brd: '#E8E8E2', swatch: '#2D6A4F', stx: '#fff' },
  blue: { name: 'Blue', acc: '#1565C0', grn: '#1565C0', 'grn-s': '#E3F2FD', bg: '#F5F8FC', sf: '#FFFFFF', tx: '#1A1A18', tx2: '#78869B', soft: '#EBF0F7', brd: '#DCE4EE', swatch: '#1565C0', stx: '#fff' },
  red: { name: 'Red', acc: '#B71C1C', grn: '#B71C1C', 'grn-s': '#FFEBEE', bg: '#FDF6F6', sf: '#FFFFFF', tx: '#1A1A18', tx2: '#9E8B8B', soft: '#F5EAEA', brd: '#EBD9D9', swatch: '#B71C1C', stx: '#fff' },
  orange: { name: 'Orange', acc: '#E65100', grn: '#E65100', 'grn-s': '#FFF3E0', bg: '#FDFAF5', sf: '#FFFFFF', tx: '#1A1A18', tx2: '#9E9080', soft: '#F5EDE3', brd: '#EBE0D2', swatch: '#E65100', stx: '#fff' },
  yellow: { name: 'Yellow', acc: '#F9A825', grn: '#F57F17', 'grn-s': '#FFFDE7', bg: '#FDFCF4', sf: '#FFFFFF', tx: '#1A1A18', tx2: '#918D7A', soft: '#F5F2E4', brd: '#EBE8D5', swatch: '#F9A825', stx: '#1A1A18' },
  violet: { name: 'Violet', acc: '#6A1B9A', grn: '#6A1B9A', 'grn-s': '#F3E5F5', bg: '#FAF6FC', sf: '#FFFFFF', tx: '#1A1A18', tx2: '#8F8599', soft: '#F0E8F5', brd: '#E2D6EB', swatch: '#6A1B9A', stx: '#fff' },
  white: { name: 'White', acc: '#546E7A', grn: '#546E7A', 'grn-s': '#ECEFF1', bg: '#FFFFFF', sf: '#F5F5F5', tx: '#1A1A18', tx2: '#90A4AE', soft: '#ECEFF1', brd: '#CFD8DC', swatch: '#ECEFF1', stx: '#333' },
  black: { name: 'Black', acc: '#1A1A18', grn: '#1A1A18', 'grn-s': '#F0F0EC', bg: '#FAFAF8', sf: '#FFFFFF', tx: '#1A1A18', tx2: '#92918B', soft: '#F0F0EC', brd: '#E8E8E2', swatch: '#1A1A18', stx: '#fff' },
};

export function applyTheme(themeId: string) {
  const t = THEMES[themeId];
  if (!t) return;
  const r = document.documentElement.style;
  r.setProperty('--pa-acc', t.acc);
  r.setProperty('--pa-grn', t.grn);
  r.setProperty('--pa-grn-s', t['grn-s']);
  r.setProperty('--pa-bg', t.bg);
  r.setProperty('--pa-sf', t.sf);
  r.setProperty('--pa-tx', t.tx);
  r.setProperty('--pa-tx2', t.tx2);
  r.setProperty('--pa-soft', t.soft);
  r.setProperty('--pa-brd', t.brd);
}

export const COLOR_MAP: Record<string, string> = {
  white: '#B0B0B0', black: '#1A1A18', silver: '#9E9E9E', gray: '#757575',
  red: '#C62828', blue: '#1565C0', green: '#2E7D32', yellow: '#F9A825',
  orange: '#EF6C00', brown: '#5D4037', gold: '#C9940E', maroon: '#6A1B29',
  navy: '#1A237E', pink: '#C2185B',
};

export function getCarColor(color: string): string {
  return COLOR_MAP[(color || '').toLowerCase().trim()] || '#92918B';
}
