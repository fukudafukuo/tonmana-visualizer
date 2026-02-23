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

export function exportAsPDF(result: AnalysisResult, siteName: string) {
  const bgColors = result.colors.find((c) => c.category === "background")?.colors || [];
  const textColors = result.colors.find((c) => c.category === "text")?.colors || [];
  const tone = result.styleDNA.tone;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Tone &amp; Manner — ${esc(siteName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; color: #1a1a2e; padding: 32px; max-width: 800px; margin: auto; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #6b7280; margin-bottom: 24px; }
  h2 { font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; }
  .tone-label { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .tone-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 16px; }
  .tone-tag { font-size: 10px; padding: 2px 8px; border-radius: 3px; background: #dbeafe; color: #2563eb; }
  .swatch-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .swatch-item { text-align: center; }
  .swatch { width: 48px; height: 48px; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 2px; }
  .swatch-label { font-size: 10px; font-family: monospace; color: #6b7280; }
  .typo-item { padding: 4px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
  .typo-item:last-child { border-bottom: none; }
  .mono { font-family: "SF Mono", Monaco, monospace; font-size: 11px; }
  .chip-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { padding: 3px 8px; background: #f8f9fa; border-radius: 4px; font-family: monospace; font-size: 12px; }
  .gradient-bar { width: 100%; height: 20px; border-radius: 4px; border: 1px solid #e5e7eb; margin-bottom: 4px; }
  .meta { font-size: 11px; color: #9ca3af; }
  @media print { body { padding: 16px; } }
</style>
</head><body>
<h1>Tone &amp; Manner Report</h1>
<div class="subtitle">${esc(siteName)} — ${new Date(result.timestamp).toLocaleDateString("ja-JP")} — ${result.elementCount} elements</div>

${tone ? `<div class="tone-label">${esc(tone.primary)} / ${esc(tone.secondary)}</div>
<div class="tone-tags">${tone.tags.map((t) => `<span class="tone-tag">${esc(t)}</span>`).join("")}</div>` : ""}

<h2>Background Colors</h2>
<div class="swatch-row">
${bgColors.slice(0, 8).map((c) => `<div class="swatch-item"><div class="swatch" style="background:${c.hex}"></div><div class="swatch-label">${c.hex}</div></div>`).join("")}
</div>

<h2>Text Colors</h2>
<div class="swatch-row">
${textColors.slice(0, 8).map((c) => `<div class="swatch-item"><div class="swatch" style="background:${c.hex}"></div><div class="swatch-label">${c.hex}</div></div>`).join("")}
</div>

${result.gradients.length > 0 ? `<h2>Gradients</h2>
${result.gradients.slice(0, 5).map((g) => `<div class="gradient-bar" style="background:${g.raw}"></div>`).join("")}` : ""}

<h2>Typography</h2>
${result.typography.map((t) => `<div class="typo-item"><strong>${esc(t.fontFamily)}</strong> <span class="mono">${t.fontSize}px / ${t.fontWeight} / ${t.lineHeight}</span>${t.fontSource !== "Unknown" ? ` <span class="meta">${t.fontSource}</span>` : ""}</div>`).join("")}

<h2>Spacing</h2>
<div class="chip-list">
${result.spacing.slice(0, 10).map((s) => `<span class="chip">${s.value}${s.unit} (${s.count})</span>`).join("")}
</div>

<h2>Border Radius</h2>
<div class="chip-list">
${result.radii.slice(0, 8).map((r) => `<span class="chip">${r.value} (${r.count})</span>`).join("")}
</div>

${result.shadows.length > 0 ? `<h2>Shadows</h2>
<div class="chip-list">
${result.shadows.slice(0, 5).map((s) => `<span class="chip">${esc(s.normalized)} (${s.count})</span>`).join("")}
</div>` : ""}

<h2>Contrast Pairs</h2>
${result.contrastPairs.slice(0, 8).map((p) => {
    const level = p.ratio >= 7 ? "AAA" : p.ratio >= 4.5 ? "AA" : p.ratio >= 3 ? "AA Large" : "Fail";
    return `<div class="typo-item"><span class="swatch" style="display:inline-block;width:16px;height:16px;vertical-align:middle;background:${p.bgHex}"></span> <span class="swatch" style="display:inline-block;width:16px;height:16px;vertical-align:middle;background:${p.fgHex}"></span> <span class="mono">${p.ratio}:1</span> <span class="meta">${level}</span></div>`;
  }).join("")}

</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  // Auto-trigger print dialog
  win.onload = () => win.print();
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
