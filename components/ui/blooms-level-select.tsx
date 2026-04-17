'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BLOOMS_BADGE_COLOR,
  BLOOMS_LABEL,
  BLOOMS_ORDER,
  BLOOMS_VERBS,
  type BloomsLevel,
} from '@/lib/types/blooms';
import { cn } from '@/lib/utils';

const UNSET_VALUE = '__unset__';

export interface BloomsLevelSelectProps {
  value?: BloomsLevel;
  onChange: (value: BloomsLevel | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  allowUnset?: boolean;
  className?: string;
}

/**
 * Select dropdown for picking a single Bloom's taxonomy level.
 *
 * Each option shows a colored dot, the label, and a short verb hint.
 */
export function BloomsLevelSelect({
  value,
  onChange,
  placeholder = "Select Bloom's level",
  disabled = false,
  allowUnset = false,
  className,
}: BloomsLevelSelectProps) {
  const handleChange = (next: string) => {
    if (next === UNSET_VALUE) {
      onChange(undefined);
      return;
    }
    onChange(next as BloomsLevel);
  };

  return (
    <Select value={value ?? ''} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder}>
          {value ? (
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: BLOOMS_BADGE_COLOR[value].bg }}
              />
              <span>{BLOOMS_LABEL[value]}</span>
            </span>
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowUnset && (
          <SelectItem value={UNSET_VALUE}>
            <span className="text-muted-foreground italic">Unset</span>
          </SelectItem>
        )}
        {BLOOMS_ORDER.map((level) => {
          const palette = BLOOMS_BADGE_COLOR[level];
          const verbs = BLOOMS_VERBS[level].slice(0, 3).join(', ');
          return (
            <SelectItem key={level} value={level}>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-2 rounded-full shrink-0"
                  style={{ backgroundColor: palette.bg }}
                />
                <span className="font-medium">{BLOOMS_LABEL[level]}</span>
                <span className="text-[11px] text-muted-foreground italic truncate">{verbs}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
