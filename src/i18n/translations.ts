import { Lang, RoomId } from '../types/frontscript';

export interface RoomCopy {
  title: string;
  houseArea: string;
  frontscriptAspect: string;
  description: string;
}

export interface Translations {
  rooms: Record<RoomId, RoomCopy>;
  nav: {
    saveLocal: string;
    prevRoom: string;
    nextRoom: string;
    sceneSingular: string;
    scenePlural: string;
    assetSingular: string;
    assetPlural: string;
    clearHouse: string;
    clearConfirm: string;
    clearYes: string;
    cancel: string;
  };
  idle: {
    label: string;
    paused: string;
    hint: string;
    pause: string;
    resume: string;
    triggeredPrefix: string;
    dismiss: string;
    prompts: {
      addControlTitle: string;
      addControlAction: string;
      addControlHint: string;
      addAssetTitle: string;
      addAssetAction: string;
      addAssetHint: string;
      addEventTitle: string;
      addEventAction: string;
      addEventHint: string;
      addSceneTitle: string;
      addSceneAction: string;
      addSceneHint: string;
      addGlobalTitle: string;
      addGlobalAction: string;
      addGlobalHint: string;
      animateTitle: string;
      animateAction: string;
      animateHint: string;
      testTitle: string;
      testAction: string;
      testHint: string;
      themeTitle: string;
      themeAction: string;
      themeHint: string;
    };
  };
  foyer: {
    blueprintTitle: string;
    blueprintSub: string;
    newScene: string;
    projectName: string;
    toLiving: string;
    directivesTitle: string;
    directivesSub: string;
    layoutLabel: string;
    themeLabel: string;
    uxLabel: string;
    uxPlaceholder: string;
    globalsTitle: string;
    globalsSub: string;
    globalsPlaceholder: string;
    layouts: Record<string, string>;
  };
  closet: {
    uploadTitle: string;
    uploadSub: string;
    selectFiles: string;
    uploadHint: string;
    sizeError: string;
    audioSynthTitle: string;
    audioSynthSub: string;
    varLabel: string;
    durationLabel: string;
    freqLabel: string;
    typeLabel: string;
    toneTypes: { chord: string; tone: string; pulse: string };
    saveAudio: string;
    svgTitle: string;
    saveSvg: string;
    shapes: { house: string; circle: string; square: string; triangle: string; star: string };
    shelfTitle: string;
    targetScene: string;
    savedCount: string;
    emptyTitle: string;
    emptySub: string;
    fontPreview: string;
    applyIn: string;
    placeIn: string;
  };
  living: {
    controlsTitle: string;
    controlLabels: Record<string, string>;
    assetsTitle: string;
    uploadMore: string;
    noAssets: string;
    physicsTitle: string;
    physicsOn: string;
    physicsOff: string;
    layersTitle: string;
    noObjects: string;
    stageLabel: string;
    emptyStageTitle: string;
    emptyStageSub: string;
    inspectorTitle: string;
    tabs: { html5: string; style: string; physics: string };
    inspectorEmpty: string;
    visible: string;
    hidden: string;
    physicsBody: string;
    physicsShape: string;
    bodyTypes: { none: string; dynamic: string; static: string; kinematic: string };
    restitution: string;
    friction: string;
  };
  study: {
    timelineTitle: string;
    timelineSub: string;
    play: string;
    stop: string;
    mdTableBtn: string;
    mdTableTitle: string;
    convertToFlash: string;
    newTrackBtn: string;
    layerCol: string;
    stepsCol: string;
    emptyTracks: string;
    emptyObjects: string;
    addStep: string;
    removeStep: string;
    monitorLabel: string;
    physicsTag: string;
    eventsTitle: string;
    eventsSub: string;
    newEvent: string;
    noEvents: string;
    rulesTitle: string;
    rulesSub: string;
    toTheater: string;
    rulesEmpty: string;
    triggerLabel: string;
    varWatchLabel: string;
    targetLabel: string;
    colElement: string;
    colProp: string;
    colFormula: string;
    colOrder: string;
    addRule: string;
    presets: { spin: string; wave: string; setVar: string; next: string; setClass: string };
    onVarChangeOption: string;
  };
  theater: {
    screenTitle: string;
    pause: string;
    run: string;
    restart: string;
    emptyScene: string;
    emptySceneSub: string;
    playing: string;
    stopped: string;
    playBtn: string;
    pauseBtn: string;
    plainTitle: string;
    manualMode: string;
    autoMode: string;
    toVisual: string;
    converted: string;
    autoSync: string;
    copy: string;
    copied: string;
    saveFrontscr: string;
    exportHtml: string;
    physicsActive: string;
  };
}

