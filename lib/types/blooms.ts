/**
 * Bloom's Taxonomy — Canonical types and helpers
 *
 * Based on the Revised Bloom's Taxonomy (Anderson & Krathwohl, 2001).
 * Used throughout OpenMAIC to tag learning outcomes, module targets,
 * scene cognitive levels, and assessment items for constructive alignment
 * (Biggs & Tang) and Quality Matters (QM) Standards 2.2 & 3.1 compliance.
 */

export type BloomsLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

export interface BloomsRange {
  min: BloomsLevel;
  max: BloomsLevel;
}

/** Levels in ascending cognitive complexity. */
export const BLOOMS_ORDER: readonly BloomsLevel[] = [
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create',
] as const;

/**
 * Canonical action verbs per Bloom's level.
 * Source: Anderson & Krathwohl (2001), Wilson (2016),
 * plus widely-used instructional design references.
 */
export const BLOOMS_VERBS: Record<BloomsLevel, string[]> = {
  remember: [
    'define',
    'list',
    'recall',
    'identify',
    'describe',
    'name',
    'state',
    'recognize',
    'label',
    'match',
    'select',
    'reproduce',
  ],
  understand: [
    'explain',
    'summarize',
    'classify',
    'compare',
    'interpret',
    'paraphrase',
    'discuss',
    'distinguish',
    'infer',
    'exemplify',
    'translate',
    'clarify',
  ],
  apply: [
    'apply',
    'demonstrate',
    'solve',
    'use',
    'implement',
    'calculate',
    'illustrate',
    'execute',
    'employ',
    'practice',
    'operate',
    'modify',
  ],
  analyze: [
    'analyze',
    'differentiate',
    'examine',
    'investigate',
    'contrast',
    'deconstruct',
    'organize',
    'attribute',
    'diagnose',
    'categorize',
    'correlate',
    'prioritize',
  ],
  evaluate: [
    'evaluate',
    'critique',
    'judge',
    'justify',
    'defend',
    'appraise',
    'argue',
    'assess',
    'recommend',
    'validate',
    'rank',
    'rate',
  ],
  create: [
    'design',
    'construct',
    'develop',
    'compose',
    'generate',
    'produce',
    'formulate',
    'plan',
    'invent',
    'propose',
    'synthesize',
    'assemble',
  ],
};

/** Human-readable display labels for UI. */
export const BLOOMS_LABEL: Record<BloomsLevel, string> = {
  remember: 'Remember',
  understand: 'Understand',
  apply: 'Apply',
  analyze: 'Analyze',
  evaluate: 'Evaluate',
  create: 'Create',
};

/** One-line descriptions for tooltip/help UI. */
export const BLOOMS_DESCRIPTION: Record<BloomsLevel, string> = {
  remember: 'Retrieve relevant knowledge from long-term memory',
  understand: 'Construct meaning from instructional messages',
  apply: 'Carry out or use a procedure in a given situation',
  analyze: 'Break material into parts and detect relationships',
  evaluate: 'Make judgments based on criteria and standards',
  create: 'Put elements together to form a novel coherent whole',
};

/**
 * Badge colors per level (ASU palette: maroon/gold tones that scale from
 * warm-neutral at lower levels to bolder accents at higher levels).
 */
export const BLOOMS_BADGE_COLOR: Record<BloomsLevel, { bg: string; fg: string; border: string }> = {
  remember: { bg: '#FEF3E8', fg: '#8A5A1A', border: '#E8C89E' },
  understand: { bg: '#FDE9D2', fg: '#7A4A13', border: '#E0B172' },
  apply: { bg: '#FFE4A0', fg: '#6B3F08', border: '#D49A3A' },
  analyze: { bg: '#F5C066', fg: '#5C3400', border: '#C08528' },
  evaluate: { bg: '#D89B52', fg: '#3D1F00', border: '#9E6A1B' },
  create: { bg: '#8C1D40', fg: '#FFFFFF', border: '#5A0E26' },
};

/** Course depth → recommended Bloom's range. */
export const DEPTH_TO_BLOOMS_RANGE: Record<
  'introductory' | 'intermediate' | 'advanced',
  BloomsRange
> = {
  introductory: { min: 'remember', max: 'apply' },
  intermediate: { min: 'apply', max: 'analyze' },
  advanced: { min: 'analyze', max: 'create' },
};

/** Get numeric rank of a Bloom's level (0 = remember … 5 = create). */
export function bloomsRank(level: BloomsLevel): number {
  return BLOOMS_ORDER.indexOf(level);
}

/** Check whether a level falls within a range (inclusive). */
export function inRange(level: BloomsLevel, range: BloomsRange): boolean {
  const r = bloomsRank(level);
  return r >= bloomsRank(range.min) && r <= bloomsRank(range.max);
}

