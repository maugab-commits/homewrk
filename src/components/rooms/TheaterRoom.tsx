import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftToLine, Check, ChevronLeft, ChevronRight, Copy, Download, FileCode2, Play, RotateCcw, Square } from 'lucide-react';
import { evaluateTimelinesAtTime, executeFrontScriptEvent, initGlobalsScope } from '../../engine/frontscriptExec';
import { generateFrontScript } from '../../engine/frontscriptGenerator';
import { importFrontScriptToProject, parseFrontScript, ParsedObject } from '../../engine/frontscriptParser';
import { compileToStandaloneHtml } from '../../engine/html5Exporter';
import { PhysicsWorld } from '../../engine/physics';
import { TRANSLATIONS } from '../../i18n/translations';
import { HomewrkProject, Lang } from '../../types/frontscript';
import { StageElementRenderer } from '../StageElementRenderer';

interface TheaterRoomProps {
  lang: Lang;
  project: HomewrkProject;
  onUpdateProject: (updater: (prev: HomewrkProject) => HomewrkProject) => void;
}

const RUNTIME_THEME_CLASSES: Record<string, string> = {
  minimal: 'bg-[#faf9f5] text-[#1c1b18]',
  dark: 'bg-[#191816] text-[#f4f2ed]',
  school: 'bg-[#fdf8e8] text-[#1e293b]',
  history: 'bg-[#f4ecdc] text-[#2d241c]',
  science: 'bg-[#eef5f8] text-[#0f172a]',
  business: 'bg-[#ffffff] text-[#111827]',
};

