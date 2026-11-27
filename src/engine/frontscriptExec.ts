import { TimelineTrack } from '../types/frontscript';
import { interpolateTimelineValue } from './easings';
import { normalizeQuotes, ParsedObject, stripSimpleTsTypes } from './frontscriptParser';

const PROP_TO_FIELD: Record<string, keyof ParsedObject> = {
  class: 'className',
  className: 'className',
  src: 'srcOverride',
  font: 'fontFamily',
  title: 'titleAttr',
  value: 'valueAttr',
  id: 'htmlId',
  htmlId: 'htmlId',
};

function mapField(prop: string): keyof ParsedObject {
  return PROP_TO_FIELD[prop] || (prop as keyof ParsedObject);
}

export function evaluateTimelinesAtTime(
  tracks: TimelineTrack[],
  objectsMap: Record<string, ParsedObject>,
  timeSec: number,
  baseSnapshot: Record<string, ParsedObject>
) {
  for (const track of tracks) {
    const target = objectsMap[track.targetVarName];
    const base = baseSnapshot[track.targetVarName];
    if (!target || !base || track.steps.length === 0) continue;

    const field = mapField(track.property);
    let elapsed = 0;
    let fromVal: unknown = base[field];

    for (const step of track.steps) {
      const dur = Math.max(0.01, Number(step.durationSec) || 0.5);
      if (timeSec <= elapsed + dur) {
        const t = Math.max(0, Math.min(1, (timeSec - elapsed) / dur));
        (target as unknown as Record<string, unknown>)[field] = interpolateTimelineValue(
          fromVal,
          step.toValue,
          t,
          step.ease
        );
        break;
      }
      fromVal = interpolateTimelineValue(fromVal, step.toValue, 1, step.ease);
      (target as unknown as Record<string, unknown>)[field] = fromVal;
      elapsed += dur;
    }
  }
}

function applyProp(target: ParsedObject, prop: string, op: string, evaluated: unknown) {
  const field = mapField(prop);
  if (field === 'x' || field === 'y' || field === 'scale' || field === 'rotation' || field === 'opacity' || field === 'progress' || field === 'currentTime') {
    const cur = Number(target[field]) || 0;
    const rhs = Number(evaluated);
    if (Number.isNaN(rhs)) return;
    let next = rhs;
    if (op === '+=') next = cur + rhs;
    else if (op === '-=') next = cur - rhs;
    else if (op === '*=') next = cur * rhs;
    else if (op === '/=' && rhs !== 0) next = cur / rhs;
    if (field === 'opacity' || field === 'progress') next = Math.max(0, Math.min(1, next));
    target[field] = next;
    return;
  }

  if (field === 'visible' || field === 'disabled' || field === 'playing') {
    target[field] = typeof evaluated === 'string' ? evaluated !== 'false' && evaluated !== '0' : Boolean(evaluated);
    return;
  }

  const str = evaluated == null ? '' : String(evaluated);
  (target as unknown as Record<string, unknown>)[field] = op === '+=' ? `${target[field] || ''}${str}` : str;
}

