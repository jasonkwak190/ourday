import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// ── 로고 SVG ─────────────────────────────────────────────────────
// 두 겹치는 링 (커플 상징) — Toss 블루 배경
function makeSvg(size) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r  = s * 0.195;          // 링 반지름
  const gap = s * 0.115;          // 두 링 중심 간격 (절반)
  const stroke = s * 0.052;       // 테두리 두께
  const rx = s * 0.22;            // 배경 모서리 둥글기

  const lx = cx - gap;            // 왼쪽 링 중심
  const rx2 = cx + gap;           // 오른쪽 링 중심

  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#4A9BFF"/>
      <stop offset="100%" stop-color="#1B64DA"/>
    </linearGradient>
  </defs>

  <!-- 배경 -->
  <rect width="${s}" height="${s}" rx="${rx}" fill="url(#bg)"/>

  <!-- 왼쪽 링 -->
  <circle cx="${lx}" cy="${cy}" r="${r}"
    fill="none" stroke="white" stroke-width="${stroke}" opacity="0.95"/>

  <!-- 오른쪽 링 -->
  <circle cx="${rx2}" cy="${cy}" r="${r}"
    fill="none" stroke="white" stroke-width="${stroke}" opacity="0.95"/>

  <!-- 교차 하이라이트 (중앙 반짝임) -->
  <circle cx="${cx}" cy="${cy - s * 0.035}" r="${s * 0.028}"
    fill="white" opacity="0.35"/>
</svg>`;
}

// ── 스플래시 SVG (가로 앱 이름 포함) ────────────────────────────
function makeSplashSvg(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const iconSize = Math.min(w, h) * 0.22;
  const r  = iconSize * 0.195;
  const gap = iconSize * 0.115;
  const stroke = iconSize * 0.052;
  const lx = cx - gap;
  const rx2 = cx + gap;
  const iconY = cy - iconSize * 0.18;

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#4A9BFF"/>
      <stop offset="100%" stop-color="#1B64DA"/>
    </linearGradient>
  </defs>

  <rect width="${w}" height="${h}" fill="url(#bg)"/>

  <!-- 링 -->
  <circle cx="${lx}" cy="${iconY}" r="${r}"
    fill="none" stroke="white" stroke-width="${stroke}" opacity="0.95"/>
  <circle cx="${rx2}" cy="${iconY}" r="${r}"
    fill="none" stroke="white" stroke-width="${stroke}" opacity="0.95"/>

  <!-- 앱 이름 -->
  <text x="${cx}" y="${iconY + iconSize * 0.72}"
    font-family="-apple-system, Helvetica Neue, sans-serif"
    font-size="${iconSize * 0.38}" font-weight="700"
    fill="white" text-anchor="middle" opacity="0.95">Ourday</text>

  <!-- 서브타이틀 -->
  <text x="${cx}" y="${iconY + iconSize * 1.05}"
    font-family="-apple-system, Helvetica Neue, sans-serif"
    font-size="${iconSize * 0.16}" font-weight="400"
    fill="white" text-anchor="middle" opacity="0.65">우리의 날</text>
</svg>`;
}

async function generate() {
  // ── 아이콘 사이즈 목록 ─────────────────────────────────────────
  const iconSizes = [
    // PWA / 일반
    { size: 512, out: 'public/icon-512.png' },
    { size: 192, out: 'public/icon-192.png' },
    { size: 180, out: 'public/apple-touch-icon.png' },
    // Android (res/mipmap 폴더)
    { size: 48,  out: 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png' },
    { size: 48,  out: 'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png' },
    { size: 72,  out: 'android/app/src/main/res/mipmap-hdpi/ic_launcher.png' },
    { size: 72,  out: 'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png' },
    { size: 96,  out: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png' },
    { size: 96,  out: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png' },
    { size: 144, out: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png' },
    { size: 144, out: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png' },
    { size: 192, out: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png' },
    { size: 192, out: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png' },
  ];

  for (const { size, out } of iconSizes) {
    const outPath = path.resolve(root, out);
    mkdirSync(path.dirname(outPath), { recursive: true });
    await sharp(Buffer.from(makeSvg(size)))
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`✓ ${out}`);
  }

  // ── 스플래시 스크린 ────────────────────────────────────────────
  const splashSizes = [
    { w: 2160, h: 2160, out: 'android/app/src/main/res/drawable/splash.png' },
    { w: 2160, h: 2160, out: 'public/splash.png' },
  ];

  for (const { w, h, out } of splashSizes) {
    const outPath = path.resolve(root, out);
    mkdirSync(path.dirname(outPath), { recursive: true });
    await sharp(Buffer.from(makeSplashSvg(w, h)))
      .resize(w, h)
      .png()
      .toFile(outPath);
    console.log(`✓ ${out}`);
  }

  console.log('\n🎉 아이콘 생성 완료!');
}

generate().catch(console.error);
