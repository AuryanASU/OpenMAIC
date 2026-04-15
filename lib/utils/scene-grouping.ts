/**
 * Utility for grouping scenes by their parent module.
 * Used by the sidebar to render collapsible module sections.
 */

import type { Scene } from '@/lib/types/stage';

export interface SceneModuleGroup {
  moduleId: string | undefined;
  moduleTitle: string | undefined;
  moduleIndex: number | undefined;
  scenes: Scene[];
}

/**
 * Check whether a moduleId is a special sentinel (course intro/summary)
 * that should not render a module header.
 */
export function isSpecialModule(moduleId: string | undefined): boolean {
  if (!moduleId) return false;
  return moduleId.startsWith('__');
}

/**
 * Group scenes by moduleId, preserving order.
 *
 * - Scenes are sorted by `order` first.
 * - Consecutive scenes sharing the same `moduleId` are grouped together.
 * - If no scenes have a `moduleId`, returns a single group with `moduleId: undefined`.
 * - Groups are sorted by `moduleIndex` (falling back to first scene's `order`).
 */
export function groupScenesByModule(scenes: Scene[]): SceneModuleGroup[] {
  if (scenes.length === 0) return [];

  const sorted = [...scenes].sort((a, b) => a.order - b.order);

  // Fast path: no module metadata → single flat group
  const hasModules = sorted.some((s) => s.moduleId != null);
  if (!hasModules) {
    return [
      {
        moduleId: undefined,
        moduleTitle: undefined,
        moduleIndex: undefined,
        scenes: sorted,
      },
    ];
  }

  // Build groups from consecutive runs of the same moduleId
  const groups: SceneModuleGroup[] = [];
  let current: SceneModuleGroup | null = null;

  for (const scene of sorted) {
    if (!current || current.moduleId !== scene.moduleId) {
      current = {
        moduleId: scene.moduleId,
        moduleTitle: scene.moduleTitle,
        moduleIndex: scene.moduleIndex,
        scenes: [],
      };
      groups.push(current);
    }
    current.scenes.push(scene);
  }

  // Sort groups by moduleIndex, then by first scene order
  groups.sort((a, b) => {
    const ai = a.moduleIndex ?? a.scenes[0]?.order ?? 0;
    const bi = b.moduleIndex ?? b.scenes[0]?.order ?? 0;
    return ai - bi;
  });

  return groups;
}
