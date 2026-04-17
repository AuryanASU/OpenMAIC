'use client';

import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BLOOMS_BADGE_COLOR,
  BLOOMS_DESCRIPTION,
  BLOOMS_LABEL,
  BLOOMS_VERBS,
  type BloomsLevel,
} from '@/lib/types/blooms';
import { cn } from '@/lib/utils';

export interface BloomsBadgeProps {
  level: BloomsLevel;
  size?: 'sm' | 'md';
  variant?: 'solid' | 'outline' | 'muted';
  className?: string;
  showVerbHint?: boolean;
}

/**
 * Small pill-shaped badge displaying a Bloom's taxonomy level.
 *
 * Colors come from `BLOOMS_BADGE_COLOR` (ASU palette). A hover tooltip
 * surfaces the level description, and optionally a few canonical verbs.
 */
export function BloomsBadge({
  level,
  size = 'sm',
  variant = 'solid',
  className,
  showVerbHint = false,
}: BloomsBadgeProps) {
  const palette = BLOOMS_BADGE_COLOR[level];
  const label = BLOOMS_LABEL[level];
  const description = BLOOMS_DESCRIPTION[level];

  const sizeClasses = size === 'md' ? 'text-xs px-2 py-1' : 'text-[10px] px-1.5 py-0.5';

  let style: React.CSSProperties;
  switch (variant) {
    case 'outline':
      style = {
        backgroundColor: 'transparent',
        color: palette.fg,
        borderColor: palette.border,
      };
      break;
    case 'muted':
      style = {
        backgroundColor: palette.bg,
        color: palette.fg,
        borderColor: 'transparent',
        opacity: 0.85,
      };
      break;
    case 'solid':
    default:
      style = {
        backgroundColor: palette.bg,
        color: palette.fg,
        borderColor: palette.border,
      };
  }

  const verbs = BLOOMS_VERBS[level].slice(0, 4).join(', ');

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium leading-none whitespace-nowrap align-middle',
        sizeClasses,
        className,
      )}
      style={style}
      data-blooms-level={level}
    >
      {label}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-0.5">
          <p className="font-semibold">{label}</p>
          <p className="opacity-80">{description}</p>
          {showVerbHint && <p className="opacity-70 italic">e.g., {verbs}</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
