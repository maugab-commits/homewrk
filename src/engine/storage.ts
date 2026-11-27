import { HomewrkProject, Lang, RoomId, Scene } from '../types/frontscript';

const PROJECT_KEY = 'homewrk_ide_project_v1';
const ROOM_KEY = 'homewrk_ide_active_room_v1';
const LANG_KEY = 'homewrk_ide_lang_v1';

export function createEmptyScene(index = 1): Scene {
  return {
    id: `scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: `Scene ${index}`,
    layout: 'title',
    theme: 'minimal',
    uxNote: '',
    fps: 24,
    durationFrames: 60,
    physics: { enabled: false, gravityX: 0, gravityY: 620 },
    objects: [],
    timelines: [],
    events: [],
  };
}

export function createEmptyProject(): HomewrkProject {
  const firstScene = createEmptyScene(1);
  return {
    id: `proj_${Date.now()}`,
    title: 'my_project',
    globalsTs: '',
    scenes: [firstScene],
    assets: [],
    activeSceneId: firstScene.id,
    customFrontScript: null,
    updatedAt: Date.now(),
  };
}

export function loadProjectFromStorage(): HomewrkProject {
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    if (!raw) return createEmptyProject();
    const parsed = JSON.parse(raw) as HomewrkProject;
    if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      return createEmptyProject();
    }
    const scenes = parsed.scenes.map((s, idx) => ({
      ...createEmptyScene(idx + 1),
      ...s,
      fps: s.fps || 24,
      durationFrames: s.durationFrames || 60,
      physics: s.physics || { enabled: false, gravityX: 0, gravityY: 620 },
      timelines: Array.isArray(s.timelines) ? s.timelines : [],
      objects: Array.isArray(s.objects) ? s.objects : [],
      events: Array.isArray(s.events) ? s.events : [],
    }));
    return {
      ...createEmptyProject(),
      ...parsed,
      scenes,
      assets: Array.isArray(parsed.assets) ? parsed.assets : [],
      activeSceneId: scenes.some((s) => s.id === parsed.activeSceneId)
        ? parsed.activeSceneId
        : scenes[0].id,
    };
  } catch {
    return createEmptyProject();
  }
}

export function saveProjectToStorage(project: HomewrkProject): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(PROJECT_KEY, JSON.stringify({ ...project, updatedAt: Date.now() }));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Local storage quota exceeded',
    };
  }
}

export function loadActiveRoomFromStorage(): RoomId {
  try {
    const saved = localStorage.getItem(ROOM_KEY) as RoomId | null;
    if (saved && ['foyer', 'closet', 'living', 'study', 'theater'].includes(saved)) {
      return saved;
    }
    return 'foyer';
  } catch {
    return 'foyer';
  }
}

export function saveActiveRoomToStorage(roomId: RoomId): void {
  try {
    localStorage.setItem(ROOM_KEY, roomId);
  } catch {
    // Ignore UI preference storage errors
  }
}

export function loadLangFromStorage(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

export function saveLangToStorage(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Ignore UI preference storage errors
  }
}

export function sanitizeVarName(raw: string, fallback = 'obj'): string {
  const cleaned = raw
    .trim()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_$]+/g, '_')
    .replace(/^(\d)/, '_$1')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
}

export function getStorageUsageBytes(): number {
  try {
    return new Blob([localStorage.getItem(PROJECT_KEY) || '']).size;
  } catch {
    return 0;
  }
}
