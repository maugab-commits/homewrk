import { ParsedObject } from './frontscriptParser';
import {
  EaseType,
  EventPropertyKey,
  EventRule,
  EventType,
  RuleOperator,
  StageObject,
} from '../types/frontscript';

export const TARGET_EVENTS: EventType[] = [
  'onClick',
  'onDoubleClick',
  'onHover',
  'onMouseEnter',
  'onMouseLeave',
  'onInput',
  'onChange',
];

export const SCENE_EVENTS: EventType[] = [
  'onEnterFrame',
  'onVarChange',
  'onSetup',
  'onEnter',
  'onExit',
  'onKeyDown',
  'onKeyUp',
];

export const EASE_OPTIONS: { value: EaseType; label: string }[] = [
  { value: 'linear', label: 'linear' },
  { value: 'easeInQuad', label: 'easeInQuad' },
  { value: 'easeOutQuad', label: 'easeOutQuad' },
  { value: 'easeInOutQuad', label: 'easeInOutQuad' },
  { value: 'easeInOutCubic', label: 'easeInOutCubic' },
  { value: 'easeOutBack', label: 'easeOutBack' },
  { value: 'easeOutBounce', label: 'easeOutBounce' },
  { value: 'step', label: 'step' },
];

export const PROPERTY_OPTIONS: { value: EventPropertyKey; label: string; group: 'transform' | 'html5' | 'audio' | 'nav' }[] = [
  { value: 'x', label: 'x (px)', group: 'transform' },
  { value: 'y', label: 'y (px)', group: 'transform' },
  { value: 'rotation', label: 'rotation (deg)', group: 'transform' },
  { value: 'scale', label: 'scale', group: 'transform' },
  { value: 'opacity', label: 'opacity', group: 'transform' },
  { value: 'visible', label: 'visible', group: 'html5' },
  { value: 'text', label: 'textContent', group: 'html5' },
  { value: 'class', label: 'class', group: 'html5' },
  { value: 'src', label: 'src', group: 'html5' },
  { value: 'href', label: 'href', group: 'html5' },
  { value: 'alt', label: 'alt', group: 'html5' },
  { value: 'title', label: 'title', group: 'html5' },
  { value: 'placeholder', label: 'placeholder', group: 'html5' },
  { value: 'value', label: 'value', group: 'html5' },
  { value: 'disabled', label: 'disabled', group: 'html5' },
  { value: 'htmlId', label: 'id', group: 'html5' },
  { value: 'font', label: 'font', group: 'html5' },
  { value: 'fontSize', label: 'fontSize', group: 'html5' },
  { value: 'backgroundColor', label: 'backgroundColor', group: 'html5' },
  { value: 'color', label: 'color', group: 'html5' },
  { value: 'borderRadius', label: 'borderRadius', group: 'html5' },
  { value: 'width', label: 'width', group: 'html5' },
  { value: 'height', label: 'height', group: 'html5' },
  { value: 'playing', label: 'playing (audio)', group: 'audio' },
  { value: 'progress', label: 'progress (0.0–1.0)', group: 'audio' },
  { value: 'setVar', label: 'global var', group: 'nav' },
  { value: 'next', label: 'next() scene', group: 'nav' },
  { value: 'back', label: 'back() scene', group: 'nav' },
];

export const OPERATORS: RuleOperator[] = ['=', '+=', '-=', '*='];

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function parseCodeLinesToRules(code: string, fallbackVar: string): EventRule[] {
  const lines = code
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//'));

  const rules: EventRule[] = [];
  for (const line of lines) {
    if (/^next\(/.test(line)) {
      const m = line.match(/^next\((.*)\)$/);
      rules.push({ id: uid('rule'), targetVarName: '__scene__', property: 'next', operator: '=', formula: m?.[1]?.trim() || '1' });
      continue;
    }
    if (/^back\(/.test(line)) {
      const m = line.match(/^back\((.*)\)$/);
      rules.push({ id: uid('rule'), targetVarName: '__scene__', property: 'back', operator: '=', formula: m?.[1]?.trim() || '1' });
      continue;
    }
    const m = line.match(
      /^#?([a-zA-Z0-9_$-]+)\.(rotation|x|y|scale|opacity|visible|text|class|src|href|alt|title|placeholder|value|disabled|htmlId|id|font|fontSize|backgroundColor|color|borderRadius|width|height|playing|progress)\s*(\+=|-=|\*=|=)\s*(.+)$/
    );
    if (m) {
      rules.push({
        id: uid('rule'),
        targetVarName: m[1],
        property: (m[2] === 'id' ? 'htmlId' : m[2]) as EventPropertyKey,
        operator: m[3] as RuleOperator,
        formula: m[4].trim(),
      });
      continue;
    }
    const gMatch = line.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(\+=|-=|\*=|=)\s*(.+)$/);
    if (gMatch) {
      rules.push({
        id: uid('rule'),
        targetVarName: `__var__:${gMatch[1]}`,
        property: 'setVar',
        operator: gMatch[2] as RuleOperator,
        formula: gMatch[3].trim(),
      });
      continue;
    }
    rules.push({ id: uid('rule'), targetVarName: fallbackVar, property: 'text', operator: '=', formula: line });
  }
  return rules;
}

export function toParsedObjectsMap(objects: StageObject[]): Record<string, ParsedObject> {
  const map: Record<string, ParsedObject> = {};
  for (const o of objects) {
    map[o.varName] = {
      varName: o.varName,
      kind: o.kind,
      controlKind: o.controlKind,
      text: o.text,
      htmlId: o.htmlId,
      srcOverride: o.srcOverride,
      className: o.className,
      href: o.href,
      alt: o.alt,
      titleAttr: o.titleAttr,
      placeholder: o.placeholder,
      valueAttr: o.valueAttr,
      disabled: o.disabled,
      fontFamily: o.fontFamily,
      fontSize: o.fontSize,
      backgroundColor: o.backgroundColor,
      color: o.color,
      borderRadius: o.borderRadius,
      width: o.width,
      height: o.height,
      x: o.x,
      y: o.y,
      scale: o.scale,
      rotation: o.rotation,
      opacity: o.opacity,
      visible: o.visible,
      playing: Boolean(o.autoplay),
      progress: 0,
      currentTime: 0,
      duration: 0,
      physics: o.physics,
    };
  }
  return map;
}
