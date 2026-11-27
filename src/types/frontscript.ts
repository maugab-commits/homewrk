export type Lang = 'en' | 'es';

export type RoomId = 'foyer' | 'closet' | 'living' | 'study' | 'theater';

export type SceneLayout =
  | 'title'
  | 'title-image'
  | 'two-columns'
  | 'timeline'
  | 'quiz'
  | 'summary'
  | 'free';

export type SceneTheme =
  | 'minimal'
  | 'dark'
  | 'school'
  | 'history'
  | 'science'
  | 'business';

export type ControlKind = 'title' | 'text' | 'button' | 'input' | 'checkbox';

export type AssetKind = 'image' | 'audio' | 'video' | 'json' | 'font';

export interface AssetItem {
  id: string;
  varName: string;
  fileName: string;
  extension: string;
  kind: AssetKind;
  dataUrl: string;
  durationSec?: number;
  fontFamilyName?: string;
  sizeBytes: number;
  createdAt: number;
}

export type PhysicsBodyType = 'none' | 'dynamic' | 'static' | 'kinematic';
export type PhysicsShape = 'box' | 'circle';

export interface ObjectPhysicsConfig {
  bodyType: PhysicsBodyType;
  shape: PhysicsShape;
  restitution: number;
  friction: number;
  density: number;
}

export interface StageObject {
  id: string;
  varName: string;
  kind: 'control' | 'asset';
  controlKind?: ControlKind;
  assetId?: string;
  text: string;
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
  autoplay?: boolean;
  physics?: ObjectPhysicsConfig;
}

export type EventType =
  | 'onSetup'
  | 'onEnter'
  | 'onExit'
  | 'onEnterFrame'
  | 'onClick'
  | 'onDoubleClick'
  | 'onHover'
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'onInput'
  | 'onChange'
  | 'onKeyDown'
  | 'onKeyUp'
  | 'onVarChange';

export type EventPropertyKey =
  | 'rotation'
  | 'x'
  | 'y'
  | 'scale'
  | 'opacity'
  | 'visible'
  | 'text'
  | 'class'
  | 'src'
  | 'href'
  | 'alt'
  | 'title'
  | 'placeholder'
  | 'value'
  | 'disabled'
  | 'htmlId'
  | 'font'
  | 'fontSize'
  | 'backgroundColor'
  | 'color'
  | 'borderRadius'
  | 'width'
  | 'height'
  | 'playing'
  | 'progress'
  | 'next'
  | 'back'
  | 'setVar';

export type RuleOperator = '=' | '+=' | '-=' | '*=';

export interface EventRule {
  id: string;
  targetVarName: string;
  property: EventPropertyKey;
  operator: RuleOperator;
  formula: string;
}

export interface EventBlock {
  id: string;
  eventType: EventType;
  targetVarName?: string;
  rules?: EventRule[];
  code: string;
}

export type EaseType =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInOutCubic'
  | 'easeOutBack'
  | 'easeOutBounce'
  | 'step';

export interface TweenStep {
  id: string;
  durationSec: number;
  toValue: string;
  ease: EaseType;
}

export interface TimelineTrack {
  id: string;
  targetVarName: string;
  property: EventPropertyKey;
  steps: TweenStep[];
}

export interface ScenePhysicsConfig {
  enabled: boolean;
  gravityX: number;
  gravityY: number;
}

export interface Scene {
  id: string;
  name: string;
  layout: SceneLayout;
  theme: SceneTheme;
  uxNote: string;
  fps: number;
  durationFrames: number;
  physics: ScenePhysicsConfig;
  objects: StageObject[];
  timelines: TimelineTrack[];
  events: EventBlock[];
}

export interface HomewrkProject {
  id: string;
  title: string;
  globalsTs: string;
  scenes: Scene[];
  assets: AssetItem[];
  activeSceneId: string;
  customFrontScript: string | null;
  updatedAt: number;
}

export const ROOM_ORDER: RoomId[] = ['foyer', 'closet', 'living', 'study', 'theater'];
