import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { createEmptyScene, sanitizeVarName } from '../../engine/storage';
import { TRANSLATIONS } from '../../i18n/translations';
import { HomewrkProject, Lang, RoomId, Scene, SceneLayout, SceneTheme } from '../../types/frontscript';

interface FoyerRoomProps {
  lang: Lang;
  project: HomewrkProject;
  activeScene: Scene;
  onUpdateProject: (updater: (prev: HomewrkProject) => HomewrkProject) => void;
  onJumpToRoom: (room: RoomId) => void;
}

const LAYOUT_IDS: SceneLayout[] = ['title', 'title-image', 'two-columns', 'timeline', 'quiz', 'summary', 'free'];

const THEME_OPTIONS: { id: SceneTheme; swatch: string }[] = [
  { id: 'minimal', swatch: '#faf9f5' },
  { id: 'dark', swatch: '#1c1b18' },
  { id: 'school', swatch: '#fdf6dc' },
  { id: 'history', swatch: '#efe5d3' },
  { id: 'science', swatch: '#e5eff4' },
  { id: 'business', swatch: '#ffffff' },
];

export function FoyerRoom({ lang, project, activeScene, onUpdateProject, onJumpToRoom }: FoyerRoomProps) {
  const t = TRANSLATIONS[lang].foyer;
  const activeIdx = project.scenes.findIndex((s) => s.id === activeScene.id);

  const updateActiveScene = (patch: Partial<Scene>) => {
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === activeScene.id ? { ...s, ...patch } : s)),
    }));
  };

  const handleAddScene = () => {
    const next = createEmptyScene(project.scenes.length + 1);
    if (lang === 'es') next.name = `Escena ${project.scenes.length + 1}`;
    onUpdateProject((prev) => ({ ...prev, scenes: [...prev.scenes, next], activeSceneId: next.id }));
  };

  const handleDuplicateScene = (scene: Scene) => {
    const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const copy: Scene = {
      ...scene,
      id: `scene_${uid()}`,
      name: `${scene.name} (${lang === 'es' ? 'copia' : 'copy'})`,
      objects: scene.objects.map((o) => ({ ...o, id: `obj_${uid()}` })),
      timelines: (scene.timelines || []).map((tl) => ({ ...tl, id: `track_${uid()}` })),
      events: scene.events.map((e) => ({ ...e, id: `ev_${uid()}` })),
    };
    onUpdateProject((prev) => ({ ...prev, scenes: [...prev.scenes, copy], activeSceneId: copy.id }));
  };

  const handleDeleteScene = (id: string) => {
    if (project.scenes.length <= 1) return;
    onUpdateProject((prev) => {
      const nextScenes = prev.scenes.filter((s) => s.id !== id);
      const nextActive = prev.activeSceneId === id ? nextScenes[0].id : prev.activeSceneId;
      return { ...prev, scenes: nextScenes, activeSceneId: nextActive };
    });
  };

  const handleMoveScene = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= project.scenes.length) return;
    onUpdateProject((prev) => {
      const arr = [...prev.scenes];
      const [item] = arr.splice(index, 1);
      arr.splice(target, 0, item);
      return { ...prev, scenes: arr };
    });
  };

  const appendGlobalSnippet = (snippet: string) => {
    onUpdateProject((prev) => ({
      ...prev,
      globalsTs: prev.globalsTs.trim() ? `${prev.globalsTs.trimEnd()}\n${snippet}` : snippet,
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <section className="lg:col-span-5 skeuo-chassis rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[#1c1b18]">{t.blueprintTitle}</h2>
            <p className="text-xs text-[#666157]">
              {t.blueprintSub} <span className="font-mono tabular-nums">{project.scenes.length}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddScene}
            className="skeuo-keycap-accent px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.newScene}
          </button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="project-title" className="block text-xs font-medium text-[#4a473f]">
            {t.projectName}
          </label>
          <input
            id="project-title"
            type="text"
            value={project.title}
            onChange={(e) =>
              onUpdateProject((prev) => ({
                ...prev,
                title: sanitizeVarName(e.target.value, 'my_project'),
              }))
            }
            placeholder="my_project"
            className="w-full skeuo-well rounded-lg px-3 py-2 text-sm font-mono text-[#1c1b18] focus:outline-none focus:ring-2 focus:ring-[#d94e28]/40"
          />
        </div>

        <div className="space-y-2.5" role="list">
          {project.scenes.map((scene, idx) => {
            const isSelected = scene.id === activeScene.id;
            return (
              <div
                key={scene.id}
                role="listitem"
                className={`rounded-lg border transition-all p-3 ${
                  isSelected
                    ? 'bg-[#ffffff] border-[#d94e28] shadow-sm'
                    : 'bg-[#f4f2ec] border-[#d6d2c7] hover:border-[#b9b3a6]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateProject((prev) => ({ ...prev, activeSceneId: scene.id }))}
                    className="flex-1 text-left min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs tabular-nums text-[#7a7468]">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm font-semibold text-[#1c1b18] truncate">{scene.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#6e685d] font-mono tabular-nums">
                      <span>{scene.layout}</span>
                      <span>·</span>
                      <span>{scene.theme}</span>
                      <span>·</span>
                      <span>{scene.objects.length} obj</span>
                      <span>·</span>
                      <span>{scene.events.length} ev</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => handleMoveScene(idx, -1)} disabled={idx === 0} aria-label="Move up" className="skeuo-keycap p-1.5 rounded text-[#4a473f] disabled:opacity-35 cursor-pointer">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => handleMoveScene(idx, 1)} disabled={idx === project.scenes.length - 1} aria-label="Move down" className="skeuo-keycap p-1.5 rounded text-[#4a473f] disabled:opacity-35 cursor-pointer">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDuplicateScene(scene)} aria-label="Duplicate" className="skeuo-keycap p-1.5 rounded text-[#4a473f] cursor-pointer">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDeleteScene(scene.id)} disabled={project.scenes.length <= 1} aria-label="Delete" className="skeuo-keycap p-1.5 rounded text-[#8c3d35] disabled:opacity-35 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-[#e0ddd4] flex items-center justify-between gap-3">
          <span className="text-xs text-[#666157] font-mono tabular-nums">
            page.index = {activeIdx} · first = {String(activeIdx === 0)} · last = {String(activeIdx === project.scenes.length - 1)}
          </span>
          <button
            type="button"
            onClick={() => onJumpToRoom('living')}
            className="text-xs font-semibold text-[#c2421f] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.toLiving}
          </button>
        </div>
      </section>

      <div className="lg:col-span-7 space-y-6">
        <section className="skeuo-chassis rounded-xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-[#1c1b18]">{t.directivesTitle}</h2>
              <p className="text-xs text-[#666157]">
                {t.directivesSub}: <span className="font-mono">// layout · // theme · // ux</span>
              </p>
            </div>
            <input
              type="text"
              value={activeScene.name}
              onChange={(e) => updateActiveScene({ name: e.target.value })}
              aria-label="Scene name"
              className="skeuo-well rounded-md px-3 py-1.5 text-xs font-semibold text-[#1c1b18] w-44 focus:outline-none focus:ring-2 focus:ring-[#d94e28]/40"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-[#4a473f]">
              {t.layoutLabel} (<span className="font-mono">// layout:</span>)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LAYOUT_IDS.map((layoutId) => {
                const active = activeScene.layout === layoutId;
                return (
                  <button
                    key={layoutId}
                    type="button"
                    onClick={() => updateActiveScene({ layout: layoutId })}
                    className={`p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                      active
                        ? 'bg-[#1c1b18] text-[#faf9f5] border-[#1c1b18] shadow-sm'
                        : 'bg-[#f4f2ec] text-[#32302b] border-[#d4d0c5] hover:border-[#b0aa9d]'
                    }`}
                  >
                    <div className="font-mono text-xs font-semibold">{layoutId}</div>
                    <div className={`text-[11px] mt-0.5 ${active ? 'text-[#c9c4b8]' : 'text-[#6e685d]'}`}>
                      {t.layouts[layoutId]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-[#4a473f]">
              {t.themeLabel} (<span className="font-mono">// theme:</span>)
            </div>
            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map((opt) => {
                const active = activeScene.theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateActiveScene({ theme: opt.id })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono inline-flex items-center gap-2 border cursor-pointer transition-all ${
                      active
                        ? 'bg-[#ffffff] border-[#d94e28] text-[#1c1b18] font-semibold shadow-sm'
                        : 'bg-[#f4f2ec] border-[#d4d0c5] text-[#4a473f] hover:border-[#b0aa9d]'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-sm border border-black/15 shrink-0" style={{ backgroundColor: opt.swatch }} />
                    {opt.id}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ux-note" className="block text-xs font-medium text-[#4a473f]">
              {t.uxLabel} (<span className="font-mono">// ux:</span>)
            </label>
            <input
              id="ux-note"
              type="text"
              value={activeScene.uxNote}
              onChange={(e) => updateActiveScene({ uxNote: e.target.value })}
              placeholder={t.uxPlaceholder}
              className="w-full skeuo-well rounded-lg px-3 py-2 text-sm text-[#1c1b18] placeholder:text-[#8c8679] focus:outline-none focus:ring-2 focus:ring-[#d94e28]/40"
            />
          </div>
        </section>

        <section className="skeuo-chassis rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-[#1c1b18]">{t.globalsTitle}</h2>
              <p className="text-xs text-[#666157]">{t.globalsSub}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => appendGlobalSnippet('let score: number = 0;')} className="skeuo-keycap px-2.5 py-1 rounded text-[11px] font-mono text-[#2e2c28] cursor-pointer">
                + score
              </button>
              <button type="button" onClick={() => appendGlobalSnippet('let userName: string = "";')} className="skeuo-keycap px-2.5 py-1 rounded text-[11px] font-mono text-[#2e2c28] cursor-pointer">
                + userName
              </button>
              <button type="button" onClick={() => appendGlobalSnippet('const MAX_STEPS: number = 5;')} className="skeuo-keycap px-2.5 py-1 rounded text-[11px] font-mono text-[#2e2c28] cursor-pointer">
                + const
              </button>
            </div>
          </div>

          <textarea
            value={project.globalsTs}
            onChange={(e) => onUpdateProject((prev) => ({ ...prev, globalsTs: e.target.value }))}
            rows={5}
            spellCheck={false}
            placeholder={t.globalsPlaceholder}
            className="w-full skeuo-screen rounded-lg p-3.5 text-xs font-mono text-[#eae6dc] placeholder:text-[#6f6b63] focus:outline-none focus:ring-2 focus:ring-[#d94e28]/60 resize-y"
          />
        </section>
      </div>
    </div>
  );
}
