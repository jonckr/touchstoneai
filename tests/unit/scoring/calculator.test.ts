import { describe, it, expect } from 'vitest';
import { calculateScores } from '../../../src/scoring/calculator.js';
import type { CheckResult } from '../../../src/checks/types.js';

function makeResult(overrides: Partial<CheckResult> & { checkId: string }): CheckResult {
  return {
    title: overrides.checkId,
    dimension: 'reliability',
    severity: 'pass',
    score: 100,
    message: 'ok',
    durationMs: 10,
    ...overrides,
  };
}

describe('calculateScores', () => {
  it('returns 0 overall for empty results', () => {
    const { overall, dimensions } = calculateScores([]);
    expect(overall).toBe(0);
    expect(Object.keys(dimensions)).toHaveLength(0);
  });

  it('calculates single dimension correctly', () => {
    const results: CheckResult[] = [
      makeResult({ checkId: 'r.1', dimension: 'reliability', score: 80 }),
      makeResult({ checkId: 'r.2', dimension: 'reliability', score: 60 }),
    ];
    const { overall, dimensions } = calculateScores(results);
    expect(dimensions.reliability?.score).toBe(70);
    expect(dimensions.reliability?.checkCount).toBe(2);
    // Single dimension renormalized to 100% weight
    expect(overall).toBe(70);
  });

  it('applies weights across multiple dimensions', () => {
    const results: CheckResult[] = [
      makeResult({ checkId: 'r.1', dimension: 'reliability', score: 100 }),
      makeResult({ checkId: 'p.1', dimension: 'performance', score: 50 }),
    ];
    const { overall, dimensions } = calculateScores(results);
    expect(dimensions.reliability?.score).toBe(100);
    expect(dimensions.performance?.score).toBe(50);
    // reliability weight 0.25, performance weight 0.20
    // renormalized: 0.25/(0.25+0.20)=0.556, 0.20/(0.25+0.20)=0.444
    // overall = 100*0.556 + 50*0.444 = 55.6 + 22.2 = 77.8 -> 78
    expect(overall).toBe(78);
  });
});
