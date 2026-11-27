import { DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Play, Plus, RotateCcw, Square, Table2, Trash2 } from 'lucide-react';
import { getMaxTimelineDurationSec } from '../../engine/easings';
import { evaluateTimelinesAtTime, executeFrontScriptEvent, initGlobalsScope } from '../../engine/frontscriptExec';
import { rulesToFrontScriptCode, timelinesToMarkdownTable } from '../../engine/frontscriptGenerator';
import { ParsedObject, parseMarkdownTimelineTable } from '../../engine/frontscriptParser';
import { PhysicsWorld } from '../../engine/physics';
import {
  EASE_OPTIONS,
  OPERATORS,
  parseCodeLinesToRules,
  PROPERTY_OPTIONS,
  SCENE_EVENTS,
  TARGET_EVENTS,
  toParsedObjectsMap,
} from '../../engine/studyHelpers';
import { TRANSLATIONS } from '../../i18n/translations';
import {
  EaseType,
  EventBlock,
  EventPropertyKey,
  EventRule,
  EventType,
  HomewrkProject,
  Lang,
  RoomId,
  RuleOperator,
  Scene,
  TimelineTrack,
  TweenStep,
} from '../../types/frontscript';
import { StageElementRenderer } from '../StageElementRenderer';

interface StudyRoomProps {
  lang: Lang;
  project: HomewrkProject;
  activeScene: Scene;
  onUpdateProject: (updater: (prev: HomewrkProject) => HomewrkProject) => void;
  onJumpToRoom: (room: RoomId) => void;
}

