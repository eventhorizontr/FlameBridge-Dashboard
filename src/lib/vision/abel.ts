/**
 * Onion-peeling Abel inversion (Dasch 1992, "One-dimensional tomography: a comparison of Abel,
 * onion-peeling, and filtered backprojection methods", Applied Optics 31(8):1146-1152,
 * DOI 10.1364/AO.31.001146).
 *
 * For an optically thin, axisymmetric emitter the camera records, at height y from the axis, the
 * line-of-sight integral P(y) = ∫ ε(r) dl. Splitting the radius into n rings of width Δ with constant
 * emission ε_i gives P_j = Σ_{i≥j} A_ji ε_i, with chord lengths
 *   A_ji = 2Δ ( sqrt((i+1)² − j²) − sqrt(i² − j²) ),   i ≥ j,
 * an upper-triangular system solved from the outside ring inwards. Negative values (noise) are
 * clamped to zero. Units follow P: here relative video brightness, so ε is relative emission.
 */

let cachedN = -1;
let cachedA: Float64Array | null = null;

function chordMatrix(n: number): Float64Array {
  if (cachedA && cachedN === n) return cachedA;
  const a = new Float64Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = j; i < n; i++) {
      a[j * n + i] = 2 * (Math.sqrt((i + 1) ** 2 - j ** 2) - Math.sqrt(Math.max(0, i ** 2 - j ** 2)));
    }
  }
  cachedA = a;
  cachedN = n;
  return a;
}

/**
 * Invert a projected half-profile `p` (p[j] at y = j·Δ, j = 0 on the axis) into ring emissions.
 * `delta` is the ring width in the same length unit as the result's inverse (ε per unit length).
 */
export function onionPeel(p: ArrayLike<number>, delta = 1): Float64Array {
  const n = p.length;
  const a = chordMatrix(n);
  const eps = new Float64Array(n);
  for (let j = n - 1; j >= 0; j--) {
    let rest = p[j];
    for (let i = j + 1; i < n; i++) rest -= a[j * n + i] * delta * eps[i];
    const diag = a[j * n + j] * delta;
    eps[j] = diag > 0 ? Math.max(0, rest / diag) : 0;
  }
  return eps;
}

/** Symmetrise an image column about the axis: average of the upper and lower half-profiles. */
export function symmetrise(column: ArrayLike<number>, axis: number, n: number, step = 1): Float64Array {
  const out = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    const up = Math.round(axis - j * step);
    const down = Math.round(axis + j * step);
    const u = up >= 0 && up < column.length ? column[up] : 0;
    const d = down >= 0 && down < column.length ? column[down] : 0;
    out[j] = (u + d) / 2;
  }
  return out;
}
