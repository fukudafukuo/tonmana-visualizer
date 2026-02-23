// ── Color Types ──

export interface RGBA {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

export interface Lab {
  L: number;
  a: number;
  b: number;
}

export type ColorCategory =
  | "background"
  | "text"
  | "border"
  | "outline"
  | "shadow";

export interface ColorEntry {
  rgba: RGBA;
  hex: string;
  weight: number;
  percentage: number;
  representativeElements: ElementRef[];
}

export interface ElementRef {
  selector: string; // e.g. "div.hero-section"
  index: number; // nth element matching this in the page
}

export interface CategoryColors {
  category: ColorCategory;
  colors: ColorEntry[];
}

// ── Typography Types ──

export interface TypographyEntry {
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  lineHeight: string;
  weight: number;
  percentage: number;
  representativeElements: ElementRef[];
}

// ── Spacing Types ──

export interface SpacingEntry {
  value: number;
  unit: string;
  count: number;
  percentage: number;
}

// ── Content Width Types ──

export interface ContentWidthEntry {
  value: number;
  unit: string;
  property: "width" | "max-width";
  count: number;
  percentage: number;
  representativeElements: ElementRef[];
}

// ── Decoration Types ──

export interface RadiusEntry {
  value: string;
  count: number;
}

export interface ShadowEntry {
  raw: string;
  normalized: string;
  count: number;
}

// ── Style DNA ──

export interface StyleDNA {
  background: { label: string; hex: string }[];
  text: { label: string; hex: string }[];
  accent: { label: string; hex: string }[];
  fontSizes: number[];
  spacings: number[];
  radii: number[];
  shadowCount: number;
}

// ── Contrast ──

export interface ContrastPair {
  bgHex: string;
  fgHex: string;
  ratio: number;
}

// ── Full Analysis Result ──

export interface AnalysisResult {
  colors: CategoryColors[];
  typography: TypographyEntry[];
  spacing: SpacingEntry[];
  contentWidths: ContentWidthEntry[];
  radii: RadiusEntry[];
  shadows: ShadowEntry[];
  styleDNA: StyleDNA;
  contrastPairs: ContrastPair[];
  elementCount: number;
  timestamp: number;
}

// ── Messaging ──

export type MessageType =
  | "PING"
  | "START_ANALYSIS"
  | "STOP_ANALYSIS"
  | "ANALYSIS_PROGRESS"
  | "ANALYSIS_RESULT"
  | "ANALYSIS_ERROR"
  | "HIGHLIGHT_ELEMENT"
  | "CLEAR_HIGHLIGHTS";

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface ProgressPayload {
  phase: string;
  percent: number;
}

export interface HighlightPayload {
  selector: string;
  index: number;
}