export function StudyRoom({ lang, project, activeScene, onUpdateProject, onJumpToRoom }: StudyRoomProps) {
  const t = TRANSLATIONS[lang].study;
  const [selectedEventId, setSelectedEventId] = useState<string | null>(activeScene.events[0]?.id || null);
  const [playheadFrame, setPlayheadFrame] = useState(1);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [draggedRuleIdx, setDraggedRuleIdx] = useState<number | null>(null);
  const [dragOverRuleIdx, setDragOverRuleIdx] = useState<number | null>(null);
  const [previewTick, setPreviewTick] = useState(0);

  const [newTrackTarget, setNewTrackTarget] = useState(activeScene.objects[0]?.varName || '');
  const [newTrackProp, setNewTrackProp] = useState<EventPropertyKey>('x');
  const [selectedStepRef, setSelectedStepRef] = useState<{ trackId: string; stepId: string } | null>(null);
  const [showMarkdownPanel, setShowMarkdownPanel] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState('');

  const previewObjsRef = useRef<Record<string, ParsedObject>>(toParsedObjectsMap(activeScene.objects));
  const baseSnapshotRef = useRef<Record<string, ParsedObject>>(toParsedObjectsMap(activeScene.objects));
  const previewGlobalsRef = useRef<Record<string, unknown>>({});
  const physicsWorldRef = useRef<PhysicsWorld | null>(null);

  const fps = activeScene.fps || 24;
  const maxTweenSec = getMaxTimelineDurationSec(activeScene.timelines || []);
  const totalFrames = Math.max(activeScene.durationFrames || 60, Math.ceil(maxTweenSec * fps), 24);

  const presets: { label: string; property: EventPropertyKey; operator: RuleOperator; formula: string }[] = [
    { label: t.presets.spin, property: 'rotation', operator: '+=', formula: '90 * delta' },
    { label: t.presets.wave, property: 'x', operator: '=', formula: 'Math.sin(time * 3) * 40' },
    { label: t.presets.setVar, property: 'setVar', operator: '+=', formula: '10' },
    { label: t.presets.next, property: 'next', operator: '=', formula: '1' },
    { label: t.presets.setClass, property: 'class', operator: '=', formula: '"active"' },
  ];

  useEffect(() => {
    if (!activeScene.events.some((e) => e.id === selectedEventId)) {
      setSelectedEventId(activeScene.events[0]?.id || null);
    }
    if (!activeScene.objects.some((o) => o.varName === newTrackTarget)) {
      setNewTrackTarget(activeScene.objects[0]?.varName || '');
    }
    setSelectedStepRef(null);
  }, [activeScene.id, activeScene.events, activeScene.objects, selectedEventId, newTrackTarget]);

  const selectedEvent = activeScene.events.find((e) => e.id === selectedEventId) || null;
  const activeRules = useMemo<EventRule[]>(() => {
    if (!selectedEvent) return [];
    if (selectedEvent.rules && selectedEvent.rules.length > 0) return selectedEvent.rules;
    return parseCodeLinesToRules(selectedEvent.code, selectedEvent.targetVarName || activeScene.objects[0]?.varName || 'obj');
  }, [selectedEvent, activeScene.objects]);

  const updateActiveScene = (updater: (s: Scene) => Scene) => {
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === activeScene.id ? updater(s) : s)),
    }));
  };

  const initPhysicsWorld = (objs: Record<string, ParsedObject>) => {
    if (!activeScene.physics?.enabled) {
      physicsWorldRef.current = null;
      return;
    }
    const world = new PhysicsWorld(activeScene.physics, { minX: -140, maxX: 140, minY: -75, maxY: 75 });
    for (const o of Object.values(objs)) {
      if (o.physics && o.physics.bodyType !== 'none') {
        world.upsertBody(o.varName, o.x, o.y, o.rotation, o.scale, o.physics);
      }
    }
    physicsWorldRef.current = world;
  };

  const resetPreviewStage = () => {
    const fresh = toParsedObjectsMap(activeScene.objects);
    previewObjsRef.current = fresh;
    baseSnapshotRef.current = toParsedObjectsMap(activeScene.objects);
    previewGlobalsRef.current = initGlobalsScope(project.globalsTs).scope;
    initPhysicsWorld(fresh);
    setPlayheadFrame(1);
    setPreviewTick((v) => v + 1);
  };

  useEffect(() => {
    if (!isPlayingTimeline) resetPreviewStage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScene.objects, activeScene.id, activeScene.physics, project.globalsTs, isPlayingTimeline]);

  const runPerSlideVarChange = (changedVars: string[], time: number, frame: number) => {
    const varListeners = activeScene.events.filter((e) => e.eventType === 'onVarChange');
    for (const vName of changedVars) {
      varListeners
        .filter((e) => e.targetVarName === vName)
        .forEach((ev) => {
          const body = ev.rules?.length ? rulesToFrontScriptCode(ev.rules) : ev.code;
          executeFrontScriptEvent(body, {
            globalsScope: previewGlobalsRef.current,
            objectsMap: previewObjsRef.current,
            page: { index: 0, total: project.scenes.length, first: true, last: project.scenes.length <= 1 },
            next: () => {},
            back: () => {},
            delta: 1 / fps,
            time,
            frame,
          });
        });
    }
  };

  useEffect(() => {
    if (!isPlayingTimeline) return;
    const frameEvents = activeScene.events.filter((e) => e.eventType === 'onEnterFrame');
    let frameNum = playheadFrame;
    if (activeScene.physics?.enabled && !physicsWorldRef.current) initPhysicsWorld(previewObjsRef.current);

    const id = window.setInterval(() => {
      frameNum = frameNum >= totalFrames ? 1 : frameNum + 1;
      setPlayheadFrame(frameNum);
      const delta = 1 / fps;
      const time = (frameNum - 1) / fps;

      if (frameNum === 1) {
        previewObjsRef.current = toParsedObjectsMap(activeScene.objects);
        baseSnapshotRef.current = toParsedObjectsMap(activeScene.objects);
        initPhysicsWorld(previewObjsRef.current);
      }
      if (activeScene.timelines?.length) {
        evaluateTimelinesAtTime(activeScene.timelines, previewObjsRef.current, time, baseSnapshotRef.current);
      }
      if (activeScene.physics?.enabled && physicsWorldRef.current) {
        physicsWorldRef.current.step(delta);
        for (const [varName, body] of physicsWorldRef.current.bodies.entries()) {
          const obj = previewObjsRef.current[varName];
          if (obj && body.config.bodyType === 'dynamic') {
            obj.x = body.x;
            obj.y = body.y;
            obj.rotation = body.rotation;
          }
        }
      }
      for (const ev of frameEvents) {
        const body = ev.rules?.length ? rulesToFrontScriptCode(ev.rules) : ev.code;
        executeFrontScriptEvent(body, {
          globalsScope: previewGlobalsRef.current,
          objectsMap: previewObjsRef.current,
          page: { index: 0, total: project.scenes.length, first: true, last: project.scenes.length <= 1 },
          next: () => {},
          back: () => {},
          delta,
          time,
          frame: frameNum,
          onGlobalVarsChanged: (changed) => runPerSlideVarChange(changed, time, frameNum),
        });
      }
      setPreviewTick((v) => v + 1);
    }, Math.max(16, Math.round(1000 / fps)));

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayingTimeline, activeScene, fps, totalFrames, project.scenes.length]);

  const handleScrubFrame = (targetFrame: number) => {
    setIsPlayingTimeline(false);
    setPlayheadFrame(targetFrame);
    const simMap = toParsedObjectsMap(activeScene.objects);
    const baseMap = toParsedObjectsMap(activeScene.objects);
    const simGlobals = initGlobalsScope(project.globalsTs).scope;
    const frameEvents = activeScene.events.filter((e) => e.eventType === 'onEnterFrame');

    if (activeScene.timelines?.length) {
      evaluateTimelinesAtTime(activeScene.timelines, simMap, (targetFrame - 1) / fps, baseMap);
    }
    for (let f = 1; f <= targetFrame; f++) {
      for (const ev of frameEvents) {
        const body = ev.rules?.length ? rulesToFrontScriptCode(ev.rules) : ev.code;
        executeFrontScriptEvent(body, {
          globalsScope: simGlobals,
          objectsMap: simMap,
          page: { index: 0, total: project.scenes.length, first: true, last: project.scenes.length <= 1 },
          next: () => {},
          back: () => {},
          delta: 1 / fps,
          time: (f - 1) / fps,
          frame: f,
        });
      }
    }
    previewObjsRef.current = simMap;
    setPreviewTick((v) => v + 1);
  };

  // Tween handlers
  const handleAddTrack = () => {
    const target = newTrackTarget || activeScene.objects[0]?.varName;
    if (!target) return;
    const isStepProp = ['class', 'src', 'text', 'visible'].includes(newTrackProp);
    const step: TweenStep = {
      id: `step_${Date.now()}`,
      durationSec: 0.6,
      toValue: newTrackProp === 'rotation' ? '180' : newTrackProp === 'x' || newTrackProp === 'y' ? '100' : newTrackProp === 'opacity' ? '0.4' : isStepProp ? 'active' : '1.2',
      ease: isStepProp ? 'step' : 'easeInOutCubic',
    };
    const track: TimelineTrack = { id: `track_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, targetVarName: target, property: newTrackProp, steps: [step] };
    updateActiveScene((s) => ({ ...s, timelines: [...(s.timelines || []), track] }));
    setSelectedStepRef({ trackId: track.id, stepId: step.id });
  };

  const handleAddStep = (trackId: string) => {
    const step: TweenStep = { id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, durationSec: 0.5, toValue: '0', ease: 'easeInOutQuad' };
    updateActiveScene((s) => ({ ...s, timelines: s.timelines.map((tl) => (tl.id === trackId ? { ...tl, steps: [...tl.steps, step] } : tl)) }));
    setSelectedStepRef({ trackId, stepId: step.id });
  };

  const handleUpdateStep = (trackId: string, stepId: string, patch: Partial<TweenStep>) => {
    updateActiveScene((s) => ({
      ...s,
      timelines: s.timelines.map((tl) => (tl.id === trackId ? { ...tl, steps: tl.steps.map((st) => (st.id === stepId ? { ...st, ...patch } : st)) } : tl)),
    }));
  };

  const handleDeleteStep = (trackId: string, stepId: string) => {
    updateActiveScene((s) => ({
      ...s,
      timelines: s.timelines.map((tl) => (tl.id === trackId ? { ...tl, steps: tl.steps.filter((st) => st.id !== stepId) } : tl)).filter((tl) => tl.steps.length > 0),
    }));
    setSelectedStepRef(null);
  };

  // Event & vertical `=` rule handlers
  const updateSelectedEvent = (patch: Partial<EventBlock>) => {
    if (!selectedEvent) return;
    updateActiveScene((s) => ({ ...s, events: s.events.map((e) => (e.id === selectedEvent.id ? { ...e, ...patch } : e)) }));
  };

  const commitRules = (nextRules: EventRule[]) => updateSelectedEvent({ rules: nextRules, code: rulesToFrontScriptCode(nextRules) });

  const handleAddEvent = (eventType: EventType = 'onClick') => {
    const firstObj = activeScene.objects[0]?.varName;
    const defaultTarget = eventType === 'onVarChange' ? 'score' : TARGET_EVENTS.includes(eventType) ? firstObj : undefined;
    const rules: EventRule[] =
      eventType === 'onClick'
        ? [{ id: `rule_${Date.now()}`, targetVarName: '__scene__', property: 'next', operator: '=', formula: '1' }]
        : firstObj
        ? [{ id: `rule_${Date.now()}`, targetVarName: firstObj, property: eventType === 'onEnterFrame' ? 'rotation' : 'text', operator: eventType === 'onEnterFrame' ? '+=' : '=', formula: eventType === 'onEnterFrame' ? '90 * delta' : '"Updated"' }]
        : [];
    const ev: EventBlock = { id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, eventType, targetVarName: defaultTarget, rules, code: rulesToFrontScriptCode(rules) };
    updateActiveScene((s) => ({ ...s, events: [...s.events, ev] }));
    setSelectedEventId(ev.id);
  };

  const handleAddRuleRow = (preset?: (typeof presets)[number]) => {
    if (!selectedEvent) return;
    const isNav = preset?.property === 'next' || preset?.property === 'back';
    const isVar = preset?.property === 'setVar';
    commitRules([
      ...activeRules,
      {
        id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        targetVarName: isNav ? '__scene__' : isVar ? '__var__:score' : selectedEvent.targetVarName || activeScene.objects[0]?.varName || 'obj',
        property: preset?.property || 'x',
        operator: preset?.operator || '=',
        formula: preset?.formula || '100',
      },
    ]);
  };

  const handleReorderRule = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= activeRules.length || fromIdx === toIdx) return;
    const copy = [...activeRules];
    const [item] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, item);
    commitRules(copy);
  };

  const selectedTrack = activeScene.timelines?.find((tl) => tl.id === selectedStepRef?.trackId) || null;
  const selectedStep = selectedTrack?.steps.find((s) => s.id === selectedStepRef?.stepId) || null;
  void previewTick;
  const previewObjs = Object.values(previewObjsRef.current);

  return (
    <div className="space-y-6">
      <section className="skeuo-chassis rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[#1c1b18]">
              {t.timelineTitle} · {activeScene.name}
            </h2>
            <p className="text-xs text-[#666157]">
              {t.timelineSub} <span className="font-mono">{fps} fps</span> · <span className="font-mono">.frontscr</span> Markdown
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="FPS" value={fps} onChange={(e) => updateActiveScene((s) => ({ ...s, fps: Number(e.target.value) }))} className="skeuo-well rounded px-2.5 py-1.5 text-xs font-mono text-[#1c1b18]">
              {[12, 24, 30, 60].map((v) => (
                <option key={v} value={v}>{v} fps</option>
              ))}
            </select>
            <span className="font-mono text-xs tabular-nums text-[#34322c] skeuo-well px-2.5 py-1.5 rounded">
              F{String(playheadFrame).padStart(2, '0')}/{totalFrames} · {((playheadFrame - 1) / fps).toFixed(2)}s
            </span>
            <button type="button" onClick={() => setIsPlayingTimeline((p) => !p)} className="skeuo-keycap-accent px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
              {isPlayingTimeline ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlayingTimeline ? t.stop : t.play}
            </button>
            <button type="button" onClick={() => { setIsPlayingTimeline(false); resetPreviewStage(); }} aria-label="Reset playhead" className="skeuo-keycap p-1.5 rounded-md text-[#35332d] cursor-pointer">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!showMarkdownPanel) {
                  setMarkdownDraft(
                    timelinesToMarkdownTable(activeScene.timelines || []) ||
                      `| timeline | step 1 | step 2 |\n| --- | --- | --- |\n| #${activeScene.objects[0]?.varName || 'obj'}.x | [0.5s, 120, "easeOutCubic"] | [0.5s, 0, "easeInOutQuad"] |`
                  );
                }
                setShowMarkdownPanel((v) => !v);
              }}
              className="skeuo-keycap px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Table2 className="w-3.5 h-3.5 text-[#d94e28]" />
              {t.mdTableBtn}
            </button>
          </div>
        </div>

        {showMarkdownPanel && (
          <div className="skeuo-well rounded-lg p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#1c1b18]">{t.mdTableTitle}</span>
              <button
                type="button"
                onClick={() => {
                  updateActiveScene((s) => ({ ...s, timelines: parseMarkdownTimelineTable(markdownDraft) }));
                  setShowMarkdownPanel(false);
                }}
                className="skeuo-keycap-accent px-3 py-1 rounded text-xs font-semibold cursor-pointer"
              >
                {t.convertToFlash}
              </button>
            </div>
            <textarea value={markdownDraft} onChange={(e) => setMarkdownDraft(e.target.value)} rows={5} spellCheck={false} className="w-full skeuo-screen rounded p-3 text-xs font-mono text-[#eae6dc]" />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <select aria-label="Tween element" value={newTrackTarget} onChange={(e) => setNewTrackTarget(e.target.value)} className="skeuo-well rounded px-2.5 py-1.5 text-xs font-mono text-[#1c1b18]">
            {activeScene.objects.length === 0 && <option value="">(no objects)</option>}
            {activeScene.objects.map((o) => (
              <option key={o.id} value={o.varName}>#{o.varName}</option>
            ))}
          </select>
          <select aria-label="Tween property" value={newTrackProp} onChange={(e) => setNewTrackProp(e.target.value as EventPropertyKey)} className="skeuo-well rounded px-2.5 py-1.5 text-xs font-mono text-[#1c1b18]">
            {PROPERTY_OPTIONS.filter((p) => p.group !== 'nav').map((p) => (
              <option key={p.value} value={p.value}>.{p.label}</option>
            ))}
          </select>
          <button type="button" disabled={activeScene.objects.length === 0} onClick={handleAddTrack} className="skeuo-keycap px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer">
            <Plus className="w-3.5 h-3.5 text-[#d94e28]" />
            {t.newTrackBtn}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-8 skeuo-well rounded-lg p-3 overflow-x-auto space-y-2.5">
            <div className="min-w-[560px] space-y-2">
              <div className="flex items-center gap-3 pb-2 border-b border-[#cfcabd]">
                <div className="w-36 shrink-0 text-[11px] font-mono text-[#6e685d]">{t.layerCol} · {fps}fps</div>
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-mono tabular-nums text-[#7a7468] px-1">
                    <span>F1</span><span>F{Math.round(totalFrames * 0.25)}</span><span>F{Math.round(totalFrames * 0.5)}</span><span>F{Math.round(totalFrames * 0.75)}</span><span>F{totalFrames}</span>
                  </div>
                  <input type="range" min={1} max={totalFrames} value={playheadFrame} onChange={(e) => handleScrubFrame(Number(e.target.value))} aria-label="Timeline playhead" className="w-full accent-[#d94e28] cursor-pointer mt-1" />
                </div>
                <div className="w-20 shrink-0 text-right text-[11px] text-[#6e685d]">{t.stepsCol}</div>
              </div>

              {(activeScene.timelines || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-[#6e685d]">
                  {activeScene.objects.length === 0 ? t.emptyObjects : t.emptyTracks}
                </div>
              ) : (
                <div className="divide-y divide-[#d9d4c8]">
                  {activeScene.timelines.map((track) => {
                    let accFrames = 0;
                    return (
                      <div key={track.id} className="flex items-center gap-3 py-2">
                        <div className="w-36 shrink-0 font-mono text-xs text-[#1c1b18] truncate">
                          #{track.targetVarName}.{track.property}
                        </div>
                        <div className="flex-1 h-8 bg-[#f5f3ed] border border-[#cfcabd] rounded relative overflow-hidden flex items-center">
                          {track.steps.map((step) => {
                            const stepFrames = Math.max(1, Math.round(step.durationSec * fps));
                            const leftPct = (accFrames / totalFrames) * 100;
                            const widthPct = Math.max(6, (stepFrames / totalFrames) * 100);
                            accFrames += stepFrames;
                            const isSel = selectedStepRef?.stepId === step.id;
                            return (
                              <button
                                key={step.id}
                                type="button"
                                onClick={() => setSelectedStepRef({ trackId: track.id, stepId: step.id })}
                                style={{ left: `${leftPct}%`, width: `${Math.min(100 - leftPct, widthPct)}%` }}
                                className={`absolute top-1 bottom-1 rounded-sm px-1.5 text-[10px] font-mono flex items-center justify-between overflow-hidden cursor-pointer border ${
                                  isSel ? 'bg-[#d94e28] text-white border-[#a83616]' : 'bg-[#e8ddd6] text-[#1c1b18] border-[#c4a698] hover:bg-[#dfcfc5]'
                                }`}
                              >
                                <span className="truncate">◆ {step.toValue}</span>
                                <span className="opacity-75 shrink-0 ml-1">{stepFrames}f</span>
                              </button>
                            );
                          })}
                          <span className="absolute top-0 bottom-0 w-0.5 bg-[#d94e28] pointer-events-none z-10" style={{ left: `${((playheadFrame - 1) / Math.max(1, totalFrames - 1)) * 100}%` }} />
                        </div>
                        <div className="w-20 shrink-0 flex items-center justify-end gap-1">
                          <button type="button" onClick={() => handleAddStep(track.id)} className="skeuo-keycap px-1.5 py-0.5 rounded text-[11px] cursor-pointer">
                            {t.addStep}
                          </button>
                          <button type="button" onClick={() => updateActiveScene((s) => ({ ...s, timelines: s.timelines.filter((tl) => tl.id !== track.id) }))} aria-label="Delete track" className="p-1 text-[#8c3d35] cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedTrack && selectedStep && (
                <div className="mt-2 pt-2.5 border-t border-[#cfcabd] flex flex-wrap items-center gap-2.5 text-xs">
                  <span className="font-mono font-semibold text-[#1c1b18]">#{selectedTrack.targetVarName}.{selectedTrack.property}</span>
                  <label className="inline-flex items-center gap-1 font-mono">
                    <span>s:</span>
                    <input type="number" step="0.1" min="0.05" value={selectedStep.durationSec} onChange={(e) => handleUpdateStep(selectedTrack.id, selectedStep.id, { durationSec: Math.max(0.05, Number(e.target.value) || 0.1) })} className="w-16 bg-white border border-[#c5c0b3] rounded px-1.5 py-1 font-mono tabular-nums" />
                    <span className="text-[11px] text-[#6e685d]">({Math.round(selectedStep.durationSec * fps)}f)</span>
                  </label>
                  <label className="inline-flex items-center gap-1 font-mono">
                    <span>to:</span>
                    <input type="text" value={selectedStep.toValue} onChange={(e) => handleUpdateStep(selectedTrack.id, selectedStep.id, { toValue: e.target.value })} className="w-24 bg-white border border-[#c5c0b3] rounded px-2 py-1 font-mono" />
                  </label>
                  <label className="inline-flex items-center gap-1 font-mono">
                    <span>ease:</span>
                    <select value={selectedStep.ease} onChange={(e) => handleUpdateStep(selectedTrack.id, selectedStep.id, { ease: e.target.value as EaseType })} className="bg-white border border-[#c5c0b3] rounded px-2 py-1 font-mono">
                      {EASE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={() => handleDeleteStep(selectedTrack.id, selectedStep.id)} className="ml-auto text-xs text-[#9c3a30] hover:underline cursor-pointer">
                    {t.removeStep}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 rounded-lg border border-[#2d2b26] bg-[#1d1c19] text-[#f4f2ed] p-4 flex flex-col justify-center items-center overflow-hidden min-h-[200px] relative">
            <span className="absolute top-2 left-3 text-[10px] font-mono text-[#a6a095]">
              {t.monitorLabel} {activeScene.physics?.enabled ? `· ${t.physicsTag}` : ''}
            </span>
            {previewObjs.length === 0 ? (
              <span className="text-xs text-[#8f897e]">—</span>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {previewObjs.map((obj) =>
                  obj.visible ? <StageElementRenderer key={obj.varName} obj={obj} assets={project.assets} mode="monitor" lang={lang} /> : null
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-4 skeuo-chassis rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-[#1c1b18]">{t.eventsTitle} <span className="font-mono text-xs text-[#767166]">|...|</span></h2>
              <p className="text-xs text-[#666157]">{t.eventsSub}</p>
            </div>
            <button type="button" onClick={() => handleAddEvent('onClick')} className="skeuo-keycap-accent px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              {t.newEvent}
            </button>
          </div>

          {activeScene.events.length === 0 ? (
            <div className="skeuo-well rounded-lg p-6 text-center text-xs text-[#6e685d]">{t.noEvents}</div>
          ) : (
            <div className="space-y-2">
              {activeScene.events.map((ev) => {
                const label = ev.targetVarName
                  ? ev.eventType === 'onVarChange'
                    ? `|onVarChange ${ev.targetVarName}|`
                    : `|${ev.eventType} #${ev.targetVarName}|`
                  : `|${ev.eventType}|`;
                return (
                  <div key={ev.id} className={`rounded-lg border p-3 flex items-center justify-between gap-2 ${ev.id === selectedEvent?.id ? 'bg-white border-[#d94e28] shadow-sm' : 'bg-[#f4f2ec] border-[#d4d0c5]'}`}>
                    <button type="button" onClick={() => setSelectedEventId(ev.id)} className="flex-1 text-left min-w-0 cursor-pointer">
                      <div className="font-mono text-xs font-semibold text-[#1c1b18] truncate">{label}</div>
                      <div className="text-[11px] font-mono text-[#6e685d] truncate mt-0.5">{ev.code.trim() || '//'}</div>
                    </button>
                    <button type="button" onClick={() => updateActiveScene((s) => ({ ...s, events: s.events.filter((x) => x.id !== ev.id) }))} aria-label={`Delete ${label}`} className="skeuo-keycap p-1.5 rounded text-[#8c3d35] shrink-0 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-8 skeuo-chassis rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-[#1c1b18]">{t.rulesTitle}</h2>
              <p className="text-xs text-[#666157]">{t.rulesSub}</p>
            </div>
            <button type="button" onClick={() => onJumpToRoom('theater')} className="text-xs font-semibold text-[#c2421f] hover:underline cursor-pointer">
              {t.toTheater}
            </button>
          </div>

          {!selectedEvent ? (
            <div className="skeuo-well rounded-lg p-8 text-center text-xs text-[#6e685d]">{t.rulesEmpty}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-[#e0ddd4]">
                <div className="space-y-1">
                  <label htmlFor="ev-type" className="block text-xs font-medium text-[#4a473f]">{t.triggerLabel}</label>
                  <select
                    id="ev-type"
                    value={selectedEvent.eventType}
                    onChange={(e) => {
                      const nextType = e.target.value as EventType;
                      updateSelectedEvent({
                        eventType: nextType,
                        targetVarName: nextType === 'onVarChange' ? 'score' : TARGET_EVENTS.includes(nextType) ? selectedEvent.targetVarName || activeScene.objects[0]?.varName : undefined,
                      });
                    }}
                    className="w-full skeuo-well rounded-md px-3 py-2 text-xs font-mono text-[#1c1b18]"
                  >
                    <optgroup label="DOM addEventListener">
                      {TARGET_EVENTS.map((evName) => <option key={evName} value={evName}>{evName}</option>)}
                    </optgroup>
                    <optgroup label="Frame / Reactive / Scene">
                      {SCENE_EVENTS.map((evName) => (
                        <option key={evName} value={evName}>{evName === 'onVarChange' ? t.onVarChangeOption : evName}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {selectedEvent.eventType === 'onVarChange' ? (
                  <div className="space-y-1">
                    <label htmlFor="ev-var-watch" className="block text-xs font-medium text-[#4a473f]">{t.varWatchLabel}</label>
                    <input id="ev-var-watch" type="text" value={selectedEvent.targetVarName || ''} onChange={(e) => updateSelectedEvent({ targetVarName: e.target.value.trim() })} placeholder="score" className="w-full skeuo-well rounded-md px-3 py-2 text-xs font-mono text-[#1c1b18]" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label htmlFor="ev-target" className="block text-xs font-medium text-[#4a473f]">{t.targetLabel}</label>
                    <select id="ev-target" disabled={!TARGET_EVENTS.includes(selectedEvent.eventType)} value={selectedEvent.targetVarName || ''} onChange={(e) => updateSelectedEvent({ targetVarName: e.target.value || undefined })} className="w-full skeuo-well rounded-md px-3 py-2 text-xs font-mono text-[#1c1b18] disabled:opacity-45">
                      <option value="">(none)</option>
                      {activeScene.objects.map((o) => <option key={o.id} value={o.varName}>#{o.varName}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="hidden md:grid md:grid-cols-[28px_1fr_1fr_72px_1.3fr_56px] gap-2 px-2 text-[11px] font-mono text-[#767166]">
                  <span /><span>{t.colElement}</span><span>{t.colProp}</span><span className="text-center font-bold text-[#d94e28]">=</span><span>{t.colFormula}</span><span className="text-right">{t.colOrder}</span>
                </div>

                {activeRules.map((rule, idx) => {
                  const isNav = rule.property === 'next' || rule.property === 'back';
                  const isVar = rule.property === 'setVar';
                  const isDragOver = dragOverRuleIdx === idx && draggedRuleIdx !== idx;
                  const updateRule = (patch: Partial<EventRule>) => commitRules(activeRules.map((r) => (r.id === rule.id ? { ...r, ...patch } : r)));

                  return (
                    <div
                      key={rule.id}
                      draggable
                      onDragStart={() => setDraggedRuleIdx(idx)}
                      onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOverRuleIdx(idx); }}
                      onDragLeave={() => setDragOverRuleIdx(null)}
                      onDrop={() => { if (draggedRuleIdx !== null) handleReorderRule(draggedRuleIdx, idx); setDraggedRuleIdx(null); setDragOverRuleIdx(null); }}
                      onDragEnd={() => { setDraggedRuleIdx(null); setDragOverRuleIdx(null); }}
                      className={`rounded-lg border p-2.5 grid grid-cols-1 md:grid-cols-[28px_1fr_1fr_72px_1.3fr_56px] gap-2 items-center transition-colors ${isDragOver ? 'bg-[#fff7f4] border-[#d94e28]' : 'bg-[#f5f3ed] border-[#d4d0c5]'}`}
                    >
                      <div className="hidden md:flex items-center justify-center text-[#7a7468] cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {isVar ? (
                        <input type="text" value={rule.targetVarName.replace(/^__var__:/, '')} onChange={(e) => updateRule({ targetVarName: `__var__:${e.target.value.trim()}` })} placeholder="score" className="skeuo-well rounded px-2.5 py-1.5 text-xs font-mono text-[#1c1b18]" />
                      ) : (
                        <select disabled={isNav} value={isNav ? '__scene__' : rule.targetVarName} onChange={(e) => updateRule({ targetVarName: e.target.value })} className="skeuo-well rounded px-2.5 py-1.5 text-xs font-mono text-[#1c1b18] disabled:opacity-50">
                          {isNav && <option value="__scene__">Scene (page)</option>}
                          {activeScene.objects.map((o) => <option key={o.id} value={o.varName}>#{o.varName}</option>)}
                        </select>
                      )}

                      <select
                        value={rule.property}
                        onChange={(e) => {
                          const nextProp = e.target.value as EventPropertyKey;
                          const nextIsNav = nextProp === 'next' || nextProp === 'back';
                          updateRule({
                            property: nextProp,
                            targetVarName: nextIsNav ? '__scene__' : nextProp === 'setVar' ? '__var__:score' : rule.targetVarName.startsWith('__') ? activeScene.objects[0]?.varName || 'obj' : rule.targetVarName,
                            operator: nextIsNav ? '=' : rule.operator,
                            formula: nextIsNav ? '1' : rule.formula,
                          });
                        }}
                        className="skeuo-well rounded px-2.5 py-1.5 text-xs font-mono text-[#1c1b18]"
                      >
                        {(['transform', 'html5', 'audio', 'nav'] as const).map((grp) => (
                          <optgroup key={grp} label={grp.toUpperCase()}>
                            {PROPERTY_OPTIONS.filter((p) => p.group === grp).map((p) => (
                              <option key={p.value} value={p.value}>{grp === 'nav' ? p.label : `.${p.label}`}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>

                      <div className="flex justify-center">
                        <select disabled={isNav} value={rule.operator} onChange={(e) => updateRule({ operator: e.target.value as RuleOperator })} className="w-full skeuo-keycap rounded px-2 py-1.5 text-xs font-mono font-bold text-center text-[#d94e28] disabled:opacity-40 cursor-pointer">
                          {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
                        </select>
                      </div>

                      <input type="text" value={rule.formula} onChange={(e) => updateRule({ formula: e.target.value })} placeholder={isNav ? '1' : '90 * delta'} className="skeuo-well rounded px-2.5 py-1.5 text-xs font-mono text-[#1c1b18]" />

                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => handleReorderRule(idx, idx - 1)} disabled={idx === 0} aria-label="Move rule up" className="p-1 text-[#59554c] disabled:opacity-30 cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleReorderRule(idx, idx + 1)} disabled={idx === activeRules.length - 1} aria-label="Move rule down" className="p-1 text-[#59554c] disabled:opacity-30 cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => commitRules(activeRules.filter((r) => r.id !== rule.id))} aria-label="Delete rule" className="p-1 text-[#8c3d35] cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button type="button" onClick={() => handleAddRuleRow()} className="skeuo-keycap-accent px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  {t.addRule}
                </button>
                {presets.map((p) => (
                  <button key={p.label} type="button" onClick={() => handleAddRuleRow(p)} className="skeuo-keycap px-2.5 py-1.5 rounded text-[11px] font-mono text-[#2e2c28] cursor-pointer">
                    + {p.label}
                  </button>
                ))}
              </div>

              <div className="skeuo-screen rounded-lg p-3 text-xs font-mono text-[#d8d3c8] whitespace-pre-wrap">
                {`${
                  selectedEvent.targetVarName
                    ? selectedEvent.eventType === 'onVarChange'
                      ? `|onVarChange ${selectedEvent.targetVarName}|`
                      : `|${selectedEvent.eventType} #${selectedEvent.targetVarName}|`
                    : `|${selectedEvent.eventType}|`
                }\n${rulesToFrontScriptCode(activeRules) || '//'}`}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