function rewriteRefs(expr: string, objKeys: string[]): string {
  let out = normalizeQuotes(expr).trim();
  out = out.replace(/#([a-zA-Z0-9_$-]+)\./g, (_, n) => `__objs[${JSON.stringify(n)}].`);
  out = out.replace(/#([a-zA-Z0-9_$-]+)/g, (_, n) => `__objs[${JSON.stringify(n)}]`);

  for (const k of [...objKeys].sort((a, b) => b.length - a.length)) {
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-zA-Z0-9_$."'\`])${escaped}\\.([a-zA-Z]+)\\b`, 'g');
    out = out.replace(re, (_, prefix, prop) => `${prefix}__objs[${JSON.stringify(k)}].${mapField(prop)}`);
  }
  return out;
}

function evalExpr(
  expr: string,
  env: {
    __objs: Record<string, ParsedObject>;
    __globals: Record<string, unknown>;
    page: { index: number; total: number; first: boolean; last: boolean };
    delta: number;
    time: number;
    frame: number;
    value: unknown;
    key?: string;
  }
): unknown {
  const clean = rewriteRefs(expr, Object.keys(env.__objs));
  if (!clean) return '';

  const globalSync = Object.keys(env.__globals)
    .filter((k) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k))
    .map((k) => `var ${k} = __globals[${JSON.stringify(k)}];`)
    .join('\n');

  try {
    return new Function(
      '__objs',
      '__globals',
      'page',
      'delta',
      'time',
      'frame',
      'value',
      'key',
      `${globalSync}\nreturn (${clean});`
    )(env.__objs, env.__globals, env.page, env.delta, env.time, env.frame, env.value, env.key);
  } catch {
    if (/^[a-zA-Z0-9_\-#\s.%]+$/.test(expr.trim()) && !/^(true|false|null|undefined)$/.test(expr.trim())) {
      return expr.trim();
    }
    throw new SyntaxError(`Invalid expression: ${expr}`);
  }
}

export function executeFrontScriptEvent(
  code: string,
  ctx: {
    globalsScope: Record<string, unknown>;
    objectsMap: Record<string, ParsedObject>;
    page: { index: number; total: number; first: boolean; last: boolean };
    next: (n?: number) => void;
    back: (n?: number) => void;
    delta?: number;
    time?: number;
    frame?: number;
    value?: unknown;
    key?: string;
    log?: (msg: string) => void;
    onAudioCommand?: (varName: string, cmd: 'play' | 'pause' | 'stop' | 'seek', arg?: number) => void;
    onGlobalVarsChanged?: (changedVars: string[]) => void;
  }
): string | null {
  const normalized = stripSimpleTsTypes(code).trim();
  if (!normalized) return null;

  const beforeGlobals = { ...ctx.globalsScope };
  const env = {
    __objs: ctx.objectsMap,
    __globals: ctx.globalsScope,
    page: ctx.page,
    delta: ctx.delta ?? 0.016,
    time: ctx.time ?? 0,
    frame: ctx.frame ?? 1,
    value: ctx.value,
    key: ctx.key,
  };

  try {
    let handledAll = true;
    for (const rawLine of normalized.split(/\r?\n/)) {
      const line = rawLine.trim().replace(/;$/, '');
      if (!line || line.startsWith('//')) continue;

      const navMatch = line.match(/^(next|back)\((.*)\)$/);
      if (navMatch) {
        const arg = navMatch[2].trim();
        const n = arg ? Number(evalExpr(arg, env)) : 1;
        (navMatch[1] === 'next' ? ctx.next : ctx.back)(Number.isNaN(n) ? 1 : n);
        continue;
      }

      const logMatch = line.match(/^log\((.*)\)$/);
      if (logMatch) {
        ctx.log?.(String(evalExpr(logMatch[1], env)));
        continue;
      }

      const audioCall = line.match(/^#?([a-zA-Z0-9_$-]+)\.(play|pause|stop)\(\)$/);
      if (audioCall && ctx.objectsMap[audioCall[1]]) {
        const [, varName, cmd] = audioCall;
        const target = ctx.objectsMap[varName];
        target.playing = cmd === 'play';
        if (cmd === 'stop') {
          target.progress = 0;
          target.currentTime = 0;
        }
        ctx.onAudioCommand?.(varName, cmd as 'play' | 'pause' | 'stop');
        continue;
      }

      const propAssign = line.match(/^#?([a-zA-Z0-9_$-]+)\.([a-zA-Z]+)\s*(\+=|-=|\*=|\/=|=)\s*(.+)$/);
      if (propAssign && ctx.objectsMap[propAssign[1]]) {
        const [, varName, prop, op, rhs] = propAssign;
        const target = ctx.objectsMap[varName];
        applyProp(target, prop, op, evalExpr(rhs, env));
        if (prop === 'playing') ctx.onAudioCommand?.(varName, target.playing ? 'play' : 'pause');
        else if (prop === 'progress') ctx.onAudioCommand?.(varName, 'seek', target.progress);
        continue;
      }

      const varAssign = line.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(\+=|-=|\*=|\/=|=)\s*(.+)$/);
      if (varAssign && !ctx.objectsMap[varAssign[1]]) {
        const [, gName, op, rhs] = varAssign;
        const val = evalExpr(rhs, env);
        const cur = ctx.globalsScope[gName];
        if (op === '=') ctx.globalsScope[gName] = val;
        else if (op === '+=') ctx.globalsScope[gName] = (Number(cur) || 0) + (Number(val) || 0);
        else if (op === '-=') ctx.globalsScope[gName] = (Number(cur) || 0) - (Number(val) || 0);
        else if (op === '*=') ctx.globalsScope[gName] = (Number(cur) || 0) * (Number(val) || 0);
        else if (op === '/=' && Number(val) !== 0) ctx.globalsScope[gName] = (Number(cur) || 0) / Number(val);
        continue;
      }

      handledAll = false;
      break;
    }

    if (!handledAll) {
      const body = rewriteRefs(normalized, Object.keys(ctx.objectsMap));
      const keys = Object.keys(ctx.globalsScope).filter((k) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k));
      const before = keys.map((k) => `var ${k} = __globals[${JSON.stringify(k)}];`).join('\n');
      const after = keys.map((k) => `__globals[${JSON.stringify(k)}] = ${k};`).join('\n');
      new Function(
        '__objs',
        '__globals',
        'page',
        'next',
        'back',
        'delta',
        'time',
        'frame',
        'value',
        'key',
        'log',
        `${before}\ntry {\n${body}\n} finally {\n${after}\n}`
      )(
        ctx.objectsMap,
        ctx.globalsScope,
        ctx.page,
        ctx.next,
        ctx.back,
        env.delta,
        env.time,
        env.frame,
        ctx.value,
        ctx.key,
        ctx.log || (() => {})
      );
    }

    if (ctx.onGlobalVarsChanged) {
      const changed = Object.keys(ctx.globalsScope).filter((k) => ctx.globalsScope[k] !== beforeGlobals[k]);
      if (changed.length > 0) ctx.onGlobalVarsChanged(changed);
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

export function initGlobalsScope(globalsCode: string): { scope: Record<string, unknown>; error: string | null } {
  const scope: Record<string, unknown> = {};
  const cleaned = stripSimpleTsTypes(globalsCode).trim();
  if (!cleaned) return { scope, error: null };

  try {
    const names = new Set<string>();
    for (const m of cleaned.matchAll(/\b(?:let|const|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g)) {
      names.add(m[1]);
    }
    const exportLines = Array.from(names)
      .map((n) => `if (typeof ${n} !== 'undefined') __scope[${JSON.stringify(n)}] = ${n};`)
      .join('\n');
    new Function('__scope', `${cleaned}\n${exportLines}`)(scope);
    return { scope, error: null };
  } catch (err) {
    return { scope, error: err instanceof Error ? err.message : String(err) };
  }
}
