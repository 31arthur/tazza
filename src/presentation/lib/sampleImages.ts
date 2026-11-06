import { SAMPLE_IMAGE_KEYS, type SampleImageKey } from '@domain/samples/sampleStories';
import type { SampleImage } from '@domain/usecases/article/LoadSampleStories';

const W = 1200;
const H = 800;

/** Small deterministic generator so every run draws the same pictures. */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const gradient = (ctx: CanvasRenderingContext2D, y0: number, y1: number, a: string, b: string) => {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, y1 - y0);
};

const polygon = (ctx: CanvasRenderingContext2D, pts: [number, number][], fill: string) => {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
};

const circle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
};

type Painter = (ctx: CanvasRenderingContext2D, rand: () => number) => void;

const painters: Record<SampleImageKey, Painter> = {
  city(ctx, rand) {
    gradient(ctx, 0, H, '#1e3a8a', '#fb923c');
    circle(ctx, 900, 330, 90, 'rgba(255,237,180,0.9)');
    for (let x = 0; x < W; ) {
      const w = 60 + rand() * 90;
      const h = 180 + rand() * 360;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, H - 150 - h, w, h + 150);
      for (let wy = H - 140 - h; wy < H - 190; wy += 34) {
        for (let wx = x + 10; wx < x + w - 14; wx += 22) {
          if (rand() > 0.55) {
            ctx.fillStyle = 'rgba(253,224,71,0.85)';
            ctx.fillRect(wx, wy, 10, 16);
          }
        }
      }
      x += w + 6;
    }
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, H - 230, W, 26); // metro viaduct
    for (let x = 60; x < W; x += 220) ctx.fillRect(x, H - 204, 28, 204);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(380, H - 262, 260, 32); // train
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(380, H - 246, 260, 8);
  },
  reservoir(ctx) {
    gradient(ctx, 0, 380, '#7dd3fc', '#e0f2fe');
    polygon(ctx, [[0, 380], [220, 230], [460, 370], [0, 420]], '#166534');
    polygon(ctx, [[1200, 360], [930, 210], [640, 380], [1200, 430]], '#15803d');
    gradient(ctx, 380, H, '#0ea5e9', '#0c4a6e');
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(330, 360, 540, 70); // dam wall
    ctx.fillStyle = '#64748b';
    for (let x = 350; x < 860; x += 60) ctx.fillRect(x, 372, 36, 46);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let x = 350; x < 860; x += 60) ctx.fillRect(x + 8, 430, 20, 150); // released water
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    for (let y = 520; y < H; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + (x % 80 === 0 ? 6 : -6));
      ctx.stroke();
    }
  },
  field(ctx) {
    gradient(ctx, 0, 330, '#38bdf8', '#fef3c7');
    circle(ctx, 200, 150, 70, '#fde047');
    polygon(ctx, [[0, 330], [300, 270], [640, 330], [1000, 280], [1200, 330], [1200, 360], [0, 360]], '#4d7c0f');
    gradient(ctx, 330, H, '#65a30d', '#14532d');
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 10;
    for (let i = -6; i <= 14; i++) {
      ctx.beginPath();
      ctx.moveTo(600 + i * 12, 340);
      ctx.lineTo(600 + i * 150, H);
      ctx.stroke();
    }
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(900, 260, 90, 70);
    polygon(ctx, [[885, 262], [945, 215], [1005, 262]], '#b45309');
  },
  stadium(ctx, rand) {
    gradient(ctx, 0, 300, '#0f172a', '#334155');
    ctx.fillStyle = '#fde68a';
    for (const x of [140, 460, 740, 1060]) {
      ctx.fillRect(x - 3, 110, 6, 220);
      ctx.fillRect(x - 38, 90, 76, 28);
    }
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 280, W, 180);
    for (let x = 0; x < W; x += 14) {
      for (let y = 290; y < 450; y += 18) {
        ctx.fillStyle = ['#ef4444', '#3b82f6', '#fbbf24', '#e2e8f0'][Math.floor(rand() * 4)] ?? '#fff';
        ctx.fillRect(x, y, 8, 10);
      }
    }
    gradient(ctx, 460, H, '#4ade80', '#166534');
    ctx.fillStyle = '#d6b27a';
    ctx.fillRect(500, 540, 200, 190); // pitch
    ctx.fillStyle = '#fff';
    ctx.fillRect(590, 540, 20, 190);
    circle(ctx, 640, 600, 12, '#dc2626');
  },
  school(ctx) {
    gradient(ctx, 0, 480, '#7dd3fc', '#e0f2fe');
    ctx.fillStyle = '#fcd34d';
    ctx.fillRect(0, 480, W, 320);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(220, 250, 760, 260);
    polygon(ctx, [[190, 260], [600, 150], [1010, 260]], '#7c2d12');
    ctx.fillStyle = '#fef3c7';
    for (let x = 260; x < 940; x += 120) ctx.fillRect(x, 300, 70, 90);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(560, 390, 80, 120);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(1090, 160, 8, 340);
    polygon(ctx, [[1098, 164], [1170, 190], [1098, 216]], '#f97316');
    for (const x of [90, 1120]) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 8, 400, 16, 110);
      circle(ctx, x, 370, 60, '#15803d');
    }
  },
  kites(ctx, rand) {
    gradient(ctx, 0, H, '#38bdf8', '#fde68a');
    circle(ctx, 1000, 140, 70, 'rgba(255,255,255,0.8)');
    const colours = ['#ef4444', '#f59e0b', '#22c55e', '#a855f7', '#ec4899', '#0ea5e9'];
    for (let i = 0; i < 16; i++) {
      const x = 80 + rand() * 1040;
      const y = 60 + rand() * 420;
      const s = 36 + rand() * 30;
      ctx.strokeStyle = 'rgba(30,41,59,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + s * 1.4);
      ctx.quadraticCurveTo(x + (rand() - 0.5) * 200, 640, 400 + rand() * 400, H);
      ctx.stroke();
      polygon(ctx, [[x, y - s], [x + s * 0.8, y], [x, y + s * 1.4], [x - s * 0.8, y]], colours[i % colours.length] ?? '#f00');
    }
    ctx.fillStyle = '#1e293b';
    for (let x = 0; x < W; x += 170) ctx.fillRect(x, H - 120 + (x % 3) * 12, 150, 140);
  },
};

const render = (key: SampleImageKey, index: number): Promise<SampleImage> => {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas is not available'));
  painters[key](ctx, rng(index + 7));
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve({ blob, widthPx: W, heightPx: H }) : reject(new Error('Could not encode image')),
      'image/jpeg',
      0.88,
    ),
  );
};

/** Draws the illustrated placeholder "photos" used by the sample stories. */
export async function createSampleImages(): Promise<Record<SampleImageKey, SampleImage>> {
  const entries = await Promise.all(
    SAMPLE_IMAGE_KEYS.map(async (key, i) => [key, await render(key, i)] as const),
  );
  return Object.fromEntries(entries) as Record<SampleImageKey, SampleImage>;
}
