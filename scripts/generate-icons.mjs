#!/usr/bin/env node

/**
 * Generate PNG icons from SVG logo at required sizes for Chrome extension.
 * Usage: npx -y -p @resvg/resvg-js node scripts/generate-icons.mjs
 */

import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

const SVG_PATH = path.resolve('public/icons/logo.svg');
const OUTPUT_DIR = path.resolve('public/icons');
const SIZES = [16, 32, 48, 128];

const svg = fs.readFileSync(SVG_PATH, 'utf8');

for (const size of SIZES) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  });
  const rendered = resvg.render();
  const pngBuffer = rendered.asPng();
  const outPath = path.join(OUTPUT_DIR, `icon${size}.png`);
  fs.writeFileSync(outPath, pngBuffer);
  console.log(`✓ Generated ${outPath} (${size}x${size})`);
}

console.log('\nAll icons generated successfully!');
