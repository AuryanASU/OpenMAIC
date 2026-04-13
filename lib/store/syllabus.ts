/**
 * Syllabus Store — Zustand
 *
 * Holds the current syllabus being reviewed/edited before course generation.
 * Persisted to localStorage so it survives a page refresh.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CourseSyllabus, CourseModule } from '@/lib/types/syllabus';
import { nanoid } from 'nanoid';
import { createSelectors } from '@/lib/utils/create-selectors';

interface SyllabusState {
  /** The active syllabus being reviewed / edited */
  syllabus: CourseSyllabus | null;

  /** Whether the syllabus editor is open */
  editorOpen: boolean;

  // ── CRUD ────────────────────────────────────────────────────────────────

  /** Replace the entire syllabus (e.g., after generation or upload) */
  setSyllabus: (syllabus: CourseSyllabus) => void;

  /** Clear the current syllabus */
  clearSyllabus: () => void;

  /** Update top-level scalar fields */
  updateField: <K extends keyof Omit<CourseSyllabus, 'modules' | 'metadata'>>(
    field: K,
    value: CourseSyllabus[K],
  ) => void;

  /** Update a module by its id */
  updateModule: (moduleId: string, updates: Partial<CourseModule>) => void;

  /** Add a new module at the end */
  addModule: (partial?: Partial<CourseModule>) => void;

  /** Remove a module */
  removeModule: (moduleId: string) => void;

  /** Re-order a module (swap with adjacent) */
  moveModule: (moduleId: string, direction: 'up' | 'down') => void;

  // ── Editor UI ────────────────────────────────────────────────────────────

  setEditorOpen: (open: boolean) => void;
}

const useSyllabusStoreBase = create<SyllabusState>()(
  persist(
    (set, get) => ({
      syllabus: null,
      editorOpen: false,

      setSyllabus: (syllabus) =>
        set({
          syllabus: {
            ...syllabus,
            metadata: { ...syllabus.metadata, updatedAt: new Date().toISOString() },
          },
        }),

      clearSyllabus: () => set({ syllabus: null }),

      updateField: (field, value) => {
        const { syllabus } = get();
        if (!syllabus) return;
        set({
          syllabus: {
            ...syllabus,
            [field]: value,
            metadata: {
              ...syllabus.metadata,
              updatedAt: new Date().toISOString(),
              source: 'edited',
            },
          },
        });
      },

      updateModule: (moduleId, updates) => {
        const { syllabus } = get();
        if (!syllabus) return;
        set({
          syllabus: {
            ...syllabus,
            modules: syllabus.modules.map((m) => (m.id === moduleId ? { ...m, ...updates } : m)),
            metadata: {
              ...syllabus.metadata,
              updatedAt: new Date().toISOString(),
              source: 'edited',
            },
          },
        });
      },

      addModule: (partial = {}) => {
        const { syllabus } = get();
        if (!syllabus) return;
        const nextOrder = syllabus.modules.length + 1;
        const newModule: CourseModule = {
          id: nanoid(),
          order: nextOrder,
          title: `Module ${nextOrder}: New Module`,
          description: '',
          topics: [],
          learningObjectives: [],
          ...partial,
        };
        set({
          syllabus: {
            ...syllabus,
            modules: [...syllabus.modules, newModule],
            metadata: {
              ...syllabus.metadata,
              updatedAt: new Date().toISOString(),
              source: 'edited',
            },
          },
        });
      },

      removeModule: (moduleId) => {
        const { syllabus } = get();
        if (!syllabus) return;
        const filtered = syllabus.modules
          .filter((m) => m.id !== moduleId)
          .map((m, i) => ({ ...m, order: i + 1 }));
        set({
          syllabus: {
            ...syllabus,
            modules: filtered,
            metadata: {
              ...syllabus.metadata,
              updatedAt: new Date().toISOString(),
              source: 'edited',
            },
          },
        });
      },

      moveModule: (moduleId, direction) => {
        const { syllabus } = get();
        if (!syllabus) return;
        const modules = [...syllabus.modules];
        const idx = modules.findIndex((m) => m.id === moduleId);
        if (idx < 0) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= modules.length) return;
        [modules[idx], modules[swapIdx]] = [modules[swapIdx], modules[idx]];
        const reordered = modules.map((m, i) => ({ ...m, order: i + 1 }));
        set({
          syllabus: {
            ...syllabus,
            modules: reordered,
            metadata: {
              ...syllabus.metadata,
              updatedAt: new Date().toISOString(),
              source: 'edited',
            },
          },
        });
      },

      setEditorOpen: (open) => set({ editorOpen: open }),
    }),
    {
      name: 'syllabus-store',
      // Only persist the syllabus itself, not UI state
      partialize: (state) => ({ syllabus: state.syllabus }),
    },
  ),
);

export const useSyllabusStore = createSelectors(useSyllabusStoreBase);
