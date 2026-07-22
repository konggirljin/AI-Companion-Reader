export type MotifType =
  | 'leaf' | 'arch-branch' | 'arch-tree' | 'large-leaf'
  | 'waves' | 'abstract' | 'forest' | 'sunset' | 'moon' | 'botanical-circle';

interface CoverStyle {
  bg: string;
  textColor: string;
  accentColor: string;
  motif: MotifType;
}

const STYLES: CoverStyle[] = [
  { bg: '#C4875A', textColor: '#FAEBD7', accentColor: 'rgba(250,235,215,0.55)', motif: 'leaf' },
  { bg: '#E0C898', textColor: '#4A3218', accentColor: 'rgba(74,50,24,0.45)',    motif: 'arch-branch' },
  { bg: '#44260E', textColor: '#D8B88A', accentColor: 'rgba(210,165,85,0.55)',  motif: 'arch-tree' },
  { bg: '#CC8A62', textColor: '#FAEBD7', accentColor: 'rgba(250,235,215,0.5)',  motif: 'large-leaf' },
  { bg: '#26180A', textColor: '#B88A52', accentColor: 'rgba(185,140,82,0.6)',   motif: 'waves' },
  { bg: '#8A4820', textColor: '#F5D090', accentColor: 'rgba(245,208,144,0.55)', motif: 'abstract' },
  { bg: '#1C1C2E', textColor: '#8AAAD0', accentColor: 'rgba(138,170,208,0.65)', motif: 'forest' },
  { bg: '#783818', textColor: '#F5C060', accentColor: 'rgba(245,192,96,0.65)',  motif: 'sunset' },
  { bg: '#1A2E50', textColor: '#98B8D8', accentColor: 'rgba(152,184,216,0.65)', motif: 'moon' },
  { bg: '#284832', textColor: '#B0C8A0', accentColor: 'rgba(176,200,160,0.6)',  motif: 'botanical-circle' },
];

export function pickCoverStyle(seed: string): CoverStyle {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % STYLES.length;
  return STYLES[idx];
}

export const MOTIF_TYPES: MotifType[] = STYLES.map((s) => s.motif);
