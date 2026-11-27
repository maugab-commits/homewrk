import { Archive, ChevronLeft, ChevronRight, Compass, Film, Home, Layers, PenTool, RotateCcw, Save } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { Lang, ROOM_ORDER, RoomId } from '../types/frontscript';

interface HouseSlideNavProps {
  lang: Lang;
  onChangeLang: (lang: Lang) => void;
  activeRoom: RoomId;
  onSelectRoom: (room: RoomId) => void;
  onPrevRoom: () => void;
  onNextRoom: () => void;
  projectTitle: string;
  sceneCount: number;
  assetCount: number;
  storageBytes: number;
  lastSavedAt: number | null;
  onManualSave: () => void;
  onResetProject: () => void;
}

const ROOM_ICONS: Record<RoomId, typeof Home> = {
  foyer: Compass,
  closet: Archive,
  living: Layers,
  study: PenTool,
  theater: Film,
};

export function HouseSlideNav({
  lang,
  onChangeLang,
  activeRoom,
  onSelectRoom,
  onPrevRoom,
  onNextRoom,
  projectTitle,
  sceneCount,
  assetCount,
  storageBytes,
  lastSavedAt,
  onManualSave,
  onResetProject,
}: HouseSlideNavProps) {
  const t = TRANSLATIONS[lang];
  const currentRoom = t.rooms[activeRoom];
  const kbUsed = (storageBytes / 1024).toFixed(1);
  const savedLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Local';

  return (
    <header className="bg-[#f7f5f0] border-b border-[#d4d0c5]">
      {/* Strict 3-Zone Top Bar */}
      <div className="max-w-[1440px] mx-auto px-5 py-3 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="w-7 h-7 rounded-md skeuo-keycap-accent inline-flex items-center justify-center">
            <Home className="w-3.5 h-3.5 text-white" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-[#1c1b18] whitespace-nowrap shrink-0">
            homewrk
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-6" aria-label="House rooms">
          {ROOM_ORDER.map((id, idx) => {
            const isActive = id === activeRoom;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectRoom(id)}
                className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 cursor-pointer ${
                  isActive
                    ? 'text-[#1c1b18] border-[#d94e28]'
                    : 'text-[#666157] border-transparent hover:text-[#1c1b18]'
                }`}
              >
                {idx + 1}. {t.rooms[id].title}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onManualSave}
            className="skeuo-keycap px-3.5 py-1.5 rounded-md text-xs font-semibold text-[#1c1b18] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#d94e28]" />
            {t.nav.saveLocal}
          </button>
        </div>
      </div>

      {/* Tactile Slide Carousel Bar + Language Toggle */}
      <div className="bg-[#f1efe9] border-t border-[#e0ddd4]">
        <div className="max-w-[1440px] mx-auto px-5 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onPrevRoom}
              aria-label={t.nav.prevRoom}
              title={`${t.nav.prevRoom} (Alt + ←)`}
              className="skeuo-keycap p-1.5 rounded-md text-[#35332d] cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 p-1 rounded-lg skeuo-well overflow-x-auto max-w-full">
              {ROOM_ORDER.map((id) => {
                const Icon = ROOM_ICONS[id];
                const active = id === activeRoom;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectRoom(id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#faf9f5] text-[#1c1b18] shadow-sm border border-[#d4d0c5]'
                        : 'text-[#666157] hover:text-[#1c1b18]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#d94e28]' : 'text-[#847e72]'}`} />
                    <span>{t.rooms[id].title}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onNextRoom}
              aria-label={t.nav.nextRoom}
              title={`${t.nav.nextRoom} (Alt + →)`}
              className="skeuo-keycap p-1.5 rounded-md text-[#35332d] cursor-pointer shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#635e54]">
            <span className="hidden sm:inline font-medium text-[#2c2a26] truncate max-w-[140px]">
              {projectTitle || 'untitled'}
            </span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums whitespace-nowrap shrink-0">
              {sceneCount} {sceneCount === 1 ? t.nav.sceneSingular : t.nav.scenePlural}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums whitespace-nowrap shrink-0">
              {assetCount} {assetCount === 1 ? t.nav.assetSingular : t.nav.assetPlural}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums whitespace-nowrap shrink-0">
              {kbUsed} KB · {savedLabel}
            </span>

            {/* Clean EN / ES Toggle */}
            <div className="flex items-center p-0.5 rounded-md skeuo-well" role="group" aria-label="Language">
              {(['en', 'es'] as Lang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onChangeLang(code)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase cursor-pointer ${
                    lang === code ? 'bg-[#faf9f5] text-[#1c1b18] font-semibold shadow-sm' : 'text-[#666157]'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onResetProject}
              className="inline-flex items-center gap-1 text-xs text-[#7c766a] hover:text-[#c53030] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t.nav.clearHouse}
            </button>
          </div>
        </div>
      </div>

      {/* Room Context Subheader */}
      <div className="max-w-[1440px] mx-auto px-5 py-2.5 flex flex-wrap items-baseline justify-between gap-2 border-t border-[#e5e2d9] bg-[#f7f5f0]">
        <div className="flex items-baseline gap-2.5">
          <h1 className="font-display text-base font-semibold text-[#1c1b18]">
            {currentRoom.title} — {currentRoom.houseArea}
          </h1>
          <span aria-hidden="true" className="text-[#b5b0a3]">·</span>
          <span className="text-xs text-[#666157]">{currentRoom.description}</span>
        </div>
        <span className="text-xs font-mono text-[#767166]">
          {currentRoom.frontscriptAspect}
        </span>
      </div>
    </header>
  );
}