export function TheaterRoom({ lang, project, onUpdateProject }: TheaterRoomProps) {
  const t = TRANSLATIONS[lang].theater;
  const navT = TRANSLATIONS[lang].nav;
  const generatedSource = useMemo(() => generateFrontScript(project), [project]);
  const isCustomMode = project.customFrontScript !== null;
  const activeSource = isCustomMode ? project.customFrontScript! : generatedSource;
  const parsed = useMemo(() => parseFrontScript(activeSource), [activeSource]);

  const [isRunning, setIsRunning] = useState(true);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [renderTick, setRenderTick] = useState(0);
  const [runtimeLogs, setRuntimeLogs] = useState<string[]>([]);
  const [runtimeErrors, setRuntimeErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [convertedToast, setConvertedToast] = useState(false);

  const globalsRef = useRef<Record<string, unknown>>({});
  const runtimeObjectsRef = useRef<Record<string, ParsedObject>>({});
  const baseObjectsRef = useRef<Record<string, ParsedObject>>({});
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const physicsWorldRef = useRef<PhysicsWorld | null>(null);
  const sceneIdxRef = useRef(0);

  const safeSceneIdx = parsed.scenes.length > 0 ? Math.min(sceneIdx, parsed.scenes.length - 1) : 0;
  const currentScene = parsed.scenes[safeSceneIdx] || null;
  useEffect(() => { sceneIdxRef.current = safeSceneIdx; }, [safeSceneIdx]);

  const appendLog = useCallback((msg: string) => setRuntimeLogs((prev) => [...prev.slice(-19), msg]), []);
  const appendError = useCallback((err: string) => setRuntimeErrors((prev) => (prev.includes(err) ? prev : [...prev.slice(-5), err])), []);

  const getPageObj = useCallback(() => {
    const total = Math.max(1, parsed.scenes.length);
    const idx = sceneIdxRef.current;
    return { index: idx, total, first: idx === 0, last: idx === total - 1 };
  }, [parsed.scenes.length]);

  const handleAudioCommand = useCallback((varName: string, cmd: 'play' | 'pause' | 'stop' | 'seek', arg?: number) => {
    const aud = audioElementsRef.current[varName];
    const obj = runtimeObjectsRef.current[varName];
    if (!aud || !obj) return;
    if (cmd === 'play') { aud.play().catch(() => {}); obj.playing = true; }
    else if (cmd === 'pause') { aud.pause(); obj.playing = false; }
    else if (cmd === 'stop') { aud.pause(); aud.currentTime = 0; obj.playing = false; obj.progress = 0; obj.currentTime = 0; }
    else if (cmd === 'seek' && arg !== undefined) {
      const dur = Number.isFinite(aud.duration) && aud.duration > 0 ? aud.duration : obj.duration;
      const clamped = Math.max(0, Math.min(1, arg));
      if (dur > 0) aud.currentTime = clamped * dur;
      obj.progress = clamped;
      obj.currentTime = aud.currentTime;
    }
    setRenderTick((v) => v + 1);
  }, []);

  const triggerPerSlideVarChange = useCallback(
    (changedVars: string[], scene: typeof currentScene, extra?: { delta?: number; time?: number; frame?: number }) => {
      if (!scene) return;
      const listeners = scene.events.filter((e) => e.eventType === 'onVarChange');
      for (const vName of changedVars) {
        listeners
          .filter((e) => e.targetVarName === vName)
          .forEach((ev) => {
            const err = executeFrontScriptEvent(ev.code, {
              globalsScope: globalsRef.current,
              objectsMap: runtimeObjectsRef.current,
              page: getPageObj(),
              next: () => {},
              back: () => {},
              delta: extra?.delta,
              time: extra?.time,
              frame: extra?.frame,
              log: appendLog,
              onAudioCommand: handleAudioCommand,
            });
            if (err) appendError(err);
          });
      }
    },
    [getPageObj, appendLog, appendError, handleAudioCommand]
  );

  const navigateScene = useCallback(
    (deltaIdx: number) => {
      if (parsed.scenes.length === 0) return;
      const prevScene = parsed.scenes[sceneIdxRef.current];
      prevScene?.events
        .filter((e) => e.eventType === 'onExit')
        .forEach((ev) => {
          const err = executeFrontScriptEvent(ev.code, {
            globalsScope: globalsRef.current,
            objectsMap: runtimeObjectsRef.current,
            page: getPageObj(),
            next: () => {},
            back: () => {},
            log: appendLog,
            onAudioCommand: handleAudioCommand,
          });
          if (err) appendError(err);
        });
      const total = parsed.scenes.length;
      setSceneIdx(((sceneIdxRef.current + deltaIdx) % total + total) % total);
    },
    [parsed.scenes, getPageObj, appendLog, appendError, handleAudioCommand]
  );

  const nextFn = useCallback((n = 1) => navigateScene(n), [navigateScene]);
  const backFn = useCallback((n = 1) => navigateScene(-n), [navigateScene]);

  const restartRuntime = useCallback(() => {
    setRuntimeLogs([]);
    setRuntimeErrors([]);
    const { scope, error } = initGlobalsScope(parsed.globalsCode);
    globalsRef.current = scope;
    if (error) appendError(`Globals: ${error}`);
    setSceneIdx(0);
    sceneIdxRef.current = 0;
    setIsRunning(true);
    setRenderTick((v) => v + 1);
  }, [parsed.globalsCode, appendError]);

  useEffect(() => {
    const { scope, error } = initGlobalsScope(parsed.globalsCode);
    globalsRef.current = scope;
    setRuntimeErrors(error ? [`Globals: ${error}`] : []);
  }, [parsed.globalsCode]);

  useEffect(() => {
    Object.values(audioElementsRef.current).forEach((a) => { a.pause(); a.src = ''; });
    audioElementsRef.current = {};

    if (!currentScene) {
      runtimeObjectsRef.current = {};
      baseObjectsRef.current = {};
      physicsWorldRef.current = null;
      return;
    }

    const objMap: Record<string, ParsedObject> = {};
    const baseMap: Record<string, ParsedObject> = {};
    for (const o of currentScene.objects) {
      const asset = o.kind === 'asset'
        ? project.assets.find((a) => a.fileName === (o.srcOverride || o.assetPath) || a.varName === o.varName)
        : null;
      const copy: ParsedObject = { ...o, duration: asset?.durationSec || 0 };
      objMap[o.varName] = copy;
      baseMap[o.varName] = { ...copy };

      if (asset?.kind === 'audio') {
        const audioEl = new Audio(asset.dataUrl);
        audioEl.addEventListener('loadedmetadata', () => {
          if (Number.isFinite(audioEl.duration)) { copy.duration = audioEl.duration; setRenderTick((v) => v + 1); }
        });
        audioEl.addEventListener('ended', () => { copy.playing = false; copy.progress = 1; setRenderTick((v) => v + 1); });
        audioElementsRef.current[o.varName] = audioEl;
        if (copy.playing && isRunning) audioEl.play().catch(() => {});
      }
    }

    runtimeObjectsRef.current = objMap;
    baseObjectsRef.current = baseMap;

    if (currentScene.physics?.enabled) {
      const world = new PhysicsWorld(currentScene.physics, { minX: -240, maxX: 240, minY: -130, maxY: 140 });
      for (const obj of Object.values(objMap)) {
        if (obj.physics && obj.physics.bodyType !== 'none') {
          world.upsertBody(obj.varName, obj.x, obj.y, obj.rotation, obj.scale, obj.physics);
        }
      }
      physicsWorldRef.current = world;
    } else {
      physicsWorldRef.current = null;
    }

    setRenderTick((v) => v + 1);
    if (!isRunning) return;

    currentScene.events
      .filter((e) => e.eventType === 'onSetup' || e.eventType === 'onEnter')
      .forEach((ev) => {
        const err = executeFrontScriptEvent(ev.code, {
          globalsScope: globalsRef.current,
          objectsMap: runtimeObjectsRef.current,
          page: getPageObj(),
          next: nextFn,
          back: backFn,
          log: appendLog,
          onAudioCommand: handleAudioCommand,
          onGlobalVarsChanged: (changed) => triggerPerSlideVarChange(changed, currentScene),
        });
        if (err) appendError(err);
      });
    setRenderTick((v) => v + 1);

    return () => { Object.values(audioElementsRef.current).forEach((a) => a.pause()); };
  }, [currentScene, isRunning, project.assets, getPageObj, nextFn, backFn, appendLog, appendError, handleAudioCommand, triggerPerSlideVarChange]);

  useEffect(() => {
    if (!isRunning || !currentScene) return;
    const frameEvents = currentScene.events.filter((e) => e.eventType === 'onEnterFrame');
    const hasTimelines = (currentScene.timelines?.length || 0) > 0;
    const hasPhysics = Boolean(currentScene.physics?.enabled);
    const hasAudio = Object.keys(audioElementsRef.current).length > 0;
    if (frameEvents.length === 0 && !hasTimelines && !hasPhysics && !hasAudio) return;

    let rafId = 0;
    let lastTime = performance.now();
    const startTime = performance.now();
    let frameCount = 0;

    const tick = (now: number) => {
      const delta = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      const time = (now - startTime) / 1000;
      frameCount++;
      lastTime = now;

      for (const [varName, aud] of Object.entries(audioElementsRef.current)) {
        const obj = runtimeObjectsRef.current[varName];
        if (!obj) continue;
        const dur = Number.isFinite(aud.duration) && aud.duration > 0 ? aud.duration : obj.duration;
        obj.duration = dur;
        obj.currentTime = aud.currentTime;
        obj.progress = dur > 0 ? Math.min(1, aud.currentTime / dur) : 0;
        obj.playing = !aud.paused && !aud.ended;
      }
      if (hasTimelines) evaluateTimelinesAtTime(currentScene.timelines, runtimeObjectsRef.current, time, baseObjectsRef.current);
      if (hasPhysics && physicsWorldRef.current) {
        physicsWorldRef.current.step(delta);
        for (const [varName, body] of physicsWorldRef.current.bodies.entries()) {
          const obj = runtimeObjectsRef.current[varName];
          if (obj && body.config.bodyType === 'dynamic') { obj.x = body.x; obj.y = body.y; obj.rotation = body.rotation; }
        }
      }

      let hadError = false;
      for (const ev of frameEvents) {
        const err = executeFrontScriptEvent(ev.code, {
          globalsScope: globalsRef.current,
          objectsMap: runtimeObjectsRef.current,
          page: getPageObj(),
          next: nextFn,
          back: backFn,
          delta,
          time,
          frame: frameCount,
          log: appendLog,
          onAudioCommand: handleAudioCommand,
          onGlobalVarsChanged: (changed) => triggerPerSlideVarChange(changed, currentScene, { delta, time, frame: frameCount }),
        });
        if (err) { appendError(err); hadError = true; }
      }
      setRenderTick((v) => v + 1);
      if (!hadError) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isRunning, currentScene, getPageObj, nextFn, backFn, appendLog, appendError, handleAudioCommand, triggerPerSlideVarChange]);

  useEffect(() => {
    if (!isRunning || !currentScene) return;
    const handleKey = (type: 'onKeyDown' | 'onKeyUp', e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      const matching = currentScene.events.filter((ev) => ev.eventType === type);
      if (matching.length === 0) return;
      matching.forEach((ev) => {
        const err = executeFrontScriptEvent(ev.code, {
          globalsScope: globalsRef.current,
          objectsMap: runtimeObjectsRef.current,
          page: getPageObj(),
          next: nextFn,
          back: backFn,
          key: e.key,
          log: appendLog,
          onAudioCommand: handleAudioCommand,
          onGlobalVarsChanged: (changed) => triggerPerSlideVarChange(changed, currentScene),
        });
        if (err) appendError(err);
      });
      setRenderTick((v) => v + 1);
    };
    const onDown = (e: KeyboardEvent) => handleKey('onKeyDown', e);
    const onUp = (e: KeyboardEvent) => handleKey('onKeyUp', e);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [isRunning, currentScene, getPageObj, nextFn, backFn, appendLog, appendError, handleAudioCommand, triggerPerSlideVarChange]);

  const fireObjectEvent = (eventType: string, targetVar: string, value?: unknown) => {
    if (!isRunning || !currentScene) return;
    const matching = currentScene.events.filter((ev) => ev.eventType === eventType && ev.targetVarName === targetVar);
    if (matching.length === 0) return;
    matching.forEach((ev) => {
      const err = executeFrontScriptEvent(ev.code, {
        globalsScope: globalsRef.current,
        objectsMap: runtimeObjectsRef.current,
        page: getPageObj(),
        next: nextFn,
        back: backFn,
        value,
        log: appendLog,
        onAudioCommand: handleAudioCommand,
        onGlobalVarsChanged: (changed) => triggerPerSlideVarChange(changed, currentScene),
      });
      if (err) appendError(err);
    });
    setRenderTick((v) => v + 1);
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  void renderTick;
  const liveObjects = Object.values(runtimeObjectsRef.current);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <section className="lg:col-span-7 skeuo-chassis rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[#1c1b18]">{t.screenTitle}</h2>
            <p className="text-xs text-[#666157]">
              {parsed.scenes.length} {parsed.scenes.length === 1 ? navT.sceneSingular : navT.scenePlural} · {currentScene?.fps || 24} fps
              {currentScene?.physics?.enabled ? ` · ${t.physicsActive}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsRunning((r) => !r)} className="skeuo-keycap px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
              {isRunning ? <Square className="w-3.5 h-3.5 text-[#d94e28]" /> : <Play className="w-3.5 h-3.5 text-[#2f7d4e]" />}
              {isRunning ? t.pause : t.run}
            </button>
            <button type="button" onClick={restartRuntime} className="skeuo-keycap px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />
              {t.restart}
            </button>
          </div>
        </div>

        <div className="rounded-xl border-2 border-[#2d2b26] overflow-hidden shadow-md">
          <div className={`min-h-[400px] p-8 flex flex-col justify-center items-start gap-4 transition-colors ${currentScene ? RUNTIME_THEME_CLASSES[currentScene.theme] || RUNTIME_THEME_CLASSES.minimal : RUNTIME_THEME_CLASSES.minimal} ${currentScene?.layout === 'two-columns' ? 'sm:grid sm:grid-cols-2 sm:items-center' : ''}`}>
            {!currentScene || liveObjects.length === 0 ? (
              <div className="m-auto text-center max-w-xs space-y-2 opacity-75">
                <div className="text-sm font-semibold">{t.emptyScene}</div>
                <p className="text-xs">{t.emptySceneSub}</p>
              </div>
            ) : (
              liveObjects.map((obj) =>
                obj.visible ? (
                  <StageElementRenderer
                    key={obj.varName}
                    obj={obj}
                    assets={project.assets}
                    mode="theater"
                    lang={lang}
                    onEvent={fireObjectEvent}
                    onAudioCommand={handleAudioCommand}
                  />
                ) : null
              )
            )}
          </div>

          <div className="bg-[#23211e] text-[#eae6dc] px-4 py-2.5 flex items-center justify-between text-xs">
            <button type="button" onClick={() => backFn()} disabled={parsed.scenes.length <= 1} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#34312c] hover:bg-[#423e38] disabled:opacity-40 cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5" />
              back()
            </button>
            <span className="font-mono tabular-nums">
              page.index {safeSceneIdx} · {safeSceneIdx + 1} / {Math.max(1, parsed.scenes.length)}
            </span>
            <button type="button" onClick={() => nextFn()} disabled={parsed.scenes.length <= 1} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#34312c] hover:bg-[#423e38] disabled:opacity-40 cursor-pointer">
              next()
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {(parsed.warnings.length > 0 || runtimeErrors.length > 0 || runtimeLogs.length > 0) && (
          <div className="skeuo-well rounded-lg p-3 space-y-1.5 text-xs font-mono">
            {parsed.warnings.map((w, i) => <div key={`w-${i}`} className="text-[#a16207]">Warn: {w}</div>)}
            {runtimeErrors.map((err, i) => <div key={`e-${i}`} className="text-[#c53030]">Error: {err}</div>)}
            {runtimeLogs.map((l, i) => <div key={`l-${i}`} className="text-[#2e2c28]">&gt; {l}</div>)}
          </div>
        )}
      </section>

      <section className="lg:col-span-5 skeuo-chassis rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-[#1c1b18]">
              {t.plainTitle} <span className="font-mono text-xs text-[#767166]">.frontscr</span>
            </h2>
            <p className="text-xs text-[#666157]">{isCustomMode ? t.manualMode : t.autoMode}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onUpdateProject((prev) => importFrontScriptToProject(activeSource, prev));
                setConvertedToast(true);
                window.setTimeout(() => setConvertedToast(false), 2000);
              }}
              className="skeuo-keycap px-2.5 py-1 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeftToLine className="w-3 h-3 text-[#d94e28]" />
              {convertedToast ? t.converted : t.toVisual}
            </button>
            {isCustomMode && (
              <button type="button" onClick={() => onUpdateProject((prev) => ({ ...prev, customFrontScript: null }))} className="skeuo-keycap px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer">
                {t.autoSync}
              </button>
            )}
          </div>
        </div>

        <textarea
          value={activeSource}
          onChange={(e) => onUpdateProject((prev) => ({ ...prev, customFrontScript: e.target.value }))}
          rows={17}
          spellCheck={false}
          aria-label=".frontscr source"
          className="w-full skeuo-screen rounded-lg p-4 text-xs font-mono leading-relaxed text-[#eae6dc] focus:outline-none focus:ring-2 focus:ring-[#d94e28]/60 resize-y"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(activeSource);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1800);
              } catch { /* ignored */ }
            }}
            className="skeuo-keycap px-3 py-2 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#2f7d4e]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t.copied : t.copy}
          </button>
          <button type="button" onClick={() => downloadFile(activeSource, `${project.title || 'project'}.frontscr`, 'text/plain;charset=utf-8')} className="skeuo-keycap px-3 py-2 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer">
            <FileCode2 className="w-3.5 h-3.5 text-[#d94e28]" />
            {t.saveFrontscr}
          </button>
          <button type="button" onClick={() => downloadFile(compileToStandaloneHtml(activeSource, project.assets, project.title, lang), `${project.title || 'project'}.html`, 'text/html;charset=utf-8')} className="skeuo-keycap-accent px-3 py-2 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer">
            <Download className="w-3.5 h-3.5" />
            {t.exportHtml}
          </button>
        </div>
      </section>
    </div>
  );
}
