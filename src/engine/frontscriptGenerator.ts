import {
  AssetItem,
  EventBlock,
  EventRule,
  HomewrkProject,
  StageObject,
  TimelineTrack,
} from '../types/frontscript';

const STRING_PROPS = new Set([
  'text',
  'class',
  'src',
  'href',
  'alt',
  'title',
  'placeholder',
  'value',
  'htmlId',
  'font',
  'fontSize',
  'backgroundColor',
  'color',
  'borderRadius',
  'width',
  'height',
]);

function esc(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

export function ruleToFrontScriptLine(rule: EventRule): string {
  if (rule.property === 'next' || rule.property === 'back') {
    const arg = rule.formula.trim();
    return arg && arg !== '1' ? `${rule.property}(${arg})` : `${rule.property}()`;
  }
  if (rule.property === 'setVar') {
    const varName = rule.targetVarName.replace(/^__var__:/, '').trim() || 'score';
    return `${varName} ${rule.operator} ${rule.formula.trim() || '0'}`;
  }

  let rhs = rule.formula.trim() || '""';
  if (
    STRING_PROPS.has(rule.property) &&
    !rhs.startsWith('"') &&
    !rhs.startsWith("'") &&
    !rhs.startsWith('`') &&
    !/\b(value|key|delta|time|frame|Math|page)\b/.test(rhs)
  ) {
    rhs = `"${esc(rhs)}"`;
  }
  return `${rule.targetVarName || 'obj'}.${rule.property} ${rule.operator} ${rhs}`;
}

export function rulesToFrontScriptCode(rules: EventRule[]): string {
  return rules.map(ruleToFrontScriptLine).join('\n');
}

export function timelinesToMarkdownTable(tracks: TimelineTrack[]): string {
  const nonEmpty = tracks.filter((t) => t.steps.length > 0);
  if (nonEmpty.length === 0) return '';

  const maxSteps = Math.max(...nonEmpty.map((t) => t.steps.length));
  const headers = ['timeline', ...Array.from({ length: maxSteps }, (_, i) => `step ${i + 1}`)];

  const rows = nonEmpty.map((track) => {
    const cells = Array.from({ length: maxSteps }, (_, idx) => {
      const step = track.steps[idx];
      if (!step) return '';
      const rawVal = step.toValue.trim();
      const isNumOrBool = /^-?\d+(?:\.\d+)?$/.test(rawVal) || rawVal === 'true' || rawVal === 'false';
      const valFormatted = isNumOrBool
        ? rawVal
        : rawVal.startsWith('"') && rawVal.endsWith('"')
        ? rawVal
        : `"${esc(rawVal.replace(/^["']|["']$/g, ''))}"`;
      return `[${Number(step.durationSec) || 0.5}s, ${valFormatted}, "${step.ease}"]`;
    });
    return `| #${track.targetVarName}.${track.property} | ${cells.join(' | ')} |`;
  });

  return [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows].join('\n');
}

function formatObject(obj: StageObject, assets: AssetItem[]): string[] {
  const lines: string[] = [];
  if (obj.kind === 'asset') {
    const asset = assets.find((a) => a.id === obj.assetId);
    lines.push(`objLet ${obj.varName} : "${esc(asset ? asset.fileName : `${obj.varName}.png`)}"`);
  } else {
    lines.push(`objLet ${obj.varName} = ${obj.controlKind || 'text'}("${esc(obj.text)}")`);
  }

  const strAttrs: [string, string | undefined][] = [
    ['id', obj.htmlId],
    ['src', obj.srcOverride],
    ['class', obj.className],
    ['href', obj.href],
    ['alt', obj.alt],
    ['title', obj.titleAttr],
    ['placeholder', obj.placeholder],
    ['value', obj.valueAttr],
    ['font', obj.fontFamily],
    ['fontSize', obj.fontSize],
    ['backgroundColor', obj.backgroundColor],
    ['color', obj.color],
    ['borderRadius', obj.borderRadius],
    ['width', obj.width],
    ['height', obj.height],
  ];
  for (const [k, v] of strAttrs) {
    if (v?.trim()) lines.push(`${obj.varName}.${k} = "${esc(v.trim())}"`);
  }

  if (obj.disabled) lines.push(`${obj.varName}.disabled = true`);
  if (Math.round(obj.x) !== 0) lines.push(`${obj.varName}.x = ${Math.round(obj.x)}`);
  if (Math.round(obj.y) !== 0) lines.push(`${obj.varName}.y = ${Math.round(obj.y)}`);
  if (Number(obj.scale.toFixed(2)) !== 1) lines.push(`${obj.varName}.scale = ${Number(obj.scale.toFixed(2))}`);
  if (Math.round(obj.rotation) !== 0) lines.push(`${obj.varName}.rotation = ${Math.round(obj.rotation)}`);
  if (Number(obj.opacity.toFixed(2)) !== 1) lines.push(`${obj.varName}.opacity = ${Number(obj.opacity.toFixed(2))}`);
  if (!obj.visible) lines.push(`${obj.varName}.visible = false`);
  if (obj.autoplay) lines.push(`${obj.varName}.playing = true`);

  if (obj.physics && obj.physics.bodyType !== 'none') {
    lines.push(`${obj.varName}.physics = "${obj.physics.bodyType}"`);
    if (obj.physics.shape !== 'box') lines.push(`${obj.varName}.shape = "${obj.physics.shape}"`);
    if (obj.physics.restitution !== 0.45) lines.push(`${obj.varName}.restitution = ${obj.physics.restitution}`);
    if (obj.physics.friction !== 0.3) lines.push(`${obj.varName}.friction = ${obj.physics.friction}`);
  }

  return lines;
}

function getEventBody(ev: EventBlock): string {
  return ev.rules && ev.rules.length > 0 ? rulesToFrontScriptCode(ev.rules) : ev.code.trim();
}

export function generateFrontScript(project: HomewrkProject): string {
  const sections: string[] = [];
  if (project.globalsTs.trim()) sections.push(project.globalsTs.trim());

  const fontAssets = project.assets.filter((a) => a.kind === 'font');
  if (fontAssets.length > 0) {
    sections.push(fontAssets.map((f) => `// font: ${f.fontFamilyName || f.varName} -> "${f.fileName}"`).join('\n'));
  }

  project.scenes.forEach((scene, index) => {
    const lines: string[] = [
      `// scene: ${scene.name || `Scene ${index + 1}`}`,
      `// layout: ${scene.layout}`,
      `// theme: ${scene.theme}`,
    ];
    if (scene.uxNote.trim()) lines.push(`// ux: ${scene.uxNote.trim()}`);
    if (scene.timelines.length > 0 || scene.fps !== 24) lines.push(`// fps: ${scene.fps || 24}`);
    if (scene.physics?.enabled) {
      lines.push(`// physics: enabled(gravityX=${scene.physics.gravityX}, gravityY=${scene.physics.gravityY})`);
    }

    if (scene.objects.length > 0) {
      lines.push('');
      for (const obj of scene.objects) lines.push(...formatObject(obj, project.assets));
    }

    const mdTable = timelinesToMarkdownTable(scene.timelines || []);
    if (mdTable) lines.push('', mdTable);

    if (scene.events.length > 0) {
      lines.push('');
      for (const ev of scene.events) {
        const header = ev.targetVarName
          ? ev.eventType === 'onVarChange'
            ? `|onVarChange ${ev.targetVarName}|`
            : `|${ev.eventType} #${ev.targetVarName}|`
          : `|${ev.eventType}|`;
        lines.push(header);
        const body = getEventBody(ev);
        if (body) lines.push(body);
        lines.push('');
      }
    }

    sections.push(lines.join('\n').trimEnd());
  });

  const out = sections.filter(Boolean).join('\n\n');
  return out ? `${out}\n` : '// Empty house. Add scenes, objects, or assets across the rooms to generate FrontScript.\n';
}
