// Pre-generates responsive WebP variants of every photo in src/assets/photos,
// so images never depend on a hosted image-optimisation service (whose quota
// can run out). Output: public/img/<name>-<width>.webp
// Run after adding or changing a photo:  node scripts/build-images.mjs
import { readdirSync, mkdirSync } from "node:fs";
import { join, parse } from "node:path";
import sharp from "sharp";

export const WIDTHS = [160, 480, 800, 1200, 1760];
const SRC = "src/assets/photos";
const OUT = "public/img";
mkdirSync(OUT, { recursive: true });

for (const file of readdirSync(SRC).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))) {
  const { name } = parse(file);
  const img = sharp(join(SRC, file));
  const { width: orig } = await img.metadata();
  for (const w of WIDTHS) {
    // never upscale: small originals reuse their native width for larger slots
    await sharp(join(SRC, file))
      .resize({ width: Math.min(w, orig) })
      .webp({ quality: w <= 480 ? 72 : 78, effort: 6 })
      .toFile(join(OUT, `${name}-${w}.webp`));
  }
  console.log("✓", name);
}
