import {
  ControlKind,
  EaseType,
  EventPropertyKey,
  EventType,
  HomewrkProject,
  ObjectPhysicsConfig,
  PhysicsBodyType,
  PhysicsShape,
  Scene,
  SceneLayout,
  ScenePhysicsConfig,
  SceneTheme,
  StageObject,
  TimelineTrack,
  TweenStep,
} from '../types/frontscript';

export interface ParsedObject {
  varName: string;
  kind: 'control' | 'asset';
  controlKind?: ControlKind;
  text: string;
  assetPath?: string;
  htmlId?: string;
  srcOverride?: string;
  className?: string;
  href?: string;
  alt?: string;
  titleAttr?: string;
  placeholder?: string;
  valueAttr?: string;
  disabled?: boolean;
  fontFamily?: string;
  fontSize?: string;
  backgroundColor?: string;
  color?: string;
  borderRadius?: string;
  width?: string;
  height?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  playing: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  physics?: ObjectPhysicsConfig;
}

export interface ParsedEvent {
  eventType: EventType;
  targetVarName?: string;
  code: string;
}

export interface ParsedScene {
  index: number;
  name: string;
  layout: SceneLayout;
  theme: SceneTheme;
  uxNote: string;
  fps: number;
  physics: ScenePhysicsConfig;
  objects: ParsedObject[];
  timelines: TimelineTrack[];
  events: ParsedEvent[];
}

export interface ParsedProgram {
  globalsCode: string;
  scenes: ParsedScene[];
  warnings: string[];
}

const VALID_EASES = new Set<EaseType>([
  'linear',
  'easeInQuad',
  'easeOutQuad',
  'easeInOutQuad',
  'easeInOutCubic',
  'easeOutBack',
  'easeOutBounce',
  'step',
]);

export function normalizeQuotes(str: string): string {
  return str.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
}

export function stripSimpleTsTypes(code: string): string {
  return normalizeQuotes(code)
    .replace(/^(?:export\s+)?(?:interface|type)\s+[A-Za-z0-9_]+\s*(?:=\s*[^;\n]+;?|\{[\s\S]*?\})/gm, '')
    .replace(/\b(let|const|var)\s+([A-Za-z0-9_$]+)\s*:\s*[^=;\n]+(?=\s*=)/g, '$1 $2')
    .replace(/(\([A-Za-z0-9_$,\s]*?)\s*:\s*[A-Za-z0-9_<>\[\]\|\s]+(?=[,)])/g, '$1')
    .replace(/\)\s*:\s*[A-Za-z0-9_<>\[\]\|\s]+\s*\{/g, ') {')
    .replace(/\s+as\s+[A-Za-z0-9_<>\[\]\|]+/g, '');
}

function unescapeStr(str: string): string {
  return str.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function parseImmediateAttrs(rawArgs: string): Partial<ParsedObject> {
  const attrs: Partial<ParsedObject> = {};
  const attrMap: Record<string, keyof ParsedObject> = {
    id: 'htmlId',
    src: 'srcOverride',
    class: 'className',
    className: 'className',
    href: 'href',
    alt: 'alt',
    title: 'titleAttr',
    placeholder: 'placeholder',
    value: 'valueAttr',
    font: 'fontFamily',
    fontSize: 'fontSize',
    backgroundColor: 'backgroundColor',
    color: 'color',
    borderRadius: 'borderRadius',
    width: 'width',
    height: 'height',
  };
  const re = /\b([a-zA-Z]+)\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawArgs)) !== null) {
    const mapped = attrMap[m[1]];
    if (mapped) (attrs as Record<string, unknown>)[mapped] = unescapeStr(m[2]);
  }
  return attrs;
}

