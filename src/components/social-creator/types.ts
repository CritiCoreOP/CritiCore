import type { ElementAnimation } from "./animations";

export type ElementType = "text" | "image" | "icon" | "shape" | "score";

/** Drop shadow behind any element; for text it is a text shadow */
export interface ElementShadow {
  color: string;
  blur: number;
  x: number;
  y: number;
}

/** Colour corrections for pictures, in CSS filter units (1 = unchanged, blur in px) */
export interface ImageFilters {
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: number;
  blur: number;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
  /** Not drawn and not exported, still in the layer list */
  hidden?: boolean;
  /** Elements with the same group id are selected, moved and scaled together */
  groupId?: string;
  /** Own name in the layer list (icons use `name` for the icon itself) */
  layerName?: string;
  shadow?: ElementShadow | null;
  flipX?: boolean;
  flipY?: boolean;
  anim?: ElementAnimation;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: "left" | "center" | "right";
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  uppercase: boolean;
  italic: boolean;
  bgColor: string | null;
  padding: number;
  radius: number;
  /** Outline around the letters */
  strokeColor?: string;
  strokeWidth?: number;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  fit: "cover" | "contain";
  radius: number;
  label?: string;
  filters?: ImageFilters;
}

export interface IconElement extends BaseElement {
  type: "icon";
  name: string;
  color: string;
  strokeWidth: number;
  fill: boolean;
}

export interface ShapeElement extends BaseElement {
  type: "shape";
  fill: string;
  radius: number;
  borderColor: string;
  borderWidth: number;
}

export interface ScoreElement extends BaseElement {
  type: "score";
  value: number;
  label: string;
  color: string;
  bgColor: string;
}

export type CanvasElement =
  | TextElement
  | ImageElement
  | IconElement
  | ShapeElement
  | ScoreElement;

export type BackgroundType = "color" | "gradient" | "image";

export interface SlideBackground {
  type: BackgroundType;
  color: string;
  gradient: string;
  image: string | null;
  imageFit: "cover" | "contain";
  imageOpacity: number;
}

export interface Slide {
  id: string;
  formatId: string;
  width: number;
  height: number;
  background: SlideBackground;
  elements: CanvasElement[];
}
