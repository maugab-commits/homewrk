import { Pause, Play, Volume2 } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { AssetItem, ControlKind, Lang } from '../types/frontscript';

export interface RenderableObject {
  varName: string;
  kind: 'control' | 'asset';
  controlKind?: ControlKind;
  assetId?: string;
  assetPath?: string;
  text: string;
  htmlId?: string;
  srcOverride?: string;
  className?: string;
  href?: string;
  alt?: string;
  titleAttr?: string;
  placeholder?: string;
  valueAttr?: string;
  disabled?: boolean;
  fontFamily?: string;
  fontSize?: string;
  backgroundColor?: string;
  color?: string;
  borderRadius?: string;
  width?: string;
  height?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  playing?: boolean;
  progress?: number;
  currentTime?: number;
  duration?: number;
}

interface StageElementRendererProps {
  obj: RenderableObject;
  assets: AssetItem[];
  mode: 'stage' | 'monitor' | 'theater';
  lang?: Lang;
  onEvent?: (eventType: string, targetVar: string, value?: unknown) => void;
  onAudioCommand?: (varName: string, cmd: 'play' | 'pause' | 'stop' | 'seek', arg?: number) => void;
}

export function resolveObjectAsset(obj: RenderableObject, assets: AssetItem[]): AssetItem | null {
  if (obj.kind !== 'asset') return null;
  if (obj.assetId) {
    const byId = assets.find((a) => a.id === obj.assetId);
    if (byId) return byId;
  }
  const srcName = obj.srcOverride || obj.assetPath;
  if (srcName) {
    const byName = assets.find((a) => a.fileName === srcName);
    if (byName) return byName;
  }
  return assets.find((a) => a.varName === obj.varName) || null;
}

