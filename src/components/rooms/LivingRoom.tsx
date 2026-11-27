import { PointerEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckSquare,
  Eye,
  EyeOff,
  FileText,
  Heading,
  MousePointerClick,
  Plus,
  Trash2,
  Type,
} from 'lucide-react';
import { sanitizeVarName } from '../../engine/storage';
import { TRANSLATIONS } from '../../i18n/translations';
import {
  ControlKind,
  HomewrkProject,
  Lang,
  PhysicsBodyType,
  PhysicsShape,
  RoomId,
  Scene,
  StageObject,
} from '../../types/frontscript';
import { StageElementRenderer } from '../StageElementRenderer';

interface LivingRoomProps {
  lang: Lang;
  project: HomewrkProject;
  activeScene: Scene;
  onUpdateProject: (updater: (prev: HomewrkProject) => HomewrkProject) => void;
  onJumpToRoom: (room: RoomId) => void;
}

const CONTROL_DEFAULTS: Record<ControlKind, { varBase: string; enText: string; esText: string; icon: typeof Type }> = {
  title: { varBase: 'heading', enText: 'Main Heading', esText: 'Título principal', icon: Heading },
  text: { varBase: 'body', enText: 'Write a short message.', esText: 'Escribe un mensaje breve.', icon: FileText },
  button: { varBase: 'btnNext', enText: 'Continue', esText: 'Continuar', icon: MousePointerClick },
  input: { varBase: 'field', enText: 'Type here...', esText: 'Escribe aquí...', icon: Type },
  checkbox: { varBase: 'accept', enText: 'Accept option', esText: 'Aceptar opción', icon: CheckSquare },
};

const THEME_STAGE_CLASSES: Record<string, string> = {
  minimal: 'bg-[#faf9f5] text-[#1c1b18] border-[#d4d0c5]',
  dark: 'bg-[#191816] text-[#f4f2ed] border-[#35322c]',
  school: 'bg-[#fdf8e8] text-[#1e293b] border-[#e2d8ba]',
  history: 'bg-[#f4ecdc] text-[#2d241c] border-[#d6c8ad]',
  science: 'bg-[#eef5f8] text-[#0f172a] border-[#c4d7e0]',
  business: 'bg-[#ffffff] text-[#111827] border-[#d1d5db]',
};

type InspectorTab = 'html5' | 'style' | 'physics';

