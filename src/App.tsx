import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HouseSlideNav } from './components/HouseSlideNav';
import { IdleCoachBar } from './components/IdleCoachBar';
import { ClosetRoom } from './components/rooms/ClosetRoom';
import { FoyerRoom } from './components/rooms/FoyerRoom';
import { LivingRoom } from './components/rooms/LivingRoom';
import { StudyRoom } from './components/rooms/StudyRoom';
import { TheaterRoom } from './components/rooms/TheaterRoom';
import {
  createEmptyProject,
  getStorageUsageBytes,
  loadActiveRoomFromStorage,
  loadLangFromStorage,
  loadProjectFromStorage,
  saveActiveRoomToStorage,
  saveLangToStorage,
  saveProjectToStorage,
} from './engine/storage';
import { useIdleCoach } from './hooks/useIdleCoach';
import { TRANSLATIONS } from './i18n/translations';
import { HomewrkProject, Lang, ROOM_ORDER, RoomId } from './types/frontscript';

export default function App() {
  const [project, setProject] = useState<HomewrkProject>(() => loadProjectFromStorage());
  const [activeRoom, setActiveRoom] = useState<RoomId>(() => loadActiveRoomFromStorage());
  const [lang, setLang] = useState<Lang>(() => loadLangFromStorage());
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [storageBytes, setStorageBytes] = useState<number>(() => getStorageUsageBytes());
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(() => Date.now());
  const [storageError, setStorageError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const tNav = TRANSLATIONS[lang].nav;
  const activeScene = useMemo(
    () => project.scenes.find((s) => s.id === project.activeSceneId) || project.scenes[0],
    [project.scenes, project.activeSceneId]
  );

  const persistNow = useCallback((proj: HomewrkProject) => {
    const res = saveProjectToStorage(proj);
    if (res.ok) {
      setStorageError(null);
      setLastSavedAt(Date.now());
      setStorageBytes(getStorageUsageBytes());
    } else {
      setStorageError(res.error || 'Could not save to localStorage');
    }
  }, []);

  useEffect(() => { persistNow(project); }, [project, persistNow]);
  useEffect(() => { saveActiveRoomToStorage(activeRoom); }, [activeRoom]);
  useEffect(() => {
    saveLangToStorage(lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const selectRoom = useCallback(
    (target: RoomId) => {
      if (target === activeRoom) return;
      setSlideDirection(ROOM_ORDER.indexOf(target) >= ROOM_ORDER.indexOf(activeRoom) ? 1 : -1);
      setActiveRoom(target);
    },
    [activeRoom]
  );

  const handlePrevRoom = useCallback(() => {
    const idx = ROOM_ORDER.indexOf(activeRoom);
    setSlideDirection(-1);
    setActiveRoom(ROOM_ORDER[(idx - 1 + ROOM_ORDER.length) % ROOM_ORDER.length]);
  }, [activeRoom]);

  const handleNextRoom = useCallback(() => {
    const idx = ROOM_ORDER.indexOf(activeRoom);
    setSlideDirection(1);
    setActiveRoom(ROOM_ORDER[(idx + 1) % ROOM_ORDER.length]);
  }, [activeRoom]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); handlePrevRoom(); }
      else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); handleNextRoom(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePrevRoom, handleNextRoom]);

  const idle = useIdleCoach(project, activeRoom, lang);

  const handleConfirmReset = () => {
    const fresh = createEmptyProject();
    if (lang === 'es') {
      fresh.title = 'mi_proyecto';
      fresh.scenes[0].name = 'Escena 1';
    }
    setProject(fresh);
    persistNow(fresh);
    setConfirmReset(false);
    selectRoom('foyer');
  };

  const fontFaceCss = useMemo(
    () =>
      project.assets
        .filter((a) => a.kind === 'font' && a.dataUrl)
        .map((f) => `@font-face { font-family: ${JSON.stringify(f.fontFamilyName || f.varName)}; src: url(${JSON.stringify(f.dataUrl)}); font-display: swap; }`)
        .join('\n'),
    [project.assets]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#efede8] text-[#1c1b18]">
      {fontFaceCss && <style>{fontFaceCss}</style>}
      <HouseSlideNav
        lang={lang}
        onChangeLang={setLang}
        activeRoom={activeRoom}
        onSelectRoom={selectRoom}
        onPrevRoom={handlePrevRoom}
        onNextRoom={handleNextRoom}
        projectTitle={project.title}
        sceneCount={project.scenes.length}
        assetCount={project.assets.length}
        storageBytes={storageBytes}
        lastSavedAt={lastSavedAt}
        onManualSave={() => persistNow(project)}
        onResetProject={() => setConfirmReset(true)}
      />

      <IdleCoachBar
        lang={lang}
        secondsElapsed={idle.secondsElapsed}
        secondsThreshold={idle.secondsThreshold}
        progressPct={idle.progressPct}
        isTriggered={idle.isTriggered}
        isPaused={idle.isPaused}
        onTogglePause={() => idle.setIsPaused((p) => !p)}
        suggestion={idle.currentPrompt}
        onDismiss={idle.dismissPrompt}
        onJumpToRoom={selectRoom}
      />

      {confirmReset && (
        <div className="max-w-[1440px] w-full mx-auto px-5 pt-3">
          <div className="skeuo-chassis rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-[#c53030]">
            <span className="text-xs font-medium text-[#1c1b18]">{tNav.clearConfirm}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleConfirmReset} className="skeuo-keycap-accent px-3 py-1 rounded text-xs font-semibold cursor-pointer">
                {tNav.clearYes}
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="skeuo-keycap px-3 py-1 rounded text-xs font-medium cursor-pointer">
                {tNav.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {storageError && (
        <div className="max-w-[1440px] w-full mx-auto px-5 pt-3">
          <div className="rounded-lg px-4 py-2 bg-[#fef2f2] border border-[#f5c2c2] text-xs text-[#9b1c1c]">{storageError}</div>
        </div>
      )}

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-5 py-6 overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeRoom}
            initial={{ opacity: 0, x: slideDirection * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDirection * -24 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeRoom === 'foyer' && <FoyerRoom lang={lang} project={project} activeScene={activeScene} onUpdateProject={setProject} onJumpToRoom={selectRoom} />}
            {activeRoom === 'closet' && <ClosetRoom lang={lang} project={project} activeScene={activeScene} onUpdateProject={setProject} onJumpToRoom={selectRoom} />}
            {activeRoom === 'living' && <LivingRoom lang={lang} project={project} activeScene={activeScene} onUpdateProject={setProject} onJumpToRoom={selectRoom} />}
            {activeRoom === 'study' && <StudyRoom lang={lang} project={project} activeScene={activeScene} onUpdateProject={setProject} onJumpToRoom={selectRoom} />}
            {activeRoom === 'theater' && <TheaterRoom lang={lang} project={project} onUpdateProject={setProject} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
