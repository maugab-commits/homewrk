import { AssetKind } from '../types/frontscript';

export type VectorShape = 'circle' | 'square' | 'triangle' | 'house' | 'star';
export type SynthMode = 'tone' | 'chord' | 'pulse';

export function inferAssetKind(fileName: string): { kind: AssetKind; ext: string } {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
  if (['ogg', 'mp3', 'wav'].includes(ext)) return { kind: 'audio', ext };
  if (['mp4', 'webm'].includes(ext)) return { kind: 'video', ext };
  if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return { kind: 'font', ext };
  if (ext === 'json') return { kind: 'json', ext };
  return { kind: 'image', ext };
}

export function measureAudioDurationSec(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(dataUrl);
    const done = () => {
      const dur = Number.isFinite(audio.duration) ? Number(audio.duration.toFixed(2)) : 0;
      resolve(dur);
    };
    audio.addEventListener('loadedmetadata', done, { once: true });
    audio.addEventListener('error', () => resolve(0), { once: true });
    window.setTimeout(() => resolve(0), 1500);
  });
}

export function buildSynthWavDataUrl(freqHz: number, durationSec: number, mode: SynthMode): string {
  const sampleRate = 22050;
  const numSamples = Math.max(1000, Math.floor(sampleRate * durationSec));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 25) * Math.min(1, (durationSec - t) * 12);
    let sample = 0;
    if (mode === 'tone') {
      sample = Math.sin(2 * Math.PI * freqHz * t);
    } else if (mode === 'chord') {
      sample =
        (Math.sin(2 * Math.PI * freqHz * t) +
          Math.sin(2 * Math.PI * freqHz * 1.25 * t) +
          Math.sin(2 * Math.PI * freqHz * 1.5 * t)) /
        3;
    } else {
      const gate = Math.sin(2 * Math.PI * 4 * t) > 0 ? 1 : 0.15;
      sample = Math.sin(2 * Math.PI * freqHz * t) * gate;
    }
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample * env * 0.45)) * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

export function buildSvgDataUrl(shape: VectorShape, fill: string): string {
  const shapes: Record<VectorShape, string> = {
    circle: `<circle cx="64" cy="64" r="46" fill="${fill}" stroke="#1c1b18" stroke-width="3"/>`,
    square: `<rect x="20" y="20" width="88" height="88" rx="10" fill="${fill}" stroke="#1c1b18" stroke-width="3"/>`,
    triangle: `<polygon points="64,16 112,106 16,106" fill="${fill}" stroke="#1c1b18" stroke-width="3" stroke-linejoin="round"/>`,
    house: `<polygon points="64,14 114,56 100,56 100,110 28,110 28,56 14,56" fill="${fill}" stroke="#1c1b18" stroke-width="3" stroke-linejoin="round"/><rect x="53" y="74" width="22" height="36" fill="#faf9f5" stroke="#1c1b18" stroke-width="2.5"/>`,
    star: `<polygon points="64,12 79,45 115,50 88,75 95,112 64,94 33,112 40,75 13,50 49,45" fill="${fill}" stroke="#1c1b18" stroke-width="3" stroke-linejoin="round"/>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">${shapes[shape]}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