export function LivingRoom({ lang, project, activeScene, onUpdateProject, onJumpToRoom }: LivingRoomProps) {
  const t = TRANSLATIONS[lang].living;
  const [selectedObjId, setSelectedObjId] = useState<string | null>(activeScene.objects[0]?.id || null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('html5');
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    if (!activeScene.objects.some((o) => o.id === selectedObjId)) {
      setSelectedObjId(activeScene.objects[0]?.id || null);
    }
  }, [activeScene.id, activeScene.objects, selectedObjId]);

  const selectedObj = activeScene.objects.find((o) => o.id === selectedObjId) || null;
  const fontAssets = project.assets.filter((a) => a.kind === 'font');
  const placeableAssets = project.assets.filter((a) => a.kind !== 'font');

  const updateActiveScene = (updater: (s: Scene) => Scene) => {
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === activeScene.id ? updater(s) : s)),
    }));
  };

  const updateSceneObjects = (updater: (objs: StageObject[]) => StageObject[]) =>
    updateActiveScene((s) => ({ ...s, objects: updater(s.objects) }));

  const updateSelected = (patch: Partial<StageObject>) => {
    if (!selectedObj) return;
    updateSceneObjects((objs) => objs.map((o) => (o.id === selectedObj.id ? { ...o, ...patch } : o)));
  };

  const updatePhysics = (patch: Partial<NonNullable<StageObject['physics']>>) => {
    if (!selectedObj) return;
    updateSelected({
      physics: {
        bodyType: selectedObj.physics?.bodyType || 'dynamic',
        shape: selectedObj.physics?.shape || 'box',
        restitution: selectedObj.physics?.restitution ?? 0.45,
        friction: selectedObj.physics?.friction ?? 0.3,
        density: selectedObj.physics?.density ?? 1,
        ...patch,
      },
    });
  };

  const handleAddControl = (kind: ControlKind) => {
    const def = CONTROL_DEFAULTS[kind];
    const count = activeScene.objects.filter((o) => o.varName.startsWith(def.varBase)).length;
    const varName = count === 0 ? def.varBase : `${def.varBase}_${count + 1}`;
    const newObj: StageObject = {
      id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      varName,
      kind: 'control',
      controlKind: kind,
      text: lang === 'es' ? def.esText : def.enText,
      x: 0,
      y: activeScene.objects.length * 16,
      scale: 1,
      rotation: 0,
      opacity: 1,
      visible: true,
    };
    updateSceneObjects((objs) => [...objs, newObj]);
    setSelectedObjId(newObj.id);
  };

  const handleAddAssetToStage = (assetId: string) => {
    const asset = project.assets.find((a) => a.id === assetId);
    if (!asset || asset.kind === 'font') return;
    const count = activeScene.objects.filter((o) => o.varName.startsWith(asset.varName)).length;
    const varName = count === 0 ? asset.varName : `${asset.varName}_${count + 1}`;
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
    updateSceneObjects((objs) => [...objs, newObj]);
    setSelectedObjId(newObj.id);
  };

  const handleMoveLayer = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= activeScene.objects.length) return;
    updateSceneObjects((objs) => {
      const copy = [...objs];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>, obj: StageObject) => {
    e.stopPropagation();
    setSelectedObjId(obj.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { id: obj.id, startX: e.clientX, startY: e.clientY, origX: obj.x, origY: obj.y };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = Math.round(e.clientX - drag.startX);
    const dy = Math.round(e.clientY - drag.startY);
    updateSceneObjects((objs) => objs.map((o) => (o.id === drag.id ? { ...o, x: drag.origX + dx, y: drag.origY + dy } : o)));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <aside className="lg:col-span-3 space-y-4">
        <section className="skeuo-chassis rounded-xl p-4 space-y-3">
          <h2 className="font-display text-sm font-semibold text-[#1c1b18]">
            {t.controlsTitle} <span className="font-mono text-xs text-[#767166]">objLet =</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(CONTROL_DEFAULTS) as ControlKind[]).map((kind) => {
              const Icon = CONTROL_DEFAULTS[kind].icon;
              return (
                <button key={kind} type="button" onClick={() => handleAddControl(kind)} className="skeuo-keycap px-2.5 py-2 rounded-lg text-xs font-medium text-[#1c1b18] flex items-center gap-2 cursor-pointer">
                  <Icon className="w-3.5 h-3.5 text-[#d94e28] shrink-0" />
                  <span className="truncate">{t.controlLabels[kind]}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="skeuo-chassis rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold text-[#1c1b18]">{t.assetsTitle}</h2>
            <button type="button" onClick={() => onJumpToRoom('closet')} className="text-[11px] font-semibold text-[#c2421f] hover:underline cursor-pointer">
              {t.uploadMore}
            </button>
          </div>
          {placeableAssets.length === 0 ? (
            <p className="text-xs text-[#706a5f]">{t.noAssets}</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {placeableAssets.map((asset) => (
                <button key={asset.id} type="button" onClick={() => handleAddAssetToStage(asset.id)} className="w-full skeuo-keycap px-2.5 py-1.5 rounded-md text-xs text-left flex items-center justify-between gap-2 cursor-pointer">
                  <span className="font-mono truncate text-[#1c1b18]">
                    {asset.varName}
                    {asset.kind === 'audio' && asset.durationSec !== undefined ? ` (${asset.durationSec.toFixed(2)}s)` : ''}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-[#d94e28] shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="skeuo-chassis rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-[#1c1b18]">{t.physicsTitle}</h2>
            <button
              type="button"
              onClick={() => updateActiveScene((s) => ({ ...s, physics: { ...s.physics, enabled: !s.physics.enabled } }))}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${activeScene.physics.enabled ? 'skeuo-keycap-accent' : 'skeuo-keycap text-[#4a473f]'}`}
            >
              {activeScene.physics.enabled ? t.physicsOn : t.physicsOff}
            </button>
          </div>
          {activeScene.physics.enabled && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label htmlFor="grav-x" className="block text-[10px] font-mono text-[#59554c]">gravityX</label>
                <input id="grav-x" type="number" value={activeScene.physics.gravityX} onChange={(e) => updateActiveScene((s) => ({ ...s, physics: { ...s.physics, gravityX: Number(e.target.value) || 0 } }))} className="w-full skeuo-well rounded px-2 py-1 text-xs font-mono tabular-nums" />
              </div>
              <div>
                <label htmlFor="grav-y" className="block text-[10px] font-mono text-[#59554c]">gravityY</label>
                <input id="grav-y" type="number" value={activeScene.physics.gravityY} onChange={(e) => updateActiveScene((s) => ({ ...s, physics: { ...s.physics, gravityY: Number(e.target.value) || 0 } }))} className="w-full skeuo-well rounded px-2 py-1 text-xs font-mono tabular-nums" />
              </div>
            </div>
          )}
        </section>

        <section className="skeuo-chassis rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-[#1c1b18]">
              {t.layersTitle} {activeScene.name}
            </h2>
            <span className="font-mono text-[11px] tabular-nums text-[#767166]">{activeScene.objects.length}</span>
          </div>
          {activeScene.objects.length === 0 ? (
            <p className="text-xs text-[#706a5f]">{t.noObjects}</p>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {activeScene.objects.map((obj, idx) => (
                <div key={obj.id} className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md border text-xs ${obj.id === selectedObj?.id ? 'bg-white border-[#d94e28] font-semibold' : 'bg-[#f4f2ec] border-[#d4d0c5]'}`}>
                  <button type="button" onClick={() => setSelectedObjId(obj.id)} className="flex-1 text-left truncate font-mono cursor-pointer">
                    {obj.varName}
                  </button>
                  <button type="button" onClick={() => handleMoveLayer(idx, -1)} disabled={idx === 0} aria-label="Move layer up" className="p-0.5 text-[#59554c] disabled:opacity-30 cursor-pointer">
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button type="button" onClick={() => handleMoveLayer(idx, 1)} disabled={idx === activeScene.objects.length - 1} aria-label="Move layer down" className="p-0.5 text-[#59554c] disabled:opacity-30 cursor-pointer">
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button type="button" onClick={() => updateSceneObjects((objs) => objs.filter((o) => o.id !== obj.id))} aria-label={`Delete ${obj.varName}`} className="p-0.5 text-[#9c3a30] cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </aside>

      <section className="lg:col-span-5 skeuo-chassis rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#1c1b18]">{t.stageLabel} · {activeScene.name}</span>
          <span className="font-mono text-[#6e685d]">{activeScene.layout} · {activeScene.theme}</span>
        </div>

        <div
          onClick={() => setSelectedObjId(null)}
          className={`relative min-h-[480px] rounded-lg border overflow-hidden p-8 flex flex-col justify-center items-start gap-4 drafting-grid select-none ${
            THEME_STAGE_CLASSES[activeScene.theme] || THEME_STAGE_CLASSES.minimal
          } ${activeScene.layout === 'two-columns' ? 'sm:grid sm:grid-cols-2 sm:items-center' : ''}`}
        >
          {activeScene.objects.length === 0 ? (
            <div className="m-auto text-center max-w-xs space-y-2 pointer-events-none">
              <div className="text-sm font-semibold opacity-80">{t.emptyStageTitle}</div>
              <p className="text-xs opacity-65">{t.emptyStageSub}</p>
            </div>
          ) : (
            activeScene.objects.map((obj) => {
              const isSelected = obj.id === selectedObj?.id;
              return (
                <div
                  key={obj.id}
                  onPointerDown={(e) => onPointerDown(e, obj)}
                  onPointerMove={onPointerMove}
                  onPointerUp={() => { dragRef.current = null; }}
                  style={{
                    transform: `translate(${obj.x}px, ${obj.y}px) scale(${obj.scale}) rotate(${obj.rotation}deg)`,
                    opacity: obj.visible ? obj.opacity : 0.2,
                  }}
                  className={`relative touch-none cursor-grab active:cursor-grabbing rounded p-1 transition-shadow ${
                    isSelected ? 'ring-2 ring-[#d94e28] ring-offset-2 ring-offset-transparent' : 'hover:ring-1 hover:ring-[#8c8679]/50'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-[#d94e28] text-white font-mono text-[10px] leading-none whitespace-nowrap">
                      #{obj.varName}
                      {obj.physics && obj.physics.bodyType !== 'none' ? ` · ${obj.physics.bodyType}` : ''}
                    </span>
                  )}
                  <StageElementRenderer obj={obj} assets={project.assets} mode="stage" lang={lang} />
                </div>
              );
            })
          )}
        </div>
      </section>

      <aside className="lg:col-span-4 skeuo-chassis rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-[#1c1b18]">{t.inspectorTitle}</h2>
          {selectedObj && (
            <div className="flex items-center gap-1 p-0.5 rounded-md skeuo-well">
              {(['html5', 'style', 'physics'] as InspectorTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setInspectorTab(tab)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                    inspectorTab === tab ? 'bg-white text-[#1c1b18] shadow-sm' : 'text-[#666157]'
                  }`}
                >
                  {t.tabs[tab]}
                </button>
              ))}
            </div>
          )}
        </div>

        {!selectedObj ? (
          <div className="skeuo-well rounded-lg p-4 text-xs text-[#6e685d]">{t.inspectorEmpty}</div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="prop-varname" className="block text-[11px] font-medium text-[#59554c]">objLet</label>
                <input id="prop-varname" type="text" value={selectedObj.varName} onChange={(e) => updateSelected({ varName: sanitizeVarName(e.target.value, 'obj') })} className="w-full skeuo-well rounded-md px-2.5 py-1.5 text-xs font-mono text-[#1c1b18]" />
              </div>
              <div className="space-y-1">
                <label htmlFor="prop-htmlid" className="block text-[11px] font-mono text-[#59554c]">id (HTML5)</label>
                <input id="prop-htmlid" type="text" value={selectedObj.htmlId || ''} onChange={(e) => updateSelected({ htmlId: e.target.value })} placeholder="optional" className="w-full skeuo-well rounded-md px-2.5 py-1.5 text-xs font-mono text-[#1c1b18]" />
              </div>
            </div>

            {inspectorTab === 'html5' && (
              <div className="space-y-2.5 pt-1">
                {selectedObj.kind === 'control' && (
                  <div className="space-y-1">
                    <label htmlFor="prop-text" className="block text-[11px] font-mono text-[#59554c]">textContent</label>
                    <input id="prop-text" type="text" value={selectedObj.text} onChange={(e) => updateSelected({ text: e.target.value })} className="w-full skeuo-well rounded-md px-2.5 py-1.5 text-xs text-[#1c1b18]" />
                  </div>
                )}
                <div className="space-y-1">
                  <label htmlFor="prop-class" className="block text-[11px] font-mono text-[#59554c]">class</label>
                  <input id="prop-class" type="text" value={selectedObj.className || ''} onChange={(e) => updateSelected({ className: e.target.value })} placeholder="shadow-md px-4" className="w-full skeuo-well rounded-md px-2.5 py-1.5 text-xs font-mono text-[#1c1b18]" />
                </div>
                {selectedObj.kind === 'asset' && (
                  <div className="space-y-1">
                    <label htmlFor="prop-src" className="block text-[11px] font-mono text-[#59554c]">src</label>
                    <select id="prop-src" value={selectedObj.srcOverride || ''} onChange={(e) => updateSelected({ srcOverride: e.target.value })} className="w-full skeuo-well rounded-md px-2 py-1.5 text-xs font-mono text-[#1c1b18]">
                      <option value="">(default)</option>
                      {placeableAssets.map((a) => (
                        <option key={a.id} value={a.fileName}>{a.fileName}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label htmlFor="prop-href" className="block text-[11px] font-mono text-[#59554c]">href</label>
                    <input id="prop-href" type="text" value={selectedObj.href || ''} onChange={(e) => updateSelected({ href: e.target.value })} placeholder="https://..." className="w-full skeuo-well rounded-md px-2 py-1 text-xs font-mono text-[#1c1b18]" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="prop-title" className="block text-[11px] font-mono text-[#59554c]">title</label>
                    <input id="prop-title" type="text" value={selectedObj.titleAttr || ''} onChange={(e) => updateSelected({ titleAttr: e.target.value })} className="w-full skeuo-well rounded-md px-2 py-1 text-xs text-[#1c1b18]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label htmlFor="prop-placeholder" className="block text-[11px] font-mono text-[#59554c]">placeholder</label>
                    <input id="prop-placeholder" type="text" value={selectedObj.placeholder || ''} onChange={(e) => updateSelected({ placeholder: e.target.value })} className="w-full skeuo-well rounded-md px-2 py-1 text-xs text-[#1c1b18]" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="prop-alt" className="block text-[11px] font-mono text-[#59554c]">alt</label>
                    <input id="prop-alt" type="text" value={selectedObj.alt || ''} onChange={(e) => updateSelected({ alt: e.target.value })} className="w-full skeuo-well rounded-md px-2 py-1 text-xs text-[#1c1b18]" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-[#34322c] cursor-pointer">
                    <input type="checkbox" checked={Boolean(selectedObj.disabled)} onChange={(e) => updateSelected({ disabled: e.target.checked })} />
                    <span className="font-mono">disabled</span>
                  </label>
                  <button type="button" onClick={() => updateSelected({ visible: !selectedObj.visible })} className="skeuo-keycap px-2.5 py-1 rounded text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer">
                    {selectedObj.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {selectedObj.visible ? t.visible : t.hidden}
                  </button>
                </div>
              </div>
            )}

            {inspectorTab === 'style' && (
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label htmlFor="prop-font" className="block text-[11px] font-mono text-[#59554c]">font</label>
                    <select id="prop-font" value={selectedObj.fontFamily || ''} onChange={(e) => updateSelected({ fontFamily: e.target.value })} className="w-full skeuo-well rounded-md px-2 py-1.5 text-xs font-mono text-[#1c1b18]">
                      <option value="">(default)</option>
                      {fontAssets.map((f) => (
                        <option key={f.id} value={f.fontFamilyName || f.varName}>{f.fontFamilyName || f.varName}</option>
                      ))}
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                      <option value="JetBrains Mono">JetBrains Mono</option>
                      <option value="Georgia, serif">Georgia Serif</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="prop-fontsize" className="block text-[11px] font-mono text-[#59554c]">fontSize</label>
                    <input id="prop-fontsize" type="text" value={selectedObj.fontSize || ''} onChange={(e) => updateSelected({ fontSize: e.target.value })} placeholder="18px" className="w-full skeuo-well rounded-md px-2 py-1.5 text-xs font-mono text-[#1c1b18]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label htmlFor="prop-bg" className="block text-[11px] font-mono text-[#59554c]">backgroundColor</label>
                    <input id="prop-bg" type="text" value={selectedObj.backgroundColor || ''} onChange={(e) => updateSelected({ backgroundColor: e.target.value })} placeholder="#ffffff" className="w-full skeuo-well rounded-md px-2 py-1 text-xs font-mono text-[#1c1b18]" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="prop-color" className="block text-[11px] font-mono text-[#59554c]">color</label>
                    <input id="prop-color" type="text" value={selectedObj.color || ''} onChange={(e) => updateSelected({ color: e.target.value })} placeholder="#1c1b18" className="w-full skeuo-well rounded-md px-2 py-1 text-xs font-mono text-[#1c1b18]" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label htmlFor="prop-w" className="block text-[11px] font-mono text-[#59554c]">width</label>
                    <input id="prop-w" type="text" value={selectedObj.width || ''} onChange={(e) => updateSelected({ width: e.target.value })} placeholder="auto" className="w-full skeuo-well rounded-md px-2 py-1 text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="prop-h" className="block text-[11px] font-mono text-[#59554c]">height</label>
                    <input id="prop-h" type="text" value={selectedObj.height || ''} onChange={(e) => updateSelected({ height: e.target.value })} placeholder="auto" className="w-full skeuo-well rounded-md px-2 py-1 text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="prop-br" className="block text-[11px] font-mono text-[#59554c]">radius</label>
                    <input id="prop-br" type="text" value={selectedObj.borderRadius || ''} onChange={(e) => updateSelected({ borderRadius: e.target.value })} placeholder="8px" className="w-full skeuo-well rounded-md px-2 py-1 text-xs font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1">
                    <label htmlFor="prop-x" className="block text-[11px] font-mono text-[#59554c]">x (px)</label>
                    <input id="prop-x" type="number" value={Math.round(selectedObj.x)} onChange={(e) => updateSelected({ x: Number(e.target.value) || 0 })} className="w-full skeuo-well rounded-md px-2 py-1 text-xs font-mono tabular-nums" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="prop-y" className="block text-[11px] font-mono text-[#59554c]">y (px)</label>
                    <input id="prop-y" type="number" value={Math.round(selectedObj.y)} onChange={(e) => updateSelected({ y: Number(e.target.value) || 0 })} className="w-full skeuo-well rounded-md px-2 py-1 text-xs font-mono tabular-nums" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono tabular-nums text-[#59554c]">
                    <label htmlFor="prop-rot">rotation</label>
                    <span>{Math.round(selectedObj.rotation)}°</span>
                  </div>
                  <input id="prop-rot" type="range" min="-180" max="180" step="1" value={selectedObj.rotation} onChange={(e) => updateSelected({ rotation: Number(e.target.value) })} className="w-full accent-[#d94e28] cursor-pointer" />
                </div>
              </div>
            )}

            {inspectorTab === 'physics' && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label htmlFor="phys-type" className="block text-[11px] font-mono text-[#59554c]">{t.physicsBody}</label>
                    <select id="phys-type" value={selectedObj.physics?.bodyType || 'none'} onChange={(e) => updatePhysics({ bodyType: e.target.value as PhysicsBodyType })} className="w-full skeuo-well rounded-md px-2 py-1.5 text-xs font-mono text-[#1c1b18]">
                      <option value="none">{t.bodyTypes.none}</option>
                      <option value="dynamic">{t.bodyTypes.dynamic}</option>
                      <option value="static">{t.bodyTypes.static}</option>
                      <option value="kinematic">{t.bodyTypes.kinematic}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="phys-shape" className="block text-[11px] font-mono text-[#59554c]">{t.physicsShape}</label>
                    <select id="phys-shape" value={selectedObj.physics?.shape || 'box'} onChange={(e) => updatePhysics({ shape: e.target.value as PhysicsShape })} className="w-full skeuo-well rounded-md px-2 py-1.5 text-xs font-mono text-[#1c1b18]">
                      <option value="box">box</option>
                      <option value="circle">circle</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono tabular-nums text-[#59554c]">
                    <label htmlFor="phys-rest">{t.restitution}</label>
                    <span>{(selectedObj.physics?.restitution ?? 0.45).toFixed(2)}</span>
                  </div>
                  <input id="phys-rest" type="range" min="0" max="1" step="0.05" value={selectedObj.physics?.restitution ?? 0.45} onChange={(e) => updatePhysics({ restitution: Number(e.target.value) })} className="w-full accent-[#d94e28] cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono tabular-nums text-[#59554c]">
                    <label htmlFor="phys-fric">{t.friction}</label>
                    <span>{(selectedObj.physics?.friction ?? 0.3).toFixed(2)}</span>
                  </div>
                  <input id="phys-fric" type="range" min="0" max="1" step="0.05" value={selectedObj.physics?.friction ?? 0.3} onChange={(e) => updatePhysics({ friction: Number(e.target.value) })} className="w-full accent-[#d94e28] cursor-pointer" />
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