export function StageElementRenderer({
  obj,
  assets,
  mode,
  lang = 'en',
  onEvent,
  onAudioCommand,
}: StageElementRendererProps) {
  const asset = resolveObjectAsset(obj, assets);
  const directUrl =
    asset?.dataUrl ||
    (obj.srcOverride && (obj.srcOverride.startsWith('data:') || obj.srcOverride.startsWith('http'))
      ? obj.srcOverride
      : '');

  const customStyle = {
    backgroundColor: obj.backgroundColor || undefined,
    color: obj.color || undefined,
    fontFamily: obj.fontFamily || undefined,
    fontSize: obj.fontSize || undefined,
    borderRadius: obj.borderRadius || undefined,
    width: obj.width || undefined,
    height: obj.height || undefined,
  };

  if (mode === 'monitor') {
    const style = {
      ...customStyle,
      transform: `translate(${obj.x * 0.5}px, ${obj.y * 0.5}px) scale(${obj.scale * 0.85}) rotate(${obj.rotation}deg)`,
      opacity: obj.opacity,
    };
    if (obj.kind === 'asset' && asset?.kind === 'image') {
      return (
        <img
          src={asset.dataUrl}
          alt={obj.varName}
          style={style}
          className={`max-w-[78px] max-h-[60px] object-contain ${obj.className || ''}`}
        />
      );
    }
    return (
      <div
        style={style}
        className={`px-2.5 py-1 rounded text-xs font-medium bg-[#2d2b26] border border-[#44413a] ${obj.className || ''}`}
      >
        {obj.text}
      </div>
    );
  }

  const theaterTransformStyle =
    mode === 'theater'
      ? {
          ...customStyle,
          transform: `translate(${obj.x}px, ${obj.y}px) scale(${obj.scale}) rotate(${obj.rotation}deg)`,
          opacity: obj.opacity,
        }
      : customStyle;

  if (obj.kind === 'control') {
    if (obj.controlKind === 'title') {
      return (
        <h3
          id={mode === 'theater' ? obj.htmlId || undefined : undefined}
          title={obj.titleAttr || undefined}
          style={theaterTransformStyle}
          className={`font-display text-2xl font-bold leading-tight ${obj.className || ''}`}
        >
          {obj.text}
        </h3>
      );
    }
    if (obj.controlKind === 'text') {
      return (
        <p
          id={mode === 'theater' ? obj.htmlId || undefined : undefined}
          title={obj.titleAttr || undefined}
          style={theaterTransformStyle}
          className={`text-sm opacity-85 max-w-md ${obj.className || ''}`}
        >
          {obj.text}
        </p>
      );
    }
    if (obj.controlKind === 'button') {
      if (mode === 'stage') {
        return (
          <span
            style={customStyle}
            className={`inline-block px-4 py-2 rounded-md text-xs font-semibold bg-[#1c1b18] text-white border border-black/20 ${obj.className || ''}`}
          >
            {obj.text}
          </span>
        );
      }
      return (
        <button
          id={obj.htmlId || undefined}
          title={obj.titleAttr || undefined}
          disabled={Boolean(obj.disabled)}
          type="button"
          style={theaterTransformStyle}
          onClick={() => onEvent?.('onClick', obj.varName)}
          onDoubleClick={() => onEvent?.('onDoubleClick', obj.varName)}
          onMouseEnter={() => {
            onEvent?.('onMouseEnter', obj.varName);
            onEvent?.('onHover', obj.varName);
          }}
          onMouseLeave={() => onEvent?.('onMouseLeave', obj.varName)}
          className={`px-4 py-2 rounded-md text-xs font-semibold bg-[#d94e28] text-white shadow-sm hover:brightness-110 active:translate-y-[1px] disabled:opacity-45 cursor-pointer ${obj.className || ''}`}
        >
          {obj.text}
        </button>
      );
    }
    if (obj.controlKind === 'input') {
      if (mode === 'stage') {
        return (
          <span
            style={customStyle}
            className={`inline-block px-3 py-1.5 rounded-md text-xs bg-white text-[#666157] border border-[#c5c0b3] min-w-[180px] ${obj.className || ''}`}
          >
            {obj.placeholder || obj.text}
          </span>
        );
      }
      return (
        <input
          id={obj.htmlId || undefined}
          title={obj.titleAttr || undefined}
          disabled={Boolean(obj.disabled)}
          type="text"
          style={theaterTransformStyle}
          placeholder={obj.placeholder || obj.text}
          onInput={(e) => onEvent?.('onInput', obj.varName, (e.target as HTMLInputElement).value)}
          onChange={(e) => onEvent?.('onChange', obj.varName, (e.target as HTMLInputElement).value)}
          className={`px-3 py-2 rounded-md text-xs bg-white text-[#1c1b18] border border-[#c5c0b3] min-w-[200px] ${obj.className || ''}`}
        />
      );
    }
    if (mode === 'stage') {
      return (
        <span style={customStyle} className={`inline-flex items-center gap-2 text-xs ${obj.className || ''}`}>
          <span className="w-4 h-4 rounded border border-current inline-block" />
          <span>{obj.text}</span>
        </span>
      );
    }
    return (
      <label
        id={obj.htmlId || undefined}
        style={theaterTransformStyle}
        className={`inline-flex items-center gap-2 text-xs cursor-pointer ${obj.className || ''}`}
      >
        <input
          type="checkbox"
          disabled={Boolean(obj.disabled)}
          onChange={(e) => onEvent?.('onChange', obj.varName, e.target.checked)}
        />
        <span>{obj.text}</span>
      </label>
    );
  }

  if (asset?.kind === 'audio') {
    if (mode === 'stage') {
      return (
        <div
          style={customStyle}
          className={`px-3 py-2 rounded-md border border-current/25 bg-white/80 text-[#1c1b18] inline-flex items-center gap-2 text-xs font-mono ${obj.className || ''}`}
        >
          <Volume2 className="w-3.5 h-3.5 text-[#d94e28]" />
          <span>{obj.varName}</span>
          <span className="opacity-65">{(asset.durationSec || 0).toFixed(2)}s</span>
        </div>
      );
    }

    const t = TRANSLATIONS[lang].theater;
    const progress = obj.progress ?? 0;
    const currentTime = obj.currentTime ?? 0;
    const duration = obj.duration ?? asset.durationSec ?? 0;
    const playing = Boolean(obj.playing);

    return (
      <div
        style={theaterTransformStyle}
        className={`px-3.5 py-2.5 rounded-lg border border-current/25 bg-black/5 flex flex-wrap items-center gap-3 text-xs font-mono ${obj.className || ''}`}
      >
        <button
          type="button"
          onClick={() => onAudioCommand?.(obj.varName, playing ? 'pause' : 'play')}
          className="px-2.5 py-1 rounded bg-[#1c1b18] text-white inline-flex items-center gap-1 cursor-pointer"
        >
          {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {playing ? t.pauseBtn : t.playBtn}
        </button>
        <span className="inline-flex items-center gap-1 font-semibold">
          <Volume2 className="w-3.5 h-3.5 text-[#d94e28]" />
          {playing ? t.playing : t.stopped}
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={progress}
          aria-label={obj.varName}
          onChange={(e) => onAudioCommand?.(obj.varName, 'seek', Number(e.target.value))}
          className="w-24 accent-[#d94e28] cursor-pointer"
        />
        <span className="tabular-nums opacity-85">
          {progress.toFixed(2)} · {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </span>
      </div>
    );
  }

  if (asset?.kind === 'image' || (!asset && directUrl)) {
    return (
      <img
        id={mode === 'theater' ? obj.htmlId || undefined : undefined}
        src={directUrl}
        alt={obj.alt || obj.varName}
        title={obj.titleAttr || undefined}
        draggable={false}
        style={theaterTransformStyle}
        onClick={mode === 'theater' ? () => onEvent?.('onClick', obj.varName) : undefined}
        className={
          mode === 'stage'
            ? `max-w-[180px] max-h-[140px] object-contain pointer-events-none ${obj.className || ''}`
            : `max-w-[220px] max-h-[160px] object-contain cursor-pointer ${obj.className || ''}`
        }
      />
    );
  }

  if (asset?.kind === 'video' && mode === 'theater') {
    return (
      <video
        src={asset.dataUrl}
        controls
        style={theaterTransformStyle}
        className={`max-w-[260px] rounded ${obj.className || ''}`}
      />
    );
  }

  return (
    <div
      style={theaterTransformStyle}
      className={`px-3 py-2 rounded border border-current/25 text-xs font-mono ${obj.className || ''}`}
    >
      [{asset?.kind || 'asset'}: {obj.srcOverride || obj.assetPath || obj.text}]
    </div>
  );
}