/** Clamp a level into a range. */
export function clampToRange(level: BloomsLevel, range: BloomsRange): BloomsLevel {
  const r = bloomsRank(level);
  const min = bloomsRank(range.min);
  const max = bloomsRank(range.max);
  if (r < min) return range.min;
  if (r > max) return range.max;
  return level;
}

/** Safe parser for AI-supplied Bloom's levels (lowercases, validates). */
export function coerceBloomsLevel(value: unknown): BloomsLevel | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase().trim();
  if ((BLOOMS_ORDER as readonly string[]).includes(normalized)) {
    return normalized as BloomsLevel;
  }
  return undefined;
}

/** Safe parser for AI-supplied Bloom's ranges. */
export function coerceBloomsRange(value: unknown): BloomsRange | undefined {
  if (typeof value !== 'object' || value == null) return undefined;
  const obj = value as Record<string, unknown>;
  const min = coerceBloomsLevel(obj.min);
  const max = coerceBloomsLevel(obj.max);
  if (!min || !max) return undefined;
  // Ensure min <= max; swap if user/AI provided them backwards
  if (bloomsRank(min) > bloomsRank(max)) return { min: max, max: min };
  return { min, max };
}

/** Validate that a verb belongs to the canonical list for a given level. */
export function isValidBloomsVerb(verb: string, level: BloomsLevel): boolean {
  const v = verb.toLowerCase().trim();
  return BLOOMS_VERBS[level].some((canonical) => canonical === v || v.startsWith(canonical));
}

/**
 * Infer a Bloom's level from a verb by matching against canonical verb tables.
 * Returns the lowest matching level (conservative) or undefined if no match.
 */
export function inferBloomsLevelFromVerb(verb: string): BloomsLevel | undefined {
  const v = verb.toLowerCase().trim();
  for (const level of BLOOMS_ORDER) {
    if (BLOOMS_VERBS[level].some((canonical) => canonical === v || v.startsWith(canonical))) {
      return level;
    }
  }
  return undefined;
}

/**
 * Compute the target Bloom's level for a module based on its position
 * in the course and the course's overall target range.
 *
 * Scaffolding pattern:
 *   - First 25% of modules → lower third of course range
 *   - Middle 50% of modules → middle of course range
 *   - Final 25% of modules → upper third of course range
 */
export function getModuleBloomsLevel(
  moduleIndex: number,
  totalModules: number,
  courseRange?: BloomsRange,
): BloomsLevel {
  const range = courseRange ?? { min: 'remember', max: 'create' };
  const minRank = bloomsRank(range.min);
  const maxRank = bloomsRank(range.max);
  const span = maxRank - minRank;

  if (span <= 0) return range.min;
  if (totalModules <= 1) {
    // Single-module courses target the midpoint of the course range
    return BLOOMS_ORDER[Math.round(minRank + span / 2)];
  }

  const position = moduleIndex / (totalModules - 1); // 0..1

  // Divide the range into thirds; map position into these thirds.
  // Early modules (position < 0.25) → lower third
  // Middle modules (0.25-0.75) → middle third
  // Final modules (> 0.75) → upper third
  let offset: number;
  if (position < 0.25) {
    offset = 0;
  } else if (position >= 0.75) {
    offset = span;
  } else {
    // Linear interpolation across the middle band
    offset = Math.round(((position - 0.25) / 0.5) * span);
  }

  return BLOOMS_ORDER[Math.min(maxRank, Math.max(minRank, minRank + offset))];
}

/**
 * Compute a narrower Bloom's range for a single module.
 * The range is centered on the module's target level with ±1 level on each
 * side, clamped to the course range.
 */
export function getModuleBloomsRange(
  moduleIndex: number,
  totalModules: number,
  courseRange?: BloomsRange,
): BloomsRange {
  const target = getModuleBloomsLevel(moduleIndex, totalModules, courseRange);
  const range = courseRange ?? { min: 'remember', max: 'create' };
  const targetRank = bloomsRank(target);
  const minRank = Math.max(bloomsRank(range.min), targetRank - 1);
  const maxRank = Math.min(bloomsRank(range.max), targetRank + 1);
  return {
    min: BLOOMS_ORDER[minRank],
    max: BLOOMS_ORDER[maxRank],
  };
}

/**
 * Split a module's Bloom's range into formative vs comprehensive quiz ranges.
 * Formative quiz (mid-module) tests the lower half.
 * Comprehensive quiz (end-of-module) tests the full range.
 */
export function splitQuizRanges(moduleRange: BloomsRange): {
  formative: BloomsRange;
  comprehensive: BloomsRange;
} {
  const minRank = bloomsRank(moduleRange.min);
  const maxRank = bloomsRank(moduleRange.max);
  const midRank = Math.floor((minRank + maxRank) / 2);
  return {
    formative: {
      min: moduleRange.min,
      max: BLOOMS_ORDER[midRank],
    },
    comprehensive: moduleRange,
  };
}