export const TRANSLATIONS: Record<Lang, Translations> = {
  en: {
    rooms: {
      foyer: {
        title: 'Foyer',
        houseArea: 'Blueprint & Foundation',
        frontscriptAspect: 'Scenes, // layout · theme · ux & TS State',
        description: 'Structure slide scenes, visual directives, and shared TypeScript globals.',
      },
      closet: {
        title: 'Closet',
        houseArea: 'Asset Attic',
        frontscriptAspect: 'objLet asset : "file" (image, audio, font)',
        description: 'Store images, decimal-timed audio, custom fonts, video, or JSON in localStorage.',
      },
      living: {
        title: 'Living',
        houseArea: 'Visual Stage',
        frontscriptAspect: 'objLet HTML5, fonts, physics & properties',
        description: 'Arrange elements on the Flash-style stage, edit HTML5 attributes, and enable physics.',
      },
      study: {
        title: 'Study',
        houseArea: 'Timeline & Rules',
        frontscriptAspect: 'Markdown Timeline [dur, val, ease] · |onVarChange| · = rules',
        description: 'Animate tweens with eases across frames/FPS, Markdown tables, and vertical = rules.',
      },
      theater: {
        title: 'Theater',
        houseArea: 'Screening & Export',
        frontscriptAspect: 'Run HTML5 · Sync .frontscr · Export',
        description: 'Run physics, audio, fonts, and tweens live; edit plain .frontscr or export HTML5.',
      },
    },
    nav: {
      saveLocal: 'Save local',
      prevRoom: 'Previous room',
      nextRoom: 'Next room',
      sceneSingular: 'scene',
      scenePlural: 'scenes',
      assetSingular: 'asset',
      assetPlural: 'assets',
      clearHouse: 'Clear',
      clearConfirm: 'Clear the entire house? Saved scenes, assets, and code in localStorage will be removed.',
      clearYes: 'Yes, clear house',
      cancel: 'Cancel',
    },
    idle: {
      label: 'Idle guide',
      paused: 'Paused',
      hint: 'Only suggests a next creative step if you pause for',
      pause: 'Pause',
      resume: 'Resume',
      triggeredPrefix: 'Suggestion after',
      dismiss: 'Dismiss suggestion',
      prompts: {
        addControlTitle: 'Your stage is empty: place your first object',
        addControlAction: 'Go to Living',
        addControlHint: 'Add a title, text, or button with objLet and drag it onto the stage.',
        addAssetTitle: 'Store an image, audio, or font in the Closet',
        addAssetAction: 'Go to Closet',
        addAssetHint: 'Upload local media, synthesize WAV audio, or craft a quick SVG shape.',
        addEventTitle: 'Bring your objects to life with events or tweens',
        addEventAction: 'Go to Study',
        addEventHint: 'Create an |onClick #id| rule with next() or add a timeline tween.',
        addSceneTitle: 'Add a second slide in the Foyer blueprint',
        addSceneAction: 'Go to Foyer',
        addSceneHint: 'FrontScript scenes behave like isolated slides navigated via next() and back().',
        addGlobalTitle: 'Declare a shared TypeScript global variable',
        addGlobalAction: 'Go to Foyer',
        addGlobalHint: 'For example: let score: number = 0; to share state across slides.',
        animateTitle: 'Try a Flash tween animation with an ease curve',
        animateAction: 'Open Timeline',
        animateHint: 'Add a tween track in the Study and watch the live monitor animate at your chosen FPS.',
        testTitle: 'Run your FrontScript live in the Theater',
        testAction: 'Go to Theater',
        testHint: 'Test interactive HTML5 playback, edit plain .frontscr, or export standalone HTML.',
        themeTitle: 'Switch the active scene layout or theme',
        themeAction: 'Adjust in Foyer',
        themeHint: 'Try // layout: two-columns or // theme: dark to transform the stage.',
      },
    },
    foyer: {
      blueprintTitle: 'Slide Blueprint',
      blueprintSub: 'Each scene compiles in isolation · page.total =',
      newScene: 'New scene',
      projectName: 'Project name',
      toLiving: 'Furnish in Living →',
      directivesTitle: 'Active Scene Directives',
      directivesSub: 'Emitted as clean comments',
      layoutLabel: 'Layout',
      themeLabel: 'Theme',
      uxLabel: 'UX Intent',
      uxPlaceholder: 'e.g. clear focal point and direct primary action',
      globalsTitle: 'TypeScript Foundation (Global State)',
      globalsSub: 'Typed variables and helpers shared across all scenes',
      globalsPlaceholder: '// Empty by default. Example:\nlet score: number = 0;\nconst MAX_SCORE: number = 100;',
      layouts: {
        title: 'Centered cover',
        'title-image': 'Title & visual',
        'two-columns': 'Two columns',
        timeline: 'Sequence',
        quiz: 'Interactive quiz',
        summary: 'Summary slide',
        free: 'Free coordinates',
      },
    },
    closet: {
      uploadTitle: 'Store File in Closet',
      uploadSub: 'Images, audio, fonts (ttf, otf, woff2), video, or JSON',
      selectFiles: 'Select local files',
      uploadHint: 'Max 1.5 MB per file · Saved in localStorage',
      sizeError: 'exceeds 1.5 MB. Use lighter files for local storage.',
      audioSynthTitle: 'WAV Audio Synthesizer',
      audioSynthSub: 'Create an audio asset with exact decimal duration (0.0–1.0 & seconds).',
      varLabel: 'objLet name',
      durationLabel: 'Duration (sec)',
      freqLabel: 'Frequency',
      typeLabel: 'Wave',
      toneTypes: { chord: 'Chord', tone: 'Pure tone', pulse: 'Pulse' },
      saveAudio: 'Save audio',
      svgTitle: 'SVG Shape Bench',
      saveSvg: 'Save SVG shape',
      shapes: { house: 'House', circle: 'Circle', square: 'Square', triangle: 'Triang.', star: 'Star' },
      shelfTitle: 'Closet Shelf',
      targetScene: 'Target scene:',
      savedCount: 'saved',
      emptyTitle: 'The closet is empty',
      emptySub: 'Upload images, audio, or fonts (.ttf, .woff2), or use the audio synth and SVG bench.',
      fontPreview: 'Typography preview 123',
      applyIn: 'Apply in',
      placeIn: 'Place in',
    },
    living: {
      controlsTitle: 'HTML5 Controls',
      controlLabels: { title: 'Title', text: 'Text', button: 'Button', input: 'Input', checkbox: 'Checkbox' },
      assetsTitle: 'Closet Resources',
      uploadMore: '+ Upload',
      noAssets: 'No placeable resources yet. Add images or audio in the Closet.',
      physicsTitle: '2D Physics',
      physicsOn: 'Active',
      physicsOff: 'Optional (Off)',
      layersTitle: 'Layers in',
      noObjects: 'No objects placed yet.',
      stageLabel: 'Stage',
      emptyStageTitle: 'Empty stage',
      emptyStageSub: 'Add a control or resource from the left and drag it on the grid.',
      inspectorTitle: 'HTML5 Attributes & Physics',
      tabs: { html5: 'HTML5', style: 'Style', physics: 'Physics' },
      inspectorEmpty: 'Click any stage object to edit its HTML5 attributes (id, class, src, href, font, disabled), transforms, and physics.',
      visible: 'visible',
      hidden: 'hidden',
      physicsBody: 'Physics body',
      physicsShape: 'Collision shape',
      bodyTypes: { none: 'No physics', dynamic: 'dynamic (falls/bounces)', static: 'static (wall/floor)', kinematic: 'kinematic' },
      restitution: 'restitution (bounce)',
      friction: 'friction',
    },
    study: {
      timelineTitle: 'Flash Timeline (Tweens, Eases & FPS)',
      timelineSub: 'Visual frames at',
      play: 'Play',
      stop: 'Stop',
      mdTableBtn: 'Markdown Table',
      mdTableTitle: 'Timeline Markdown Table ([duration, value, "ease"])',
      convertToFlash: 'Convert table → Flash Timeline',
      newTrackBtn: 'New Tween track',
      layerCol: 'Property',
      stepsCol: 'Steps',
      emptyTracks: 'No Tween tracks yet. Pick an object and property above to add your first tween.',
      emptyObjects: 'Place objects in the Living first, then animate them with Tween tracks.',
      addStep: '+Step',
      removeStep: 'Remove step',
      monitorLabel: 'Live monitor',
      physicsTag: 'Physics',
      eventsTitle: 'Events',
      eventsSub: 'addEventListener & per-slide |onVarChange|',
      newEvent: 'New',
      noEvents: 'No events yet',
      rulesTitle: 'HTML5 Rules & Formulas (Aligned at =)',
      rulesSub: 'Drag rows vertically to define exact execution order',
      toTheater: 'Test in Theater →',
      rulesEmpty: 'Select or create an event on the left to build HTML5 property rules.',
      triggerLabel: 'Trigger (EventListener / Reactive)',
      varWatchLabel: 'Watched global variable (this slide only)',
      targetLabel: 'Target element (#objLet)',
      colElement: 'Element / Var',
      colProp: 'HTML5 Property',
      colFormula: 'Math formula or value',
      colOrder: 'Order',
      addRule: 'Add rule',
      presets: {
        spin: 'Spin (90 * delta)',
        wave: 'Wave X (sin)',
        setVar: 'Change variable',
        next: 'Next scene',
        setClass: 'Set class',
      },
      onVarChangeOption: 'onVarChange (this slide only)',
    },
    theater: {
      screenTitle: 'HTML5 Projection Screen',
      pause: 'Pause',
      run: 'Run',
      restart: 'Restart',
      emptyScene: 'Scene has no objects yet',
      emptySceneSub: 'Add controls in the Living or write directly in the plain .frontscr panel.',
      playing: 'Playing',
      stopped: 'Stopped',
      playBtn: 'Play',
      pauseBtn: 'Pause',
      plainTitle: 'Plain Text',
      manualMode: 'Manual edit mode active (includes Markdown tables)',
      autoMode: 'Auto-synced from your rooms and timeline',
      toVisual: 'Sync to Flash UI',
      converted: 'Synced',
      autoSync: 'Auto-sync',
      copy: 'Copy text',
      copied: 'Copied',
      saveFrontscr: 'Save .frontscr',
      exportHtml: 'Export HTML5',
      physicsActive: 'Physics active',
    },
  },
  es: {
    rooms: {
      foyer: {
        title: 'Entrada',
        houseArea: 'Plano y Cimientos',
        frontscriptAspect: 'Escenas, // layout · theme · ux y Estado TS',
        description: 'Define la estructura de diapositivas, directivas visuales y variables globales TypeScript.',
      },
      closet: {
        title: 'Depósito',
        houseArea: 'Ático de Recursos',
        frontscriptAspect: 'objLet asset : "archivo" (imagen, audio, fuente)',
        description: 'Guarda imágenes, audios con duración decimal, fuentes, video o JSON en localStorage.',
      },
      living: {
        title: 'Living',
        houseArea: 'Escenario Visual',
        frontscriptAspect: 'objLet HTML5, fuentes, física y propiedades',
        description: 'Coloca objetos en el escenario estilo Flash, edita atributos HTML5 y activa física.',
      },
      study: {
        title: 'Escritorio',
        houseArea: 'Timeline y Reglas',
        frontscriptAspect: 'Tabla Timeline [dur, val, ease] · |onVarChange| · = reglas',
        description: 'Crea tweens con eases en frames/FPS, tablas Markdown y reglas verticales en =.',
      },
      theater: {
        title: 'Proyección',
        houseArea: 'Cine y Exportación',
        frontscriptAspect: 'Ejecutar HTML5 · Sincronizar .frontscr · Exportar',
        description: 'Ejecuta física, audio, fuentes y tweens en vivo; edita .frontscr o exporta HTML5.',
      },
    },
    nav: {
      saveLocal: 'Guardar local',
      prevRoom: 'Habitación anterior',
      nextRoom: 'Siguiente habitación',
      sceneSingular: 'escena',
      scenePlural: 'escenas',
      assetSingular: 'asset',
      assetPlural: 'assets',
      clearHouse: 'Vaciar',
      clearConfirm: '¿Vaciar toda la casa? Se eliminarán escenas, recursos y código guardados en localStorage.',
      clearYes: 'Sí, vaciar casa',
      cancel: 'Cancelar',
    },
    idle: {
      label: 'Guía en reposo',
      paused: 'Pausada',
      hint: 'Solo sugiere una idea distinta si te detienes',
      pause: 'Pausar',
      resume: 'Reanudar',
      triggeredPrefix: 'Sugerencia tras',
      dismiss: 'Descartar sugerencia',
      prompts: {
        addControlTitle: 'El escenario está vacío: coloca tu primer objeto',
        addControlAction: 'Ir al Living',
        addControlHint: 'Agrega un título, texto o botón con objLet y arrástralo sobre la grilla.',
        addAssetTitle: 'Guarda una imagen, audio o fuente en el Depósito',
        addAssetAction: 'Ir al Depósito',
        addAssetHint: 'Sube archivos locales, sintetiza un audio WAV o arma una figura SVG.',
        addEventTitle: 'Dale interactividad o movimiento a tus objetos',
        addEventAction: 'Ir al Escritorio',
        addEventHint: 'Crea un bloque |onClick #id| con next() o agrega un tween en el timeline.',
        addSceneTitle: 'Agrega una segunda diapositiva en el Plano',
        addSceneAction: 'Ir a la Entrada',
        addSceneHint: 'Las escenas en FrontScript funcionan como diapositivas aisladas con next() y back().',
        addGlobalTitle: 'Declara una variable global TypeScript compartida',
        addGlobalAction: 'Ir a la Entrada',
        addGlobalHint: 'Por ejemplo: let score: number = 0; para compartir estado entre diapositivas.',
        animateTitle: 'Prueba una animación Flash con tween y ease',
        animateAction: 'Abrir Timeline',
        animateHint: 'Agrega una pista tween en el Escritorio y mira el monitor en vivo a tus FPS.',
        testTitle: 'Ejecuta tu FrontScript en la Sala de Proyección',
        testAction: 'Ir a Proyección',
        testHint: 'Prueba el HTML5 en vivo, edita el texto plano .frontscr o exporta el archivo.',
      themeTitle: 'Cambia el tema o layout de la escena actual',
        themeAction: 'Ajustar en Entrada',
        themeHint: 'Alterna // layout: two-columns o // theme: dark para transformar el escenario.',
      },
    },
    foyer: {
      blueprintTitle: 'Plano de Diapositivas',
      blueprintSub: 'Cada escena se aísla al compilar · page.total =',
      newScene: 'Nueva escena',
      projectName: 'Nombre del proyecto',
      toLiving: 'Amueblar en el Living →',
      directivesTitle: 'Directivas de la Escena Activa',
      directivesSub: 'Se emiten como comentarios limpios',
      layoutLabel: 'Disposición',
      themeLabel: 'Atmósfera',
      uxLabel: 'Intención UX',
      uxPlaceholder: 'Ej: foco claro en la acción principal y transición directa',
      globalsTitle: 'Cimientos TypeScript (Estado Global)',
      globalsSub: 'Variables tipadas y helpers compartidos entre todas las escenas',
      globalsPlaceholder: '// Vacío por defecto. Ejemplo:\nlet score: number = 0;\nconst MAX_SCORE: number = 100;',
      layouts: {
        title: 'Portada centrada',
        'title-image': 'Título y medio',
        'two-columns': 'Dos columnas',
        timeline: 'Secuencia',
        quiz: 'Pregunta',
        summary: 'Resumen',
        free: 'Libre',
      },
    },
    closet: {
      uploadTitle: 'Guardar Archivo en el Depósito',
      uploadSub: 'Imágenes, audio, fuentes (ttf, otf, woff2), video o JSON',
      selectFiles: 'Seleccionar archivos locales',
      uploadHint: 'Máximo 1.5 MB por archivo · Guardado en localStorage',
      sizeError: 'supera 1.5 MB. Usa archivos livianos para el almacenamiento local.',
      audioSynthTitle: 'Sintetizador de Audio WAV',
      audioSynthSub: 'Crea un audio con duración decimal exacta (0.0–1.0 y segundos).',
      varLabel: 'Nombre objLet',
      durationLabel: 'Duración (seg)',
      freqLabel: 'Frecuencia',
      typeLabel: 'Onda',
      toneTypes: { chord: 'Acorde', tone: 'Tono puro', pulse: 'Pulso' },
      saveAudio: 'Guardar audio',
      svgTitle: 'Mesa de Figuras SVG',
      saveSvg: 'Guardar figura SVG',
      shapes: { house: 'Casa', circle: 'Círc.', square: 'Cuad.', triangle: 'Triáng.', star: 'Estrella' },
      shelfTitle: 'Estantería del Depósito',
      targetScene: 'Escena destino:',
      savedCount: 'guardados',
      emptyTitle: 'El depósito está vacío',
      emptySub: 'Sube imágenes, audios o fuentes (.ttf, .woff2), o usa el sintetizador WAV y la mesa SVG.',
      fontPreview: 'Vista previa tipográfica 123',
      applyIn: 'Aplicar en',
      placeIn: 'Colocar en',
    },
    living: {
      controlsTitle: 'Controles HTML5',
      controlLabels: { title: 'Título', text: 'Texto', button: 'Botón', input: 'Campo', checkbox: 'Casilla' },
      assetsTitle: 'Recursos del Depósito',
      uploadMore: '+ Subir',
      noAssets: 'Sin recursos colocables aún. Sube imágenes o audios en el Depósito.',
      physicsTitle: 'Física 2D',
      physicsOn: 'Activa',
      physicsOff: 'Opcional (Off)',
      layersTitle: 'Capas en',
      noObjects: 'Ningún objeto colocado todavía.',
      stageLabel: 'Escenario',
      emptyStageTitle: 'Escenario vacío',
      emptyStageSub: 'Agrega un control o recurso desde la izquierda y arrástralo sobre la grilla.',
      inspectorTitle: 'Atributos HTML5 y Física',
      tabs: { html5: 'HTML5', style: 'Estilo', physics: 'Física' },
      inspectorEmpty: 'Haz clic sobre un objeto para editar sus atributos HTML5 (id, class, src, href, font, disabled), transformaciones y física.',
      visible: 'visible',
      hidden: 'oculto',
      physicsBody: 'Cuerpo físico',
      physicsShape: 'Forma colisión',
      bodyTypes: { none: 'Sin física', dynamic: 'dynamic (cae/rebota)', static: 'static (pared/suelo)', kinematic: 'kinematic' },
      restitution: 'restitución (rebote)',
      friction: 'fricción',
    },
    study: {
      timelineTitle: 'Timeline Flash (Tweens, Eases y FPS)',
      timelineSub: 'Frames visuales a',
      play: 'Play',
      stop: 'Detener',
      mdTableBtn: 'Tabla Markdown',
      mdTableTitle: 'Tabla Markdown Timeline ([duración, valor, "ease"])',
      convertToFlash: 'Convertir tabla → Timeline Flash',
      newTrackBtn: 'Nueva pista Tween',
      layerCol: 'Propiedad',
      stepsCol: 'Pasos',
      emptyTracks: 'Sin pistas Tween aún. Elige un objeto y propiedad arriba para añadir tu primer tween.',
      emptyObjects: 'Coloca objetos en el Living primero y luego anímalos aquí con tweens.',
      addStep: '+Paso',
      removeStep: 'Quitar paso',
      monitorLabel: 'Monitor en vivo',
      physicsTag: 'Física',
      eventsTitle: 'Eventos',
      eventsSub: 'addEventListener y |onVarChange| por diapositiva',
      newEvent: 'Nuevo',
      noEvents: 'Sin eventos todavía',
      rulesTitle: 'Reglas HTML5 y Fórmulas (Alineadas en =)',
      rulesSub: 'Arrastra las filas verticalmente para definir el orden exacto de ejecución',
      toTheater: 'Probar en Proyección →',
      rulesEmpty: 'Selecciona o crea un evento a la izquierda para construir sus reglas HTML5.',
      triggerLabel: 'Disparador (EventListener / Reactivo)',
      varWatchLabel: 'Variable global observada (solo esta diapositiva)',
      targetLabel: 'Elemento objetivo (#objLet)',
      colElement: 'Elemento / Var',
      colProp: 'Propiedad HTML5',
      colFormula: 'Fórmula o valor',
      colOrder: 'Orden',
      addRule: 'Agregar regla',
      presets: {
        spin: 'Girar (90 * delta)',
        wave: 'Onda X (sin)',
        setVar: 'Cambiar variable',
        next: 'Siguiente escena',
        setClass: 'Cambiar class',
      },
      onVarChangeOption: 'onVarChange (solo esta diapositiva)',
    },
    theater: {
      screenTitle: 'Pantalla de Proyección HTML5',
      pause: 'Pausar',
      run: 'Ejecutar',
      restart: 'Reiniciar',
      emptyScene: 'Escena sin objetos todavía',
      emptySceneSub: 'Agrega controles en el Living o escribe directo en el panel .frontscr.',
      playing: 'Reproduciendo',
      stopped: 'Detenido',
      playBtn: 'Play',
      pauseBtn: 'Pausar',
      plainTitle: 'Texto Plano',
      manualMode: 'Modo edición manual activo (incluye tablas Markdown)',
      autoMode: 'Sincronizado desde tus habitaciones y timeline',
      toVisual: 'Pasar a visual Flash',
      converted: 'Convertido',
      autoSync: 'Auto-sincronizar',
      copy: 'Copiar texto',
      copied: 'Copiado',
      saveFrontscr: 'Guardar .frontscr',
      exportHtml: 'Exportar HTML5',
      physicsActive: 'Física activa',
    },
  },
};
