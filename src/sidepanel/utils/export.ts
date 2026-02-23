import type { AnalysisResult } from "../../shared/types";

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsJSON(result: AnalysisResult, siteName: string) {
  const clean = {
    site: siteName,
    timestamp: new Date(result.timestamp).toISOString(),
    elementCount: result.elementCount,
    styleDNA: result.styleDNA,
    colors: result.colors.map((cat) => ({
      category: cat.category,
      colors: cat.colors.map((c) => ({
        hex: c.hex,
        percentage: c.percentage,
      })),
    })),
    gradients: result.gradients.map((g) => ({
      type: g.type,
      css: g.raw,
      colors: g.colors,
      count: g.count,
    })),
    typography: result.typography.map((t) => ({
      fontFamily: t.fontFamily,
      fontSize: t.fontSize,
      fontWeight: t.fontWeight,
      lineHeight: t.lineHeight,
      fontSource: t.fontSource,
      percentage: t.percentage,
    })),
    spacing: result.spacing.map((s) => ({
      value: s.value,
      unit: s.unit,
      count: s.count,
    })),
    contentWidths: result.contentWidths.map((w) => ({
      value: w.value,
      unit: w.unit,
      property: w.property,
      count: w.count,
    })),
    decorations: {
      radii: result.radii.map((r) => ({ value: r.value, count: r.count })),
      shadows: result.shadows.map((s) => ({ normalized: s.normalized, count: s.count })),
    },
    contrastPairs: result.contrastPairs.map((p) => ({
      background: p.bgHex,
      foreground: p.fgHex,
      ratio: p.ratio,
    })),
  };

  const slug = siteName.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "export";
  downloadFile(JSON.stringify(clean, null, 2), `tonmana_${slug}.json`, "application/json");
}

export function exportAsCSS(result: AnalysisResult, siteName: string) {
  const lines: string[] = [];
  lines.push(`/* Tone & Manner — ${siteName} */`);
  lines.push(`/* Generated: ${new Date(result.timestamp).toISOString()} */`);
  lines.push("");
  lines.push(":root {");

  // Colors
  const bgColors = result.colors.find((c) => c.category === "background")?.colors || [];
  const textColors = result.colors.find((c) => c.category === "text")?.colors || [];
  const borderColors = result.colors.find((c) => c.category === "border")?.colors || [];

  bgColors.forEach((c, i) => {
    lines.push(`  --bg-${i + 1}: ${c.hex};`);
  });
  textColors.forEach((c, i) => {
    lines.push(`  --text-${i + 1}: ${c.hex};`);
  });
  borderColors.forEach((c, i) => {
    lines.push(`  --border-${i + 1}: ${c.hex};`);
  });

  lines.push("");

  // Typography
  const fontFamilies = [...new Set(result.typography.map((t) => t.fontFamily))];
  fontFamilies.forEach((f, i) => {
    lines.push(`  --font-${i + 1}: "${f}";`);
  });

  const fontSizes = [...new Set(result.typography.map((t) => t.fontSize))].sort((a, b) => b - a);
  fontSizes.forEach((s, i) => {
    lines.push(`  --font-size-${i + 1}: ${s}px;`);
  });

  lines.push("");

  // Spacing
  result.spacing.forEach((s, i) => {
    lines.push(`  --space-${i + 1}: ${s.value}${s.unit};`);
  });

  lines.push("");

  // Radii
  result.radii.forEach((r, i) => {
    lines.push(`  --radius-${i + 1}: ${r.value};`);
  });

  lines.push("}");

  // Gradients
  if (result.gradients.length > 0) {
    lines.push("");
    lines.push("/* Gradients */");
    result.gradients.forEach((g, i) => {
      lines.push(`/* gradient-${i + 1}: ${g.raw} */`);
    });
  }

  const slug = siteName.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "export";
  downloadFile(lines.join("\n"), `tonmana_${slug}.css`, "text/css");
}
