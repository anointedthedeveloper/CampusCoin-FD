// Text-size preference (SRS: font-size adjustment). Tailwind sizes are in
// rem, so changing the root font size scales the whole interface.
export const FONT_SCALES = [
  { id: 'small', label: 'Small', px: 14 },
  { id: 'default', label: 'Default', px: 16 },
  { id: 'large', label: 'Large', px: 18 },
  { id: 'xlarge', label: 'Extra large', px: 20 },
] as const;

export type FontScaleId = (typeof FONT_SCALES)[number]['id'];

const STORAGE_KEY = 'campus-coin.fontScale';

export function getFontScale(): FontScaleId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (FONT_SCALES.some((s) => s.id === stored)) return stored as FontScaleId;
  } catch {
    // ignore
  }
  return 'default';
}

export function applyFontScale(id: FontScaleId = getFontScale()): void {
  const scale = FONT_SCALES.find((s) => s.id === id) ?? FONT_SCALES[1];
  document.documentElement.style.fontSize = scale.id === 'default' ? '' : `${scale.px}px`;
}

export function setFontScale(id: FontScaleId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
  applyFontScale(id);
}