function parseTweenVectorCell(cell: string): TweenStep | null {
  const m = cell.trim().match(/^\[([\s\S]+)\]$/);
  if (!m) return null;

  const parts: string[] = [];
  let cur = '';
  let inQuotes = false;
  let qChar = '';
  for (let i = 0; i < m[1].length; i++) {
    const ch = m[1][i];
    if ((ch === '"' || ch === "'") && m[1][i - 1] !== '\\') {
      if (!inQuotes) {
        inQuotes = true;
        qChar = ch;
      } else if (qChar === ch) inQuotes = false;
      cur += ch;
    } else if (ch === ',' && !inQuotes) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  if (parts.length < 2) return null;

  const durationSec = Math.max(0.05, Number(parts[0].replace(/s$/i, '').trim()) || 0.5);
  const toValue = parts[1].replace(/^["']|["']$/g, '');
  const easeRaw = (parts[2] || 'linear').replace(/^["']|["']$/g, '') as EaseType;

  return {
    id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    durationSec,
    toValue,
    ease: VALID_EASES.has(easeRaw) ? easeRaw : 'linear',
  };
}

export function parseMarkdownTimelineTable(markdown: string): TimelineTrack[] {
  const rows = normalizeQuotes(markdown)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'));

  const tracks: TimelineTrack[] = [];
  for (const row of rows) {
    const cells = row.slice(1, -1).split('|').map((c) => c.trim());
    if (cells.length < 2) continue;
    const head = cells[0].toLowerCase();
    if (head === 'timeline' || /^-+$/.test(head.replace(/\s+/g, ''))) continue;

    const match = cells[0].match(/^#?([a-zA-Z0-9_$-]+)\.([a-zA-Z0-9_]+)$/);
    if (!match) continue;

    const steps = cells
      .slice(1)
      .map(parseTweenVectorCell)
      .filter((s): s is TweenStep => s !== null);

    tracks.push({
      id: `track_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      targetVarName: match[1],
      property: match[2] as EventPropertyKey,
      steps,
    });
  }
  return tracks;
}

export function parseFrontScript(source: string): ParsedProgram {
  const lines = normalizeQuotes(source).split(/\r?\n/);
  const warnings: string[] = [];
  const globalLines: string[] = [];
  const scenes: ParsedScene[] = [];

  const state: {
    scene: ParsedScene | null;
    event: ParsedEvent | null;
    tableLines: string[];
  } = { scene: null, event: null, tableLines: [] };
  let seenEvent = false;
  let pending: Partial<ParsedScene> = {};

  const ensureScene = (): ParsedScene => {
    if (!state.scene) {
      state.scene = {
        index: scenes.length,
        name: pending.name || `Scene ${scenes.length + 1}`,
        layout: pending.layout || 'title',
        theme: pending.theme || 'minimal',
        uxNote: pending.uxNote || '',
        fps: pending.fps || 24,
        physics: pending.physics || { enabled: false, gravityX: 0, gravityY: 620 },
        objects: [],
        timelines: [],
        events: [],
      };
      pending = {};
      seenEvent = false;
      scenes.push(state.scene);
    }
    return state.scene;
  };

  const flushTable = () => {
    if (state.tableLines.length > 0 && state.scene) {
      state.scene.timelines.push(...parseMarkdownTimelineTable(state.tableLines.join('\n')));
      state.tableLines = [];
    }
  };

  const flushEvent = () => {
    if (state.event && state.scene) {
      state.event.code = state.event.code.trim();
      state.scene.events.push(state.event);
      state.event = null;
    }
  };

  const resetScene = () => {
    flushEvent();
    flushTable();
    state.scene = null;
    seenEvent = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      if (state.event) flushEvent();
      if (state.tableLines.length > 0) flushTable();
      continue;
    }

    const dirMatch = trimmed.match(/^\/\/\s*(scene|layout|theme|ux|fps|physics|font)\s*:\s*(.+)$/i);
    if (dirMatch) {
      const [, keyRaw, valRaw] = dirMatch;
      const key = keyRaw.toLowerCase();
      const val = valRaw.trim();
      if (key === 'font') continue;
      if (seenEvent || (state.scene && state.scene.objects.length > 0 && key === 'scene')) resetScene();

      if (key === 'scene') pending.name = val;
      if (key === 'layout') pending.layout = val as SceneLayout;
      if (key === 'theme') pending.theme = val as SceneTheme;
      if (key === 'ux') pending.uxNote = val;
      if (key === 'fps') pending.fps = Math.max(1, Math.min(120, Number(val) || 24));
      if (key === 'physics') {
        const gx = val.match(/gravityX\s*=\s*(-?\d+(?:\.\d+)?)/i);
        const gy = val.match(/gravityY\s*=\s*(-?\d+(?:\.\d+)?)/i);
        pending.physics = {
          enabled: !/off|false|none/i.test(val),
          gravityX: gx ? Number(gx[1]) : 0,
          gravityY: gy ? Number(gy[1]) : 620,
        };
      }
      if (state.scene) Object.assign(state.scene, pending);
      continue;
    }

    if (trimmed.startsWith('//')) continue;

    const isTableRow =
      /^\|.+\|$/.test(trimmed) &&
      (trimmed.toLowerCase().startsWith('| timeline') ||
        state.tableLines.length > 0 ||
        /^\|\s*---/.test(trimmed));
    if (isTableRow) {
      flushEvent();
      ensureScene();
      state.tableLines.push(trimmed);
      continue;
    }
    if (state.tableLines.length > 0) flushTable();

    const evMatch = trimmed.match(/^\|([a-zA-Z0-9_]+)(?:\s+#?([a-zA-Z0-9_$-]+))?\|$/);
    if (evMatch) {
      flushEvent();
      const scene = ensureScene();
      seenEvent = true;
      state.event = { eventType: evMatch[1] as EventType, targetVarName: evMatch[2], code: '' };
      if (evMatch[2] && evMatch[1] !== 'onVarChange' && !scene.objects.some((o) => o.varName === evMatch[2])) {
        warnings.push(`Line ${i + 1}: #${evMatch[2]} is not declared with objLet in "${scene.name}".`);
      }
      continue;
    }

    const ctrlMatch = trimmed.match(
      /^objLet\s+([a-zA-Z0-9_$-]+)\s*=\s*(title|text|button|input|checkbox)\(\s*"((?:[^"\\]|\\.)*)"(?:\s*,\s*\{([\s\S]*)\})?\s*\)\s*;?$/
    );
    if (ctrlMatch) {
      if (seenEvent) resetScene();
      ensureScene().objects.push({
        varName: ctrlMatch[1],
        kind: 'control',
        controlKind: ctrlMatch[2] as ControlKind,
        text: unescapeStr(ctrlMatch[3]),
        ...(ctrlMatch[4] ? parseImmediateAttrs(ctrlMatch[4]) : {}),
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        visible: true,
        playing: false,
        progress: 0,
        currentTime: 0,
        duration: 0,
      });
      continue;
    }

    const assetMatch = trimmed.match(/^objLet\s+([a-zA-Z0-9_$-]+)\s*:\s*"((?:[^"\\]|\\.)*)"\s*;?$/);
    if (assetMatch) {
      if (seenEvent) resetScene();
      ensureScene().objects.push({
        varName: assetMatch[1],
        kind: 'asset',
        text: assetMatch[1],
        assetPath: unescapeStr(assetMatch[2]),
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        visible: true,
        playing: false,
        progress: 0,
        currentTime: 0,
        duration: 0,
      });
      continue;
    }

    if (!state.event && state.scene) {
      const propMatch = trimmed.match(
        /^#?([a-zA-Z0-9_$-]+)\.(x|y|scale|rotation|opacity|visible|text|src|class|className|id|htmlId|href|alt|title|placeholder|value|disabled|font|fontSize|backgroundColor|color|borderRadius|width|height|playing|progress|physics|shape|restitution|friction|density)\s*=\s*(.+?);?$/
      );
      if (propMatch) {
        const target = state.scene.objects.find((o) => o.varName === propMatch[1]);
        if (target) {
          assignDeclaredProp(target, propMatch[2], propMatch[3].trim());
          continue;
        }
      }
    }

    if (state.event) state.event.code += (state.event.code ? '\n' : '') + raw;
    else globalLines.push(raw);
  }

  flushEvent();
  flushTable();
  if (scenes.length === 0 && Object.keys(pending).length > 0) ensureScene();

  return { globalsCode: stripSimpleTsTypes(globalLines.join('\n').trim()), scenes, warnings };
}

function assignDeclaredProp(target: ParsedObject, prop: string, valRaw: string) {
  const unquoted = unescapeStr(valRaw.replace(/^["']|["']$/g, ''));
  const strMap: Record<string, keyof ParsedObject> = {
    text: 'text',
    src: 'srcOverride',
    class: 'className',
    className: 'className',
    id: 'htmlId',
    htmlId: 'htmlId',
    href: 'href',
    alt: 'alt',
    title: 'titleAttr',
    placeholder: 'placeholder',
    value: 'valueAttr',
    font: 'fontFamily',
    fontSize: 'fontSize',
    backgroundColor: 'backgroundColor',
    color: 'color',
    borderRadius: 'borderRadius',
    width: 'width',
    height: 'height',
  };
  if (strMap[prop]) {
    (target as unknown as Record<string, unknown>)[strMap[prop]] = unquoted;
    return;
  }
  if (prop === 'visible') target.visible = valRaw !== 'false';
  else if (prop === 'disabled') target.disabled = valRaw === 'true';
  else if (prop === 'playing') target.playing = valRaw === 'true';
  else if (['physics', 'shape', 'restitution', 'friction', 'density'].includes(prop)) {
    if (!target.physics) target.physics = { bodyType: 'dynamic', shape: 'box', restitution: 0.45, friction: 0.3, density: 1 };
    if (prop === 'physics') target.physics.bodyType = unquoted as PhysicsBodyType;
    else if (prop === 'shape') target.physics.shape = unquoted as PhysicsShape;
    else if (prop === 'restitution') target.physics.restitution = Number(valRaw) || 0.45;
    else if (prop === 'friction') target.physics.friction = Number(valRaw) || 0.3;
    else if (prop === 'density') target.physics.density = Number(valRaw) || 1;
  } else {
    const num = Number(valRaw);
    if (!Number.isNaN(num)) {
      if (prop === 'x' || prop === 'y' || prop === 'scale' || prop === 'rotation' || prop === 'opacity') {
        target[prop] = num;
      } else if (prop === 'progress') {
        target.progress = Math.max(0, Math.min(1, num));
      }
    }
  }
}

export function importFrontScriptToProject(source: string, current: HomewrkProject): HomewrkProject {
  const parsed = parseFrontScript(source);
  if (parsed.scenes.length === 0) return current;

  const newScenes: Scene[] = parsed.scenes.map((ps, idx) => {
    const maxSec = ps.timelines.reduce((m, t) => Math.max(m, t.steps.reduce((a, s) => a + s.durationSec, 0)), 0);
    const fps = ps.fps || 24;
    const objects: StageObject[] = ps.objects.map((po, oIdx) => {
      const asset = po.kind === 'asset'
        ? current.assets.find((a) => a.fileName === po.assetPath || a.varName === po.varName)
        : undefined;
      return {
        id: `obj_${Date.now()}_${idx}_${oIdx}`,
        varName: po.varName,
        kind: po.kind,
        controlKind: po.controlKind,
        assetId: asset?.id,
        text: po.text,
        htmlId: po.htmlId,
        srcOverride: po.srcOverride,
        className: po.className,
        href: po.href,
        alt: po.alt,
        titleAttr: po.titleAttr,
        placeholder: po.placeholder,
        valueAttr: po.valueAttr,
        disabled: po.disabled,
        fontFamily: po.fontFamily,
        fontSize: po.fontSize,
        backgroundColor: po.backgroundColor,
        color: po.color,
        borderRadius: po.borderRadius,
        width: po.width,
        height: po.height,
        x: po.x,
        y: po.y,
        scale: po.scale,
        rotation: po.rotation,
        opacity: po.opacity,
        visible: po.visible,
        autoplay: po.playing,
        physics: po.physics,
      };
    });

    return {
      id: current.scenes[idx]?.id || `scene_${Date.now()}_${idx}`,
      name: ps.name,
      layout: ps.layout,
      theme: ps.theme,
      uxNote: ps.uxNote,
      fps,
      durationFrames: Math.max(60, Math.ceil(maxSec * fps)),
      physics: ps.physics,
      objects,
      timelines: ps.timelines,
      events: ps.events.map((ev, eIdx) => ({
        id: `ev_${Date.now()}_${idx}_${eIdx}`,
        eventType: ev.eventType,
        targetVarName: ev.targetVarName,
        code: ev.code,
      })),
    };
  });

  return {
    ...current,
    globalsTs: parsed.globalsCode || current.globalsTs,
    scenes: newScenes,
    activeSceneId: newScenes[0].id,
    customFrontScript: null,
  };
}
