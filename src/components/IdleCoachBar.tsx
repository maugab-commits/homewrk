import { ArrowRight, Clock, Pause, Play, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { IdleSuggestion } from '../hooks/useIdleCoach';
import { TRANSLATIONS } from '../i18n/translations';
import { Lang, RoomId } from '../types/frontscript';

interface IdleCoachBarProps {
  lang: Lang;
  secondsElapsed: number;
  secondsThreshold: number;
  progressPct: number;
  isTriggered: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  suggestion: IdleSuggestion;
  onDismiss: () => void;
  onJumpToRoom: (room: RoomId) => void;
}

export function IdleCoachBar({
  lang,
  secondsElapsed,
  secondsThreshold,
  progressPct,
  isTriggered,
  isPaused,
  onTogglePause,
  suggestion,
  onDismiss,
  onJumpToRoom,
}: IdleCoachBarProps) {
  const t = TRANSLATIONS[lang].idle;

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-4 px-5 py-1.5 bg-[#eae7de] border-b border-[#d4d0c5] text-xs text-[#59554c]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#3b3832] whitespace-nowrap shrink-0">
            <Clock className="w-3.5 h-3.5 text-[#767166]" />
            {t.label}
          </span>
          <span aria-hidden="true" className="text-[#b5b0a3]">·</span>
          <span className="font-mono tabular-nums whitespace-nowrap shrink-0">
            {isPaused ? t.paused : `${String(secondsElapsed).padStart(2, '0')}s / ${secondsThreshold}s`}
          </span>
          <div className="hidden sm:block w-36 h-1.5 rounded-full skeuo-well overflow-hidden shrink-0">
            <div
              className="h-full transition-[width] duration-200 ease-out rounded-full"
              style={{
                width: `${isPaused ? 0 : progressPct}%`,
                backgroundColor: isTriggered ? '#d94e28' : '#7b7568',
              }}
            />
          </div>
          <span className="hidden md:inline truncate text-[#706b60]">
            {t.hint} {secondsThreshold}s.
          </span>
        </div>

        <button
          type="button"
          onClick={onTogglePause}
          className="skeuo-keycap px-2.5 py-1 rounded text-[11px] font-medium text-[#34322c] inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          {isPaused ? t.resume : t.pause}
        </button>
      </div>

      <AnimatePresence>
        {isTriggered && !isPaused && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-4xl px-4 pt-3"
          >
            <div className="skeuo-chassis rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs font-mono text-[#c2542d] tabular-nums">
                  {t.triggeredPrefix} {secondsThreshold}s
                </div>
                <div className="text-sm font-semibold text-[#1c1b18] truncate">{suggestion.title}</div>
                <p className="text-xs text-[#5d5950]">{suggestion.hint}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onJumpToRoom(suggestion.targetRoom);
                    onDismiss();
                  }}
                  className="skeuo-keycap-accent px-3.5 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {suggestion.actionLabel}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  aria-label={t.dismiss}
                  className="skeuo-keycap p-1.5 rounded-md text-[#5d5950] hover:text-[#1c1b18] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
