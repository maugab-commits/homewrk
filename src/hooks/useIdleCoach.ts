import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TRANSLATIONS } from '../i18n/translations';
import { HomewrkProject, Lang, RoomId } from '../types/frontscript';

export const IDLE_THRESHOLD_MS = 12000;

export interface IdleSuggestion {
  id: string;
  targetRoom: RoomId;
  title: string;
  actionLabel: string;
  hint: string;
}

export function useIdleCoach(project: HomewrkProject, activeRoom: RoomId, lang: Lang) {
  const [idleMs, setIdleMs] = useState(0);
  const [isTriggered, setIsTriggered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);

  const lastActivityRef = useRef<number>(Date.now());
  const wasTriggeredRef = useRef<boolean>(false);

  const dismissPrompt = useCallback(() => {
    wasTriggeredRef.current = false;
    setIsTriggered(false);
    lastActivityRef.current = Date.now();
    setIdleMs(0);
    setCycleIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const onActivity = () => {
      if (!wasTriggeredRef.current) {
        lastActivityRef.current = Date.now();
        setIdleMs(0);
      }
    };

    const onHardActivity = () => {
      lastActivityRef.current = Date.now();
      setIdleMs(0);
      if (wasTriggeredRef.current) {
        wasTriggeredRef.current = false;
        setIsTriggered(false);
        setCycleIndex((prev) => prev + 1);
      }
    };

    window.addEventListener('mousemove', onActivity, { passive: true });
    window.addEventListener('pointerdown', onHardActivity, { passive: true });
    window.addEventListener('keydown', onHardActivity, { passive: true });
    window.addEventListener('wheel', onActivity, { passive: true });
    window.addEventListener('input', onHardActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('pointerdown', onHardActivity);
      window.removeEventListener('keydown', onHardActivity);
      window.removeEventListener('wheel', onActivity);
      window.removeEventListener('input', onHardActivity);
    };
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_THRESHOLD_MS) {
        setIdleMs(IDLE_THRESHOLD_MS);
        if (!wasTriggeredRef.current) {
          wasTriggeredRef.current = true;
          setIsTriggered(true);
        }
      } else {
        setIdleMs(elapsed);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  const activeScene = useMemo(
    () => project.scenes.find((s) => s.id === project.activeSceneId) || project.scenes[0],
    [project.scenes, project.activeSceneId]
  );

  const suggestionPool = useMemo<IdleSuggestion[]>(() => {
    const p = TRANSLATIONS[lang].idle.prompts;
    const pool: IdleSuggestion[] = [];
    const totalObjects = project.scenes.reduce((acc, s) => acc + s.objects.length, 0);
    const totalEvents = project.scenes.reduce((acc, s) => acc + s.events.length, 0);
    const totalTweens = project.scenes.reduce((acc, s) => acc + (s.timelines?.length || 0), 0);

    if (totalObjects === 0) {
      pool.push({ id: 'add-control', targetRoom: 'living', title: p.addControlTitle, actionLabel: p.addControlAction, hint: p.addControlHint });
    }
    if (project.assets.length === 0) {
      pool.push({ id: 'add-asset', targetRoom: 'closet', title: p.addAssetTitle, actionLabel: p.addAssetAction, hint: p.addAssetHint });
    }
    if (totalObjects > 0 && totalEvents === 0) {
      pool.push({ id: 'add-event', targetRoom: 'study', title: p.addEventTitle, actionLabel: p.addEventAction, hint: p.addEventHint });
    }
    if (project.scenes.length < 2) {
      pool.push({ id: 'add-scene', targetRoom: 'foyer', title: p.addSceneTitle, actionLabel: p.addSceneAction, hint: p.addSceneHint });
    }
    if (!project.globalsTs.trim()) {
      pool.push({ id: 'add-global', targetRoom: 'foyer', title: p.addGlobalTitle, actionLabel: p.addGlobalAction, hint: p.addGlobalHint });
    }
    if (activeScene && activeScene.objects.length > 0 && totalTweens === 0) {
      pool.push({ id: 'animate', targetRoom: 'study', title: p.animateTitle, actionLabel: p.animateAction, hint: p.animateHint });
    }
    if (totalObjects > 0) {
      pool.push({ id: 'test-theater', targetRoom: 'theater', title: p.testTitle, actionLabel: p.testAction, hint: p.testHint });
    }
    pool.push({ id: 'tweak-theme', targetRoom: 'foyer', title: p.themeTitle, actionLabel: p.themeAction, hint: p.themeHint });

    return [...pool].sort((a, b) => {
      if (a.targetRoom !== activeRoom && b.targetRoom === activeRoom) return -1;
      if (a.targetRoom === activeRoom && b.targetRoom !== activeRoom) return 1;
      return 0;
    });
  }, [project, activeScene, activeRoom, lang]);

  const currentPrompt = suggestionPool[cycleIndex % suggestionPool.length];
  const progressPct = Math.min(100, Math.round((idleMs / IDLE_THRESHOLD_MS) * 100));
  const secondsElapsed = Math.floor(idleMs / 1000);
  const secondsThreshold = Math.floor(IDLE_THRESHOLD_MS / 1000);

  return {
    secondsElapsed,
    secondsThreshold,
    progressPct,
    isTriggered,
    isPaused,
    setIsPaused,
    currentPrompt,
    dismissPrompt,
  };
}
