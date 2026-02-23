import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "fs";

function copyManifestAndPublic(): Plugin {
  return {
    name: "copy-manifest-and-public",
    writeBundle() {
      // Copy manifest.json
      copyFileSync(
        resolve(__dirname, "manifest.json"),
        resolve(__dirname, "dist/manifest.json")
      );

      // Copy public/icons
      const iconsDir = resolve(__dirname, "public/icons");
      const outIcons = resolve(__dirname, "dist/icons");
      if (existsSync(iconsDir)) {
        mkdirSync(outIcons, { recursive: true });
        for (const file of readdirSync(iconsDir)) {
          copyFileSync(resolve(iconsDir, file), resolve(outIcons, file));
        }
      }

      // Move sidepanel HTML to root of dist and fix paths
      const src = resolve(__dirname, "dist/src/sidepanel/index.html");
      const dest = resolve(__dirname, "dist/sidepanel.html");
      if (existsSync(src)) {
        let html = readFileSync(src, "utf-8");
        // Fix asset paths: since file was nested 2 levels deep, Vite outputs
        // paths relative to dist/src/sidepanel. We need them relative to dist/.
        html = html.replace(/\.\.\/\.\.\/\.\.\//g, "./");
        html = html.replace(/\.\.\/\.\.\//g, "./");
        html = html.replace(/\.\.\//g, "./");
        writeFileSync(dest, html, "utf-8");
      }

      // Clean up leftover nested directory
      const leftover = resolve(__dirname, "dist/src");
      if (existsSync(leftover)) {
        rmSync(leftover, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyManifestAndPublic()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "src/sidepanel/index.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
