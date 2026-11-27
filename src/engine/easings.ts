import { EaseType, TimelineTrack } from '../types/frontscript';

export function applyEase(ease: EaseType, t: number): number {
  const x = Math.max(0, Math.min(1, t));
  switch (ease) {
    case 'step':
      return x >= 1 ? 1 : 0;
    case 'easeInQuad':
      return x * x;
    case 'easeOutQuad':
      return 1 - (1 - x) * (1 - x);
    case 'easeInOutQuad':
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    case 'easeInOutCubic':
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    case 'easeOutBack': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    case 'easeOutBounce': {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) {
        const y = x - 1.5 / d1;
        return n1 * y * y + 0.75;
      }
      if (x < 2.5 / d1) {
        const y = x - 2.25 / d1;
        return n1 * y * y + 0.9375;
      }
      const y = x - 2.625 / d1;
      return n1 * y * y + 0.984375;
    }
    case 'linear':
    default:
      return x;
  }
}

function parseHexColor(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^['"]|['"]$/g, '');
  const m = clean.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function interpolateTimelineValue(
  fromRaw: unknown,
  toRaw: string,
  progress: number,
  ease: EaseType
): unknown {
  const eased = applyEase(ease, progress);
  const toClean = toRaw.trim().replace(/^["']|["']$/g, '');

  // If ease is step or non-numeric strings (class, src, text, visible)
  if (ease === 'step') {
    if (progress >= 1) {
      if (toClean === 'true') return true;
      if (toClean === 'false') return false;
      const num = Number(toClean);
      return Number.isNaN(num) || toClean === '' ? toClean : num;
    }
    return fromRaw;
  }

  // Hex color interpolation
  const fromHex = typeof fromRaw === 'string' ? parseHexColor(fromRaw) : null;
  const toHex = parseHexColor(toClean);
  if (fromHex && toHex) {
    const r = Math.round(fromHex[0] + (toHex[0] - fromHex[0]) * eased);
    const g = Math.round(fromHex[1] + (toHex[1] - fromHex[1]) * eased);
    const b = Math.round(fromHex[2] + (toHex[2] - fromHex[2]) * eased);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  // Numeric with optional unit (e.g., "24px")
  const fromNum = typeof fromRaw === 'number' ? fromRaw : parseFloat(String(fromRaw ?? 0));
  const toUnitMatch = toClean.match(/^(-?\d+(?:\.\d+)?)(px|%|em|rem|deg)?$/);
  if (!Number.isNaN(fromNum) && toUnitMatch) {
    const toNum = Number(toUnitMatch[1]);
    const unit = toUnitMatch[2] || '';
    const val = fromNum + (toNum - fromNum) * eased;
    return unit ? `${val.toFixed(1)}${unit}` : val;
  }

  // Non-curvable string/boolean property switches at step completion
  if (progress >= 0.999) {
    if (toClean === 'true') return true;
    if (toClean === 'false') return false;
    return toClean;
  }
  return fromRaw;
}

export function getTrackTotalDurationSec(track: TimelineTrack): number {
  return track.steps.reduce((acc, s) => acc + Math.max(0.01, Number(s.durationSec) || 0.01), 0);
}

export function getMaxTimelineDurationSec(tracks: TimelineTrack[]): number {
  return tracks.reduce((max, t) => Math.max(max, getTrackTotalDurationSec(t)), 0);
}
