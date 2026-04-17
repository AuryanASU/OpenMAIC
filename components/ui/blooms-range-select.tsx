'use client';

import * as React from 'react';
import { BloomsLevelSelect } from '@/components/ui/blooms-level-select';
import {
  BLOOMS_BADGE_COLOR,
  BLOOMS_LABEL,
  BLOOMS_ORDER,
  bloomsRank,
  type BloomsLevel,
  type BloomsRange,
} from '@/lib/types/blooms';
import { cn } from '@/lib/utils';

export interface BloomsRangeSelectProps {
  value?: BloomsRange;
  onChange: (value: BloomsRange) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

const DEFAULT_RANGE: BloomsRange = { min: 'remember', max: 'create' };

/**
 * Compound selector for a Bloom's range (min → max).
 *
 * - Auto-clamps max to >= min.
 * - Renders a mini 6-segment bar below, with segments inside [min, max]
 *   colored using the level palette.
 */
export function BloomsRangeSelect({
  value,
  onChange,
  disabled = false,
  className,
  label,
}: BloomsRangeSelectProps) {
  const current = value ?? DEFAULT_RANGE;

  const handleMinChange = (next: BloomsLevel | undefined) => {
    const min = next ?? current.min;
    // Auto-adjust max if new min is higher than current max
    const max = bloomsRank(min) > bloomsRank(current.max) ? min : current.max;
    onChange({ min, max });
  };

  const handleMaxChange = (next: BloomsLevel | undefined) => {
    const max = next ?? current.max;
    // Auto-adjust min if new max is below current min
    const min = bloomsRank(max) < bloomsRank(current.min) ? max : current.min;
    onChange({ min, max });
  };

  const minRank = bloomsRank(current.min);
  const maxRank = bloomsRank(current.max);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <p className="text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wide">
          {label}
        </p>
      )}
      <div className="flex items-center gap-2">
        <BloomsLevelSelect
          value={current.min}
          onChange={handleMinChange}
          disabled={disabled}
          placeholder="Min"
          className="flex-1"
        />
        <span aria-hidden className="text-muted-foreground text-sm shrink-0">
          →
        </span>
        <BloomsLevelSelect
          value={current.max}
          onChange={handleMaxChange}
          disabled={disabled}
          placeholder="Max"
          className="flex-1"
        />
      </div>
      {/* Range visualization bar */}
      <div
        className="flex items-stretch gap-0.5 h-2 rounded-full overflow-hidden"
        role="presentation"
      >
        {BLOOMS_ORDER.map((level, idx) => {
          const inRange = idx >= minRank && idx <= maxRank;
          const palette = BLOOMS_BADGE_COLOR[level];
          return (
            <div
              key={level}
              className="flex-1 transition-colors"
              style={{
                backgroundColor: inRange ? palette.bg : 'transparent',
                border: `1px solid ${inRange ? palette.border : 'var(--border)'}`,
                opacity: inRange ? 1 : 0.25,
              }}
              title={BLOOMS_LABEL[level]}
            />
          );
        })}
      </div>
    </div>
  );
}
