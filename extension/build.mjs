import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync, cpSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const outdir = join(__dirname, 'dist');

if (!existsSync(outdir)) {
  mkdirSync(outdir, { recursive: true });
}

const commonConfig = {
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch,
  target: ['chrome100'],
  format: 'esm',
};

async function build() {
  try {
    await esbuild.build({
      ...commonConfig,
      entryPoints: ['src/content/index.ts'],
      outfile: 'dist/content/index.js',
      format: 'iife',
    });
    console.log('[Build] Content script built');

    await esbuild.build({
      ...commonConfig,
      entryPoints: ['src/background/service-worker.ts'],
      outfile: 'dist/background/service-worker.js',
    });
    console.log('[Build] Background service worker built');

    await esbuild.build({
      ...commonConfig,
      entryPoints: ['src/popup/index.ts'],
      outfile: 'dist/popup/index.js',
      format: 'iife',
    });
    console.log('[Build] Popup script built');

    copyFileSync('manifest.json', join(outdir, 'manifest.json'));
    copyFileSync('popup.html', join(outdir, 'popup.html'));
    
    mkdirSync(join(outdir, 'styles'), { recursive: true });
    cpSync('styles', join(outdir, 'styles'), { recursive: true });
    
    mkdirSync(join(outdir, 'icons'), { recursive: true });
    if (existsSync('icons')) {
      cpSync('icons', join(outdir, 'icons'), { recursive: true });
    }
    
    console.log('[Build] Assets copied');
    console.log('[Build] Complete!');
  } catch (error) {
    console.error('[Build] Error:', error);
    process.exit(1);
  }
}

build();
