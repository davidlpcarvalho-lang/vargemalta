// Relevo procedural inspirado nas serras de Vargem Alta: uma "vargem" (várzea)
// ao longo do rio, cercada por morros cobertos de Mata Atlântica.
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';

export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const simplex = new SimplexNoise({ random: rng(1988) });
export const noise = (x, z) => simplex.noise(x, z);
export const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

export const WATER_Y = -0.9;
export const riverX = z => -8 + 16 * Math.sin(z * 0.022) + 5 * Math.sin(z * 0.061 + 1.3);

// Poço da cachoeira (precisa ser conhecido pelo relevo)
const FALLS = { x: riverX(-80) - 76, z: -80 };
function base(x, z) {
  const d = Math.abs(x - riverX(z));
  const m = ss(30, 122, d);
  return m * m * 64 + noise(x * 0.011, z * 0.011) * 20 * m
    + (noise(x * 0.034 + 7, z * 0.034) * 0.5 + 0.5) * 3.2 * (1 - m * 0.5)
    + noise(x * 0.12, z * 0.12) * 0.35 + 0.9;
}
FALLS.y = base(FALLS.x, FALLS.z) - 0.6;
export { FALLS };

// Leito da ferrovia: paralelo ao rio, com aterro suavizado
const STX = riverX(0) + 24;
export const trackX = z => lerp(STX, riverX(z) + 24, ss(14, 46, Math.abs(z))); // reto junto à estação
const TY = [], T0 = -340, TS = 4;
for (let z = T0; z <= 340; z += TS) TY.push(base(trackX(z), z));
const TYS = TY.map((_, i) => { let s = 0, n = 0; for (let k = -6; k <= 6; k++) { const v = TY[i + k]; if (v !== undefined) { s += v; n++; } } return s / n + 0.25; });
export function trackY(z) { const f = (z - T0) / TS, i = Math.max(0, Math.min(TYS.length - 2, Math.floor(f))), t = Math.min(1, Math.max(0, f - i)); return TYS[i] * (1 - t) + TYS[i + 1] * t; }

export function heightAt(x, z) {
  const d = Math.abs(x - riverX(z));
  let h = base(x, z);
  const dt = Math.abs(x - trackX(z));
  if (dt < 8) h = lerp(trackY(z), h, ss(3, 8, dt));
  const ford = 1 - ss(3, 7, Math.abs(z - 30));            // vau raso em z = 30
  const bed = lerp(-2.6, -1.25, ford);
  h = lerp(h, bed, 1 - ss(2.5, 9, d));
  const dp = Math.hypot(x - FALLS.x, z - FALLS.z);         // poço da cachoeira
  if (dp < 11) h = lerp(FALLS.y - 1.6, h, ss(4.5, 11, dp));
  return h;
}

export function slopeAt(x, z) {
  const e = 1.2;
  return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
}
