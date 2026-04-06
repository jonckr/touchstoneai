import type { Dimension } from '../checks/types.js';

export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  reliability: 0.25,
  performance: 0.2,
  security: 0.2,
  documentation: 0.2,
  standards: 0.15,
};
