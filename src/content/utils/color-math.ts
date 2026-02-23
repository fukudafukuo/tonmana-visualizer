import type { RGBA, Lab } from "../../shared/types";

// ── RGB ↔ CIELAB ──

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function linearToXYZ(r: number, g: number, b: number): [number, number, number] {
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
  ];
}

// D65 reference white
const Xn = 0.95047;
const Yn = 1.00000;
const Zn = 1.08883;

function labF(t: number): number {
  const delta = 6 / 29;
  return t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
}

export function rgbaToLab(c: RGBA): Lab {
  const R = srgbToLinear(c.r);
  const G = srgbToLinear(c.g);
  const B = srgbToLinear(c.b);
  const [X, Y, Z] = linearToXYZ(R, G, B);

  const fx = labF(X / Xn);
  const fy = labF(Y / Yn);
  const fz = labF(Z / Zn);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

// ── CIEDE2000 ──

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function deg(r: number): number {
  return (r * 180) / Math.PI;
}

export function ciede2000(lab1: Lab, lab2: Lab): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab = (C1 + C2) / 2;

  const Cab7 = Math.pow(Cab, 7);
  const G = 0.5 * (1 - Math.sqrt(Cab7 / (Cab7 + Math.pow(25, 7))));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  let h1p = deg(Math.atan2(b1, a1p));
  if (h1p < 0) h1p += 360;
  let h2p = deg(Math.atan2(b2, a2p));
  if (h2p < 0) h2p += 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));

  const Lpm = (L1 + L2) / 2;
  const Cpm = (C1p + C2p) / 2;

  let Hpm: number;
  if (C1p * C2p === 0) {
    Hpm = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    Hpm = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    Hpm = (h1p + h2p + 360) / 2;
  } else {
    Hpm = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(rad(Hpm - 30)) +
    0.24 * Math.cos(rad(2 * Hpm)) +
    0.32 * Math.cos(rad(3 * Hpm + 6)) -
    0.20 * Math.cos(rad(4 * Hpm - 63));

  const SL =
    1 + (0.015 * (Lpm - 50) ** 2) / Math.sqrt(20 + (Lpm - 50) ** 2);
  const SC = 1 + 0.045 * Cpm;
  const SH = 1 + 0.015 * Cpm * T;

  const Cpm7 = Math.pow(Cpm, 7);
  const RT =
    -2 *
    Math.sqrt(Cpm7 / (Cpm7 + Math.pow(25, 7))) *
    Math.sin(rad(60 * Math.exp(-(((Hpm - 275) / 25) ** 2))));

  return Math.sqrt(
    (dLp / SL) ** 2 +
      (dCp / SC) ** 2 +
      (dHp / SH) ** 2 +
      RT * (dCp / SC) * (dHp / SH)
  );
}

// ── Contrast ratio (WCAG) ──

function relativeLuminance(c: RGBA): number {
  const R = srgbToLinear(c.r);
  const G = srgbToLinear(c.g);
  const B = srgbToLinear(c.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(c1: RGBA, c2: RGBA): number {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Helpers ──

export function rgbaToHex(c: RGBA): string {
  const r = Math.round(c.r).toString(16).padStart(2, "0");
  const g = Math.round(c.g).toString(16).padStart(2, "0");
  const b = Math.round(c.b).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`.toUpperCase();
}

export function parseColor(raw: string): RGBA | null {
  if (!raw || raw === "transparent" || raw === "initial" || raw === "inherit") {
    return null;
  }

  // rgba(r, g, b, a) or rgb(r, g, b)
  const rgbaMatch = raw.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/
  );
  if (rgbaMatch) {
    return {
      r: parseFloat(rgbaMatch[1]),
      g: parseFloat(rgbaMatch[2]),
      b: parseFloat(rgbaMatch[3]),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  // Modern syntax: rgb(r g b / a) or rgba(r g b / a)
  const modernMatch = raw.match(
    /rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/
  );
  if (modernMatch) {
    let alpha = 1;
    if (modernMatch[4] !== undefined) {
      alpha = modernMatch[4].endsWith("%")
        ? parseFloat(modernMatch[4]) / 100
        : parseFloat(modernMatch[4]);
    }
    return {
      r: parseFloat(modernMatch[1]),
      g: parseFloat(modernMatch[2]),
      b: parseFloat(modernMatch[3]),
      a: alpha,
    };
  }

  return null;
}

export function quantizeRGBA(c: RGBA, step: number): string {
  const r = Math.round(c.r / step) * step;
  const g = Math.round(c.g / step) * step;
  const b = Math.round(c.b / step) * step;
  const a = Math.round(c.a * 100) / 100;
  return `${r},${g},${b},${a}`;
}

export function quantizedKeyToRGBA(key: string): RGBA {
  const [r, g, b, a] = key.split(",").map(Number);
  return { r, g, b, a };
}
