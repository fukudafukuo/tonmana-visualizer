import type { ToneClassification, CategoryColors, RGBA } from "../../shared/types";

interface ToneInput {
  colors: CategoryColors[];
  fontSizes: number[];
  spacings: number[];
  radii: number[];
  shadowCount: number;
  gradientCount: number;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function analyzeColorCharacter(colors: CategoryColors[]) {
  const bgColors = colors.find((c) => c.category === "background")?.colors || [];
  const textColors = colors.find((c) => c.category === "text")?.colors || [];
  const allColors = [...bgColors, ...textColors];

  let avgSaturation = 0;
  let avgLightness = 0;
  let darkBgRatio = 0;
  let chromaticCount = 0;
  let totalWeight = 0;

  for (const c of allColors) {
    const hsl = rgbToHsl(c.rgba.r, c.rgba.g, c.rgba.b);
    const w = c.weight;
    avgSaturation += hsl.s * w;
    avgLightness += hsl.l * w;
    totalWeight += w;
    if (hsl.s > 0.15) chromaticCount++;
  }

  if (totalWeight > 0) {
    avgSaturation /= totalWeight;
    avgLightness /= totalWeight;
  }

  // Check dark mode
  for (const c of bgColors.slice(0, 2)) {
    const hsl = rgbToHsl(c.rgba.r, c.rgba.g, c.rgba.b);
    if (hsl.l < 0.3) darkBgRatio += c.percentage;
  }

  return {
    avgSaturation,
    avgLightness,
    isDark: darkBgRatio > 40,
    isMonochrome: chromaticCount <= 1,
    isHighSaturation: avgSaturation > 0.4,
    colorVariety: chromaticCount,
  };
}

export function classifyTone(input: ToneInput): ToneClassification {
  const colorChar = analyzeColorCharacter(input.colors);
  const tags: string[] = [];

  // Primary tone classification
  let primary = "";
  let secondary = "";

  // Font size spread (large spread = editorial, small = uniform)
  const fontRange = input.fontSizes.length > 1
    ? input.fontSizes[0] - input.fontSizes[input.fontSizes.length - 1]
    : 0;
  const hasLargeType = input.fontSizes.length > 0 && input.fontSizes[0] >= 32;

  // Radius character
  const avgRadius = input.radii.length > 0
    ? input.radii.reduce((a, b) => a + b, 0) / input.radii.length
    : 0;
  const isRounded = avgRadius > 12;
  const isSharp = input.radii.length === 0 || avgRadius <= 2;

  // Determine primary tone
  if (colorChar.isDark) {
    if (colorChar.isHighSaturation) {
      primary = "ダーク・ビビッド";
    } else {
      primary = "ダーク・モダン";
    }
    tags.push("ダークモード");
  } else if (colorChar.isMonochrome && isSharp) {
    primary = "ミニマル";
    tags.push("モノトーン");
  } else if (colorChar.isMonochrome && !isSharp) {
    primary = "クリーン";
    tags.push("モノトーン");
  } else if (colorChar.isHighSaturation && isRounded) {
    primary = "ポップ";
    tags.push("カラフル");
  } else if (colorChar.isHighSaturation && !isRounded) {
    primary = "ボールド";
    tags.push("カラフル");
  } else if (avgRadius > 8 && !colorChar.isHighSaturation) {
    primary = "フレンドリー";
  } else {
    primary = "スタンダード";
  }

  // Determine secondary impression
  if (hasLargeType && fontRange > 20) {
    secondary = "エディトリアル";
    tags.push("大見出し");
  } else if (fontRange < 8 && input.fontSizes.length > 2) {
    secondary = "ユニフォーム";
    tags.push("均一");
  } else if (input.shadowCount >= 5) {
    secondary = "リッチ";
    tags.push("シャドウ多用");
  } else if (input.shadowCount === 0 && isSharp) {
    secondary = "フラット";
    tags.push("フラット");
  } else {
    secondary = "バランス型";
  }

  // Additional tags
  if (input.gradientCount > 0) tags.push("グラデーション");
  if (isRounded) tags.push("丸みあり");
  if (isSharp) tags.push("シャープ");
  if (input.spacings.length > 0) {
    const maxSpace = Math.max(...input.spacings);
    if (maxSpace >= 48) tags.push("ゆったり");
    else if (maxSpace <= 16) tags.push("コンパクト");
  }

  return { primary, secondary, tags: tags.slice(0, 5) };
}
