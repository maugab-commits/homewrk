import { ChangeEvent, useState } from 'react';
import { FileCode, Film, Image as ImageIcon, Music, Plus, Shapes, Trash2, Upload, Volume2 } from 'lucide-react';
import {
  buildSvgDataUrl,
  buildSynthWavDataUrl,
  inferAssetKind,
  measureAudioDurationSec,
  SynthMode,
  VectorShape,
} from '../../engine/mediaAssets';
import { sanitizeVarName } from '../../engine/storage';
import { TRANSLATIONS } from '../../i18n/translations';
import { AssetItem, HomewrkProject, Lang, RoomId, Scene, StageObject } from '../../types/frontscript';

interface ClosetRoomProps {
  lang: Lang;
  project: HomewrkProject;
  activeScene: Scene;
  onUpdateProject: (updater: (prev: HomewrkProject) => HomewrkProject) => void;
  onJumpToRoom: (room: RoomId) => void;
}

const MAX_FILE_BYTES = 1.5 * 1024 * 1024;
const SHAPES: VectorShape[] = ['house', 'circle', 'square', 'triangle', 'star'];

export function ClosetRoom({ lang, project, activeScene, onUpdateProject, onJumpToRoom }: ClosetRoomProps) {
  const t = TRANSLATIONS[lang].closet;
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [svgName, setSvgName] = useState('shape');
  const [svgShape, setSvgShape] = useState<VectorShape>('house');
  const [svgColor, setSvgColor] = useState('#d94e28');

  const [audioName, setAudioName] = useState('sfx');
  const [audioFreq, setAudioFreq] = useState(440);
  const [audioDur, setAudioDur] = useState(1.65);
  const [audioMode, setAudioMode] = useState<SynthMode>('chord');

  const nextUniqueVar = (base: string, offset = 0) => {
    const clean = sanitizeVarName(base, 'asset');
    return project.assets.some((a) => a.varName === clean)
      ? `${clean}_${project.assets.length + offset + 1}`
      : clean;
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const added: AssetItem[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        setUploadError(`"${file.name}" ${t.sizeError}`);
        continue;
      }
      const { kind, ext } = inferAssetKind(file.name);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('File read error'));
        if (kind === 'json') reader.readAsText(file);
        else reader.readAsDataURL(file);
      });

      const varName = nextUniqueVar(file.name, added.length);
      const durationSec = kind === 'audio' ? await measureAudioDurationSec(dataUrl) : undefined;
      added.push({
        id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        varName,
        fileName: file.name,
        extension: ext,
        kind,
        dataUrl,
        durationSec,
        fontFamilyName: kind === 'font' ? varName : undefined,
        sizeBytes: file.size,
        createdAt: Date.now(),
      });
    }

    if (added.length > 0) {
      onUpdateProject((prev) => ({ ...prev, assets: [...prev.assets, ...added] }));
    }
    e.target.value = '';
  };

  const handleCreateSvgProp = () => {
    const varName = nextUniqueVar(svgName);
    const dataUrl = buildSvgDataUrl(svgShape, svgColor);
    const asset: AssetItem = {
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      varName,
      fileName: `${varName}.svg`,
      extension: 'svg',
      kind: 'image',
      dataUrl,
      sizeBytes: new Blob([dataUrl]).size,
      createdAt: Date.now(),
    };
    onUpdateProject((prev) => ({ ...prev, assets: [...prev.assets, asset] }));
  };

  const handleCreateSynthAudio = () => {
    const varName = nextUniqueVar(audioName);
    const dur = Math.max(0.25, Math.min(8, Number(audioDur) || 1.2));
    const dataUrl = buildSynthWavDataUrl(audioFreq, dur, audioMode);
    const asset: AssetItem = {
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      varName,
      fileName: `${varName}.wav`,
      extension: 'wav',
      kind: 'audio',
      dataUrl,
      durationSec: Number(dur.toFixed(2)),
      sizeBytes: new Blob([dataUrl]).size,
      createdAt: Date.now(),
    };
    onUpdateProject((prev) => ({ ...prev, assets: [...prev.assets, asset] }));
  };

  const handleRenameAssetVar = (id: string, nextRaw: string) => {
    const clean = sanitizeVarName(nextRaw, 'asset');
    onUpdateProject((prev) => ({
      ...prev,
      assets: prev.assets.map((a) =>
        a.id === id ? { ...a, varName: clean, fontFamilyName: a.kind === 'font' ? clean : a.fontFamilyName } : a
      ),
      scenes: prev.scenes.map((s) => ({
        ...s,
        objects: s.objects.map((o) => (o.assetId === id ? { ...o, varName: clean } : o)),
      })),
    }));
  };

  const handleDeleteAsset = (id: string) => {
    onUpdateProject((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== id),
      scenes: prev.scenes.map((s) => ({ ...s, objects: s.objects.filter((o) => o.assetId !== id) })),
    }));
  };

  const handlePlaceInActiveScene = (asset: AssetItem) => {
    if (asset.kind === 'font') {
      onUpdateProject((prev) => ({
        ...prev,
        scenes: prev.scenes.map((s) =>
          s.id === activeScene.id
            ? {
                ...s,
                objects: s.objects.map((o, idx) =>
                  idx === 0 && o.kind === 'control' ? { ...o, fontFamily: asset.fontFamilyName || asset.varName } : o
                ),
              }
            : s
        ),
      }));
      onJumpToRoom('living');
      return;
    }

    const existingCount = activeScene.objects.filter((o) => o.varName.startsWith(asset.varName)).length;
    const varName = existingCount === 0 ? asset.varName : `${asset.varName}_${existingCount + 1}`;
    const newObj: StageObject = {
      id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      varName,
      kind: 'asset',
      assetId: asset.id,
      text: asset.fileName,
      srcOverride: asset.fileName,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      visible: true,
    };

    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === activeScene.id ? { ...s, objects: [...s.objects, newObj] } : s)),
    }));
    onJumpToRoom('living');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-4 space-y-5">
        <section className="skeuo-chassis rounded-xl p-5 space-y-4">
          <div>
            <h2 className="font-display text-base font-semibold text-[#1c1b18]">{t.uploadTitle}</h2>
            <p className="text-xs text-[#666157]">{t.uploadSub}</p>
          </div>
          <label className="block skeuo-well rounded-lg p-5 text-center border-dashed border-2 border-[#c2bcb0] hover:border-[#d94e28] transition-colors cursor-pointer">
            <Upload className="w-5 h-5 mx-auto text-[#5e594f] mb-2" />
            <span className="block text-xs font-semibold text-[#1c1b18]">{t.selectFiles}</span>
            <span className="block text-[11px] text-[#706a5f] mt-1">{t.uploadHint}</span>
            <input
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.svg,.ogg,.mp3,.wav,.mp4,.webm,.json,.ttf,.otf,.woff,.woff2"
              onChange={handleFileUpload}
              className="sr-only"
            />
          </label>
          {uploadError && (
            <p className="text-xs text-[#c53030] font-medium" role="alert">
              {uploadError}
            </p>
          )}
        </section>

        <section className="skeuo-chassis rounded-xl p-5 space-y-3.5">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#d94e28]" />
            <h2 className="font-display text-base font-semibold text-[#1c1b18]">{t.audioSynthTitle}</h2>
          </div>
          <p className="text-xs text-[#666157]">{t.audioSynthSub}</p>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="audio-name" className="block text-[11px] font-medium text-[#59554c] mb-1">
                {t.varLabel}
              </label>
              <input id="audio-name" type="text" value={audioName} onChange={(e) => setAudioName(e.target.value)} className="w-full skeuo-well rounded-md px-2.5 py-1.5 text-xs font-mono text-[#1c1b18]" />
            </div>
            <div>
              <label htmlFor="audio-dur" className="block text-[11px] font-medium text-[#59554c] mb-1">
                {t.durationLabel}
              </label>
              <input id="audio-dur" type="number" step="0.05" min="0.25" max="8" value={audioDur} onChange={(e) => setAudioDur(Number(e.target.value))} className="w-full skeuo-well rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-[#1c1b18]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="audio-freq" className="block text-[11px] font-medium text-[#59554c] mb-1">
                {t.freqLabel} ({audioFreq} Hz)
              </label>
              <input id="audio-freq" type="range" min="180" max="880" step="10" value={audioFreq} onChange={(e) => setAudioFreq(Number(e.target.value))} className="w-full accent-[#d94e28] cursor-pointer" />
            </div>
            <div>
              <label htmlFor="audio-mode" className="block text-[11px] font-medium text-[#59554c] mb-1">
                {t.typeLabel}
              </label>
              <select id="audio-mode" value={audioMode} onChange={(e) => setAudioMode(e.target.value as SynthMode)} className="w-full skeuo-well rounded-md px-2 py-1.5 text-xs font-mono text-[#1c1b18]">
                <option value="chord">{t.toneTypes.chord}</option>
                <option value="tone">{t.toneTypes.tone}</option>
                <option value="pulse">{t.toneTypes.pulse}</option>
              </select>
            </div>
          </div>

          <button type="button" onClick={handleCreateSynthAudio} className="w-full skeuo-keycap py-2 px-4 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5 text-[#d94e28]" />
            {t.saveAudio} ({Number(audioDur).toFixed(2)}s)
          </button>
        </section>

        <section className="skeuo-chassis rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shapes className="w-4 h-4 text-[#d94e28]" />
            <h2 className="font-display text-base font-semibold text-[#1c1b18]">{t.svgTitle}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg skeuo-well flex items-center justify-center shrink-0 p-2">
              <img src={buildSvgDataUrl(svgShape, svgColor)} alt="SVG preview" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 space-y-2">
              <input type="text" aria-label="SVG objLet name" value={svgName} onChange={(e) => setSvgName(e.target.value)} className="w-full skeuo-well rounded-md px-2.5 py-1.5 text-xs font-mono text-[#1c1b18]" />
              <div className="flex items-center gap-2">
                <label htmlFor="svg-color" className="text-[11px] font-medium text-[#59554c]">
                  Color
                </label>
                <input id="svg-color" type="color" value={svgColor} onChange={(e) => setSvgColor(e.target.value)} className="w-8 h-6 rounded border border-[#c5c0b3] cursor-pointer bg-transparent" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {SHAPES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSvgShape(s)}
                className={`py-1.5 px-1 rounded text-[11px] font-medium border cursor-pointer ${
                  svgShape === s ? 'bg-[#1c1b18] text-white border-[#1c1b18]' : 'bg-[#f4f2ec] text-[#4a473f] border-[#d4d0c5]'
                }`}
              >
                {t.shapes[s]}
              </button>
            ))}
          </div>

          <button type="button" onClick={handleCreateSvgProp} className="w-full skeuo-keycap-accent py-2 px-4 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            {t.saveSvg}
          </button>
        </section>
      </div>

      <section className="lg:col-span-8 skeuo-chassis rounded-xl p-5 space-y-4 min-h-[460px]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-[#1c1b18]">{t.shelfTitle}</h2>
            <p className="text-xs text-[#666157]">
              {t.targetScene} <span className="font-semibold text-[#1c1b18]">{activeScene.name}</span>
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#666157]">
            {project.assets.length} {t.savedCount}
          </span>
        </div>

        {project.assets.length === 0 ? (
          <div className="skeuo-well rounded-lg p-10 text-center space-y-2">
            <ImageIcon className="w-7 h-7 mx-auto text-[#8a8477]" />
            <div className="text-sm font-semibold text-[#2d2b26]">{t.emptyTitle}</div>
            <p className="text-xs text-[#6e685d] max-w-md mx-auto">{t.emptySub}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {project.assets.map((asset) => {
              const kb = (asset.sizeBytes / 1024).toFixed(1);
              return (
                <div key={asset.id} className="bg-[#faf9f5] border border-[#d4d0c5] rounded-lg p-3.5 flex gap-3.5 items-start">
                  <div className="w-16 h-16 rounded-md skeuo-well flex items-center justify-center overflow-hidden shrink-0">
                    {asset.kind === 'image' ? (
                      <img src={asset.dataUrl} alt={asset.fileName} className="w-full h-full object-contain" />
                    ) : asset.kind === 'audio' ? (
                      <Music className="w-6 h-6 text-[#d94e28]" />
                    ) : asset.kind === 'font' ? (
                      <span style={{ fontFamily: asset.fontFamilyName || asset.varName }} className="text-lg font-semibold text-[#1c1b18]">
                        Aa
                      </span>
                    ) : asset.kind === 'video' ? (
                      <Film className="w-6 h-6 text-[#59554c]" />
                    ) : (
                      <FileCode className="w-6 h-6 text-[#59554c]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#1c1b18] truncate">{asset.fileName}</span>
                      <span className="text-[11px] font-mono tabular-nums text-[#767166] shrink-0">
                        {asset.kind === 'audio' && asset.durationSec !== undefined ? `${asset.durationSec.toFixed(2)}s · ${kb} KB` : `${kb} KB`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="text-[#7a7468]">{asset.kind === 'font' ? 'font' : 'objLet'}</span>
                      <input type="text" value={asset.varName} onChange={(e) => handleRenameAssetVar(asset.id, e.target.value)} aria-label={asset.fileName} className="w-28 skeuo-well rounded px-2 py-0.5 text-xs font-mono text-[#1c1b18]" />
                    </div>

                    {asset.kind === 'audio' && <audio src={asset.dataUrl} controls className="w-full h-7" />}
                    {asset.kind === 'font' && (
                      <p style={{ fontFamily: asset.fontFamilyName || asset.varName }} className="text-xs text-[#4a473f] truncate">
                        {t.fontPreview}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-0.5">
                      <button type="button" onClick={() => handlePlaceInActiveScene(asset)} className="skeuo-keycap px-2.5 py-1 rounded text-[11px] font-semibold text-[#1c1b18] cursor-pointer">
                        {asset.kind === 'font' ? t.applyIn : t.placeIn} {activeScene.name}
                      </button>
                      <button type="button" onClick={() => handleDeleteAsset(asset.id)} aria-label={`Delete ${asset.fileName}`} className="skeuo-keycap p-1 rounded text-[#8c3d35] cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
