import type { Dimension, CheckResult } from '../checks/types.js';
import { DIMENSION_WEIGHTS } from './weights.js';

export type DimensionScores = Partial<Record<Dimension, { score: number; checkCount: number }>>;

export function calculateScores(results: CheckResult[]): {
  dimensions: DimensionScores;
  overall: number;
} {
  const byDimension = new Map<Dimension, CheckResult[]>();
  for (const r of results) {
    const arr = byDimension.get(r.dimension) ?? [];
    arr.push(r);
    byDimension.set(r.dimension, arr);
  }

  const dimensions: DimensionScores = {};
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [dim, checks] of byDimension) {
    const avg = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
    dimensions[dim] = { score: Math.round(avg), checkCount: checks.length };

    const weight = DIMENSION_WEIGHTS[dim];
    weightedSum += avg * weight;
    totalWeight += weight;
  }

  // Renormalize if not all dimensions have checks
  const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return { dimensions, overall };
}
