import { AssetItem, Lang } from '../types/frontscript';
import { parseFrontScript } from './frontscriptParser';

export function compileToStandaloneHtml(
  source: string,
  assets: AssetItem[],
  projectTitle = 'homewrk_export',
  lang: Lang = 'en'
): string {
  const parsed = parseFrontScript(source);
  const assetLookup: Record<string, { kind: string; dataUrl: string; durationSec?: number; fontFamilyName?: string }> = {};
  const fontFacesCss: string[] = [];

  for (const asset of assets) {
    assetLookup[asset.fileName] = {
      kind: asset.kind,
      dataUrl: asset.dataUrl,
      durationSec: asset.durationSec,
      fontFamilyName: asset.fontFamilyName,
    };
    if (asset.kind === 'font' && asset.dataUrl) {
      const fam = asset.fontFamilyName || asset.varName;
      fontFacesCss.push(
        `@font-face { font-family: ${JSON.stringify(fam)}; src: url(${JSON.stringify(asset.dataUrl)}); font-display: swap; }`
      );
    }
  }

  const safeTitle = projectTitle.replace(/[<>]/g, '');
  const labels =
    lang === 'es'
      ? { back: 'Anterior', next: 'Siguiente', playing: 'Reproduciendo', stopped: 'Detenido', play: 'Play', pause: 'Pausar', empty: 'Escena vacía.' }
      : { back: 'Back', next: 'Next', playing: 'Playing', stopped: 'Stopped', play: 'Play', pause: 'Pause', empty: 'Empty scene.' };

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — FrontScript HTML5</title>
  <style>
    ${fontFacesCss.join('\n    ')}
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #efede8; color: #1c1b18; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
    .stage-frame { width: min(920px, 100%); min-height: 540px; border-radius: 12px; border: 1px solid #d4d0c5; background: #faf9f5; box-shadow: 0 12px 32px rgba(0,0,0,0.08); display: flex; flex-direction: column; overflow: hidden; }
    .stage-frame.theme-dark { background: #191816; color: #f4f2ed; border-color: #34322d; }
    .stage-frame.theme-school { background: #fdfbf4; color: #1e293b; }
    .stage-frame.theme-science { background: #f3f7f9; color: #0f172a; }
    .stage-frame.theme-history { background: #f7f3ea; color: #2d241c; }
    .stage-frame.theme-business { background: #ffffff; color: #111827; }
    .stage-content { flex: 1; position: relative; padding: 36px; display: flex; flex-direction: column; gap: 16px; justify-content: center; align-items: flex-start; overflow: hidden; }
    .stage-content.layout-two-columns { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 24px; }
    .stage-content.layout-free { display: block; }
    .stage-obj { transition: opacity 90ms linear; }
    .stage-content.layout-free .stage-obj { position: absolute; left: 50%; top: 50%; }
    h1.fs-title { margin: 0; font-size: 2rem; line-height: 1.15; font-weight: 700; }
    p.fs-text { margin: 0; font-size: 1.05rem; line-height: 1.5; opacity: 0.85; }
    button.fs-btn { padding: 10px 20px; border-radius: 8px; border: 1px solid #c5c0b3; background: #1c1b18; color: #fff; font-weight: 600; cursor: pointer; font-size: 0.95rem; }
    .theme-dark button.fs-btn { background: #e25b34; border-color: #b53917; }
    input.fs-input { padding: 10px 14px; border-radius: 8px; border: 1px solid #ccc7ba; background: #fff; color: #1c1b18; font-size: 0.95rem; min-width: 240px; }
    label.fs-check { display: inline-flex; align-items: center; gap: 8px; font-size: 0.95rem; cursor: pointer; }
    img.fs-img, video.fs-video { max-width: 320px; max-height: 240px; border-radius: 8px; display: block; }
    .fs-audio-card { padding: 10px 14px; border: 1px solid rgba(128,128,128,0.3); border-radius: 8px; display: flex; align-items: center; gap: 10px; font-size: 0.8rem; font-family: monospace; }
    .stage-nav { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid rgba(128,128,128,0.2); font-size: 0.85rem; }
    .stage-nav button { padding: 6px 14px; border-radius: 6px; border: 1px solid rgba(128,128,128,0.3); background: transparent; color: inherit; cursor: pointer; }
  </style>
</head>
<body>
  <div id="app" class="stage-frame">
    <div id="stage" class="stage-content"></div>
    <div class="stage-nav">
      <button id="btn-back" type="button">${labels.back}</button>
      <span id="page-indicator">1 / 1</span>
      <button id="btn-next" type="button">${labels.next}</button>
    </div>
  </div>
  <script>
    const PROGRAM = ${JSON.stringify(parsed)};
    const ASSETS = ${JSON.stringify(assetLookup)};
    const LABELS = ${JSON.stringify(labels)};
    const globals = {};
    try {
      if (PROGRAM.globalsCode) {
        const decls = Array.from(PROGRAM.globalsCode.matchAll(/\\b(?:let|const|var|function)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g)).map(m => m[1]);
        const exportCode = decls.map(n => 'if(typeof ' + n + '!=="undefined")__s[' + JSON.stringify(n) + ']=' + n + ';').join('\\n');
        new Function('__s', PROGRAM.globalsCode + '\\n' + exportCode)(globals);
      }
    } catch (e) { console.error(e); }

    let currentIdx = 0, rafId = null, lastTime = performance.now(), startTime = performance.now();
    const domRefs = {}, audioEls = {}, runtimeObjs = {}, baseObjs = {}, physicsBodies = {};

    function applyEase(ease, t) {
      const x = Math.max(0, Math.min(1, t));
      if (ease === 'step') return x >= 1 ? 1 : 0;
      if (ease === 'easeInQuad') return x * x;
      if (ease === 'easeOutQuad') return 1 - (1 - x) * (1 - x);
      if (ease === 'easeInOutQuad') return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
      if (ease === 'easeInOutCubic') return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      if (ease === 'easeOutBack') { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
      return x;
    }

    function interpVal(fromRaw, toRaw, progress, ease) {
      const e = applyEase(ease, progress);
      const toClean = String(toRaw).trim().replace(/^["']|["']$/g, '');
      if (ease === 'step') return progress >= 1 ? (toClean === 'true' ? true : toClean === 'false' ? false : (isNaN(Number(toClean)) ? toClean : Number(toClean))) : fromRaw;
      const fNum = typeof fromRaw === 'number' ? fromRaw : parseFloat(String(fromRaw || 0));
      const tNum = Number(toClean);
      if (!isNaN(fNum) && !isNaN(tNum) && toClean !== '') return fNum + (tNum - fNum) * e;
      return progress >= 0.999 ? (toClean === 'true' ? true : toClean === 'false' ? false : toClean) : fromRaw;
    }

    function evalTimelines(timeSec) {
      const scene = PROGRAM.scenes[currentIdx];
      if (!scene || !scene.timelines) return;
      scene.timelines.forEach(track => {
        const target = runtimeObjs[track.targetVarName], base = baseObjs[track.targetVarName];
        if (!target || !base || !track.steps.length) return;
        const prop = track.property === 'class' ? 'className' : track.property === 'src' ? 'srcOverride' : track.property === 'font' ? 'fontFamily' : track.property;
        let elapsed = 0, fromVal = base[prop];
        for (const step of track.steps) {
          const dur = Math.max(0.01, Number(step.durationSec) || 0.5);
          if (timeSec <= elapsed + dur) { target[prop] = interpVal(fromVal, step.toValue, (timeSec - elapsed) / dur, step.ease); break; }
          fromVal = interpVal(fromVal, step.toValue, 1, step.ease);
          target[prop] = fromVal;
          elapsed += dur;
        }
      });
    }

    function getPage() { const total = Math.max(1, PROGRAM.scenes.length); return { index: currentIdx, total, first: currentIdx === 0, last: currentIdx === total - 1 }; }
    function next(n = 1) { if (PROGRAM.scenes.length) goTo((currentIdx + n) % PROGRAM.scenes.length); }
    function back(n = 1) { if (PROGRAM.scenes.length) goTo(((currentIdx - n) % PROGRAM.scenes.length + PROGRAM.scenes.length) % PROGRAM.scenes.length); }
    function resolveAssetSrc(src) { return src ? ((ASSETS[src] && ASSETS[src].dataUrl) || src) : ''; }

    function syncDom(obj, el) {
      if (!el) return;
      el.style.display = obj.visible ? '' : 'none';
      el.style.opacity = String(obj.opacity);
      el.style.transform = \`translate(\${obj.x}px, \${obj.y}px) scale(\${obj.scale}) rotate(\${obj.rotation}deg)\`;
      if (obj.backgroundColor) el.style.backgroundColor = obj.backgroundColor;
      if (obj.color) el.style.color = obj.color;
      if (obj.fontFamily) el.style.fontFamily = obj.fontFamily;
      if (obj.fontSize) el.style.fontSize = obj.fontSize;
      if (obj.borderRadius) el.style.borderRadius = obj.borderRadius;
      if (obj.width) el.style.width = obj.width;
      if (obj.height) el.style.height = obj.height;
      if (obj.htmlId) el.id = obj.htmlId;
      if (obj.titleAttr) el.title = obj.titleAttr;
      el.className = ((el.dataset.baseClass || '') + ' ' + (obj.className || '')).trim();
      if (obj.kind === 'control') {
        if (obj.controlKind === 'checkbox') { const s = el.querySelector('span'); if (s) s.textContent = obj.text; }
        else if (obj.controlKind === 'input') { el.placeholder = obj.placeholder || obj.text; el.disabled = Boolean(obj.disabled); }
        else if (obj.controlKind === 'button') { el.textContent = obj.text; el.disabled = Boolean(obj.disabled); }
        else { el.textContent = obj.text; }
      }
      const aud = audioEls[obj.varName];
      if (aud) {
        const meta = el.querySelector('.fs-audio-meta');
        if (meta) {
          const dur = isFinite(aud.duration) ? aud.duration : (obj.duration || 0);
          const prog = dur > 0 ? (aud.currentTime / dur) : 0;
          obj.playing = !aud.paused; obj.currentTime = aud.currentTime; obj.duration = dur; obj.progress = prog;
          meta.textContent = (obj.playing ? LABELS.playing : LABELS.stopped) + ' · ' + prog.toFixed(2) + ' · ' + aud.currentTime.toFixed(2) + 's / ' + dur.toFixed(2) + 's';
        }
      }
    }

    function rewriteRefs(expr) {
      let out = expr.replace(/#([a-zA-Z0-9_$-]+)\\./g, (_, n) => '__objs[' + JSON.stringify(n) + '].');
      Object.keys(runtimeObjs).sort((a,b) => b.length - a.length).forEach(k => {
        const re = new RegExp('(^|[^a-zA-Z0-9_$.\"\\'])' + k.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + '\\\\.([a-zA-Z]+)\\b', 'g');
        out = out.replace(re, (_, p, prop) => {
          const mapped = prop === 'class' ? 'className' : prop === 'src' ? 'srcOverride' : prop === 'font' ? 'fontFamily' : prop === 'title' ? 'titleAttr' : prop === 'value' ? 'valueAttr' : prop === 'id' ? 'htmlId' : prop;
          return p + '__objs[' + JSON.stringify(k) + '].' + mapped;
        });
      });
      return out;
    }

    function runEvent(code, extra = {}) {
      if (!code) return;
      const beforeG = { ...globals };
      try {
        const body = rewriteRefs(code);
        const gKeys = Object.keys(globals);
        const before = gKeys.map(k => 'var ' + k + ' = __globals[' + JSON.stringify(k) + '];').join('\\n');
        const after = gKeys.map(k => '__globals[' + JSON.stringify(k) + '] = ' + k + ';').join('\\n');
        new Function('__objs', '__globals', 'page', 'next', 'back', 'delta', 'time', 'frame', 'value', 'key', before + '\\ntry{\\n' + body + '\\n}finally{\\n' + after + '\\n}')(
          runtimeObjs, globals, getPage(), next, back, extra.delta || 0.016, extra.time || 0, extra.frame || 1, extra.value, extra.key
        );
        Object.keys(runtimeObjs).forEach(k => {
          const aud = audioEls[k];
          if (aud) { if (runtimeObjs[k].playing && aud.paused) aud.play().catch(()=>{}); if (!runtimeObjs[k].playing && !aud.paused) aud.pause(); }
          syncDom(runtimeObjs[k], domRefs[k]);
        });
        const scene = PROGRAM.scenes[currentIdx];
        if (scene) {
          Object.keys(globals).forEach(gk => {
            if (globals[gk] !== beforeG[gk]) {
              scene.events.filter(ev => ev.eventType === 'onVarChange' && ev.targetVarName === gk).forEach(ev => runEvent(ev.code, extra));
            }
          });
        }
      } catch (e) { console.error(e); }
    }

    function renderScene() {
      if (rafId) cancelAnimationFrame(rafId);
      Object.values(audioEls).forEach(a => a.pause());
      Object.keys(audioEls).forEach(k => delete audioEls[k]);
      Object.keys(physicsBodies).forEach(k => delete physicsBodies[k]);
      startTime = performance.now();

      const app = document.getElementById('app'), stage = document.getElementById('stage');
      stage.innerHTML = '';
      Object.keys(domRefs).forEach(k => delete domRefs[k]);
      Object.keys(runtimeObjs).forEach(k => delete runtimeObjs[k]);
      Object.keys(baseObjs).forEach(k => delete baseObjs[k]);

      const scene = PROGRAM.scenes[currentIdx];
      if (!scene) { stage.innerHTML = '<p class="fs-text">' + LABELS.empty + '</p>'; return; }
      app.className = 'stage-frame theme-' + scene.theme;
      stage.className = 'stage-content layout-' + scene.layout;
      document.getElementById('page-indicator').textContent = (currentIdx + 1) + ' / ' + PROGRAM.scenes.length;

      scene.objects.forEach(src => {
        const obj = { ...src };
        runtimeObjs[obj.varName] = obj;
        baseObjs[obj.varName] = { ...src };
        if (obj.physics && obj.physics.bodyType && obj.physics.bodyType !== 'none') {
          physicsBodies[obj.varName] = { vx: 0, vy: 0, halfW: 40 * obj.scale, halfH: 22 * obj.scale };
        }
        let el, baseClass = 'stage-obj';
        if (obj.kind === 'control') {
          if (obj.controlKind === 'title') { el = document.createElement('h1'); baseClass += ' fs-title'; }
          else if (obj.controlKind === 'text') { el = document.createElement('p'); baseClass += ' fs-text'; }
          else if (obj.controlKind === 'button') { el = document.createElement('button'); el.type = 'button'; baseClass += ' fs-btn'; }
          else if (obj.controlKind === 'input') { el = document.createElement('input'); baseClass += ' fs-input'; }
          else { el = document.createElement('label'); baseClass += ' fs-check'; el.innerHTML = '<input type="checkbox" /><span></span>'; }
        } else {
          const asset = ASSETS[obj.assetPath];
          const srcUrl = resolveAssetSrc(obj.srcOverride || obj.assetPath);
          if (asset && asset.kind === 'image') { el = document.createElement('img'); el.src = srcUrl; baseClass += ' fs-img'; }
          else if (asset && asset.kind === 'audio') {
            el = document.createElement('div'); baseClass += ' fs-audio-card';
            const aud = new Audio(srcUrl); audioEls[obj.varName] = aud;
            const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = LABELS.play + ' / ' + LABELS.pause;
            btn.onclick = () => { if (aud.paused) aud.play(); else aud.pause(); syncDom(obj, el); };
            const meta = document.createElement('span'); meta.className = 'fs-audio-meta';
            el.appendChild(btn); el.appendChild(meta);
          } else if (asset && asset.kind === 'video') { el = document.createElement('video'); el.src = srcUrl; el.controls = true; baseClass += ' fs-video'; }
          else { el = document.createElement('div'); baseClass += ' fs-text'; el.textContent = '[Asset: ' + (obj.assetPath || obj.varName) + ']'; }
        }
        el.dataset.baseClass = baseClass; domRefs[obj.varName] = el; syncDom(obj, el); stage.appendChild(el);
      });

      scene.events.forEach(ev => {
        if (ev.eventType === 'onSetup' || ev.eventType === 'onEnter') runEvent(ev.code);
        if (ev.targetVarName && domRefs[ev.targetVarName]) {
          const el = domRefs[ev.targetVarName];
          if (ev.eventType === 'onClick') el.addEventListener('click', () => runEvent(ev.code));
          if (ev.eventType === 'onDoubleClick') el.addEventListener('dblclick', () => runEvent(ev.code));
          if (ev.eventType === 'onMouseEnter' || ev.eventType === 'onHover') el.addEventListener('mouseenter', () => runEvent(ev.code));
          if (ev.eventType === 'onMouseLeave') el.addEventListener('mouseleave', () => runEvent(ev.code));
          if (ev.eventType === 'onInput') el.addEventListener('input', (e) => runEvent(ev.code, { value: e.target.value }));
          if (ev.eventType === 'onChange') el.addEventListener('change', (e) => runEvent(ev.code, { value: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
        }
      });

      const frameEvents = scene.events.filter(e => e.eventType === 'onEnterFrame');
      const hasTimelines = scene.timelines && scene.timelines.length > 0;
      const hasPhysics = scene.physics && scene.physics.enabled;
      const hasAudio = Object.keys(audioEls).length > 0;

      if (frameEvents.length || hasTimelines || hasPhysics || hasAudio) {
        lastTime = performance.now();
        let frameCount = 0;
        const tick = (now) => {
          const delta = Math.min(0.05, (now - lastTime) / 1000);
          const time = (now - startTime) / 1000;
          frameCount++; lastTime = now;
          if (hasTimelines) evalTimelines(time);
          if (hasPhysics) {
            Object.keys(physicsBodies).forEach(k => {
              const o = runtimeObjs[k], b = physicsBodies[k];
              if (!o || o.physics.bodyType !== 'dynamic') return;
              b.vx += (scene.physics.gravityX || 0) * delta; b.vy += (scene.physics.gravityY || 620) * delta;
              o.x += b.vx * delta; o.y += b.vy * delta;
              if (o.y + b.halfH > 160) { o.y = 160 - b.halfH; b.vy = -b.vy * (o.physics.restitution || 0.45); }
              if (o.x + b.halfW > 280) { o.x = 280 - b.halfW; b.vx = -b.vx * (o.physics.restitution || 0.45); }
              if (o.x - b.halfW < -280) { o.x = -280 + b.halfW; b.vx = -b.vx * (o.physics.restitution || 0.45); }
            });
          }
          frameEvents.forEach(ev => runEvent(ev.code, { delta, time, frame: frameCount }));
          Object.keys(runtimeObjs).forEach(k => syncDom(runtimeObjs[k], domRefs[k]));
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      }
    }

    function goTo(idx) {
      const prev = PROGRAM.scenes[currentIdx];
      if (prev) prev.events.filter(e => e.eventType === 'onExit').forEach(ev => runEvent(ev.code));
      currentIdx = idx; renderScene();
    }

    document.getElementById('btn-back').addEventListener('click', () => back());
    document.getElementById('btn-next').addEventListener('click', () => next());
    window.addEventListener('keydown', (e) => {
      const scene = PROGRAM.scenes[currentIdx];
      if (!scene) return;
      scene.events.filter(ev => ev.eventType === 'onKeyDown').forEach(ev => runEvent(ev.code, { key: e.key }));
    });
    renderScene();
  </script>
</body>
</html>`;
}
