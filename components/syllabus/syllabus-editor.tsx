'use client';

/**
 * SyllabusEditor
 *
 * Full-screen overlay for reviewing, editing, and AI-refining a CourseSyllabus
 * before kicking off course generation.
 *
 * Features:
 * - Inline editing of all syllabus fields
 * - Collapsible module list with per-module editing
 * - AI chat sidebar — "add a module about X", "make objectives more specific", etc.
 * - "Generate Course" CTA to proceed to the generation pipeline
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  BookOpen,
  Target,
  LayoutList,
  Sparkles,
  GraduationCap,
  Edit3,
  Check,
  MoveUp,
  MoveDown,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BloomsBadge } from '@/components/ui/blooms-badge';
import { BloomsLevelSelect } from '@/components/ui/blooms-level-select';
import { BloomsRangeSelect } from '@/components/ui/blooms-range-select';
import { cn } from '@/lib/utils';
import { useSyllabusStore } from '@/lib/store/syllabus';
import type { CourseSyllabus, CourseModule } from '@/lib/types/syllabus';
import type { BloomsLevel } from '@/lib/types/blooms';
import { jsonrepair } from 'jsonrepair';

// ── Types ──────────────────────────────────────────────────────────────────

interface SyllabusEditorProps {
  onGenerate: (syllabus: CourseSyllabus) => void;
  onClose: () => void;
}

interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function EditableText({
  value,
  onChange,
  multiline = false,
  placeholder = 'Click to edit…',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const commit = () => {
    onChange(draft.trim() || value);
    setEditing(false);
  };

  if (editing) {
    const shared = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!multiline && e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Escape') {
          setDraft(value);
          setEditing(false);
        }
      },
      className: cn(
        'w-full bg-[#8C1D40]/5 dark:bg-[#8C1D40]/10 border border-[#8C1D40]/30 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#8C1D40]/40 resize-none',
        className,
      ),
    };

    if (multiline) {
      return (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          {...shared}
          rows={Math.max(3, draft.split('\n').length)}
        />
      );
    }
    return <input ref={ref as React.Ref<HTMLInputElement>} {...shared} />;
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      onKeyDown={(e) => e.key === 'Enter' && (setDraft(value), setEditing(true))}
      className={cn(
        'group inline-flex items-start gap-1 cursor-text hover:bg-[#8C1D40]/5 rounded px-1 -mx-1 transition-colors',
        className,
      )}
    >
      <span>{value || <span className="text-muted-foreground/40 italic">{placeholder}</span>}</span>
      <Edit3 className="size-3 opacity-0 group-hover:opacity-40 mt-0.5 shrink-0 text-[#8C1D40]" />
    </span>
  );
}

function EditableList({
  items,
  onChange,
  placeholder = 'Add item…',
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [newItem, setNewItem] = useState('');

  const update = (idx: number, val: string) => {
    const next = [...items];
    next[idx] = val;
    onChange(next);
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const add = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNewItem('');
  };

  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 group">
          <span className="mt-1.5 size-1.5 rounded-full bg-[#8C1D40]/40 dark:bg-[#C75B7A]/40 shrink-0" />
          <EditableText
            value={item}
            onChange={(v) => update(idx, v)}
            className="flex-1 text-sm leading-relaxed"
          />
          <button
            onClick={() => remove(idx)}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-destructive transition-opacity mt-0.5"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent border-b border-dashed border-border/50 focus:border-[#8C1D40]/40 focus:outline-none placeholder:text-muted-foreground/30 py-0.5"
        />
        <button
          onClick={add}
          disabled={!newItem.trim()}
          className="text-[#8C1D40] dark:text-[#C75B7A] disabled:opacity-30 hover:opacity-70 transition-opacity"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── Editable list with Bloom's level per item ──────────────────────────────

function EditableBloomsList({
  items,
  blooms,
  onChangeItems,
  onChangeBlooms,
  placeholder = 'Add item…',
}: {
  items: string[];
  blooms: (BloomsLevel | undefined)[];
  onChangeItems: (items: string[]) => void;
  onChangeBlooms: (blooms: (BloomsLevel | undefined)[]) => void;
  placeholder?: string;
}) {
  const [newItem, setNewItem] = useState('');

  // Ensure blooms array is same length as items for indexing
  const paddedBlooms = [...blooms];
  while (paddedBlooms.length < items.length) paddedBlooms.push(undefined);

  const update = (idx: number, val: string) => {
    const next = [...items];
    next[idx] = val;
    onChangeItems(next);
  };

  const remove = (idx: number) => {
    onChangeItems(items.filter((_, i) => i !== idx));
    onChangeBlooms(paddedBlooms.filter((_, i) => i !== idx));
  };

  const updateBloom = (idx: number, level: BloomsLevel | undefined) => {
    const next = [...paddedBlooms];
    next[idx] = level;
    onChangeBlooms(next);
  };

  const add = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChangeItems([...items, trimmed]);
    onChangeBlooms([...paddedBlooms, undefined]);
    setNewItem('');
  };

  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 group">
          <span className="mt-1.5 size-1.5 rounded-full bg-[#8C1D40]/40 dark:bg-[#C75B7A]/40 shrink-0" />
          <EditableText
            value={item}
            onChange={(v) => update(idx, v)}
            className="flex-1 text-sm leading-relaxed"
          />
          <div className="shrink-0 w-40">
            <BloomsLevelSelect
              value={paddedBlooms[idx]}
              onChange={(level) => updateBloom(idx, level)}
              allowUnset
              placeholder="Bloom's…"
              className="h-7 text-xs"
            />
          </div>
          <button
            onClick={() => remove(idx)}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-destructive transition-opacity mt-0.5"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent border-b border-dashed border-border/50 focus:border-[#8C1D40]/40 focus:outline-none placeholder:text-muted-foreground/30 py-0.5"
        />
        <button
          onClick={add}
          disabled={!newItem.trim()}
          className="text-[#8C1D40] dark:text-[#C75B7A] disabled:opacity-30 hover:opacity-70 transition-opacity"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── Module card ────────────────────────────────────────────────────────────

function ModuleCard({
  module,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMove,
}: {
  module: CourseModule;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updates: Partial<CourseModule>) => void;
  onRemove: () => void;
  onMove: (dir: 'up' | 'down') => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const sceneTypeBadge: Record<string, string> = {
    slide: 'Lecture',
    quiz: 'Quiz',
    interactive: 'Interactive',
    pbl: 'Project',
  };
  const sceneTypeColor: Record<string, string> = {
    slide: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    quiz: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    interactive: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    pbl: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-white/50 dark:bg-slate-900/30 hover:border-[#8C1D40]/20 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="size-7 rounded-lg bg-[#8C1D40]/10 dark:bg-[#8C1D40]/20 text-[#8C1D40] dark:text-[#C75B7A] flex items-center justify-center text-xs font-bold shrink-0">
          {module.order}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <EditableText
            value={module.title}
            onChange={(v) => onUpdate({ title: v })}
            className="font-medium text-sm"
          />
          {module.bloomsLevel && <BloomsBadge level={module.bloomsLevel} size="sm" showVerbHint />}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {module.sceneTypes?.slice(0, 2).map((t) => (
            <span
              key={t}
              className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', sceneTypeColor[t])}
            >
              {sceneTypeBadge[t] ?? t}
            </span>
          ))}
          <button
            onClick={() => onMove('up')}
            disabled={isFirst}
            className="p-1 text-muted-foreground/50 hover:text-foreground disabled:opacity-20 transition-colors"
          >
            <MoveUp className="size-3.5" />
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={isLast}
            className="p-1 text-muted-foreground/50 hover:text-foreground disabled:opacity-20 transition-colors"
          >
            <MoveDown className="size-3.5" />
          </button>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1 text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-muted-foreground/30 hover:text-destructive transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide mb-1.5">
                  Description
                </p>
                <EditableText
                  value={module.description}
                  onChange={(v) => onUpdate({ description: v })}
                  multiline
                  placeholder="Describe what this module covers…"
                  className="text-sm text-muted-foreground leading-relaxed"
                />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide mb-1.5">
                  Topics
                </p>
                <EditableList
                  items={module.topics}
                  onChange={(v) => onUpdate({ topics: v })}
                  placeholder="Add topic…"
                />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide mb-1.5">
                  Module Bloom's Target
                </p>
                <BloomsLevelSelect
                  value={module.bloomsLevel}
                  onChange={(level) => onUpdate({ bloomsLevel: level })}
                  allowUnset
                  className="max-w-xs"
                />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide mb-1.5">
                  Learning Objectives
                </p>
                <EditableBloomsList
                  items={module.learningObjectives}
                  blooms={module.learningObjectivesBloom ?? []}
                  onChangeItems={(v) => onUpdate({ learningObjectives: v })}
                  onChangeBlooms={(v) =>
                    onUpdate({
                      learningObjectivesBloom: v as BloomsLevel[],
                    })
                  }
                  placeholder="Add learning objective…"
                />
              </div>
              {/* Scene type toggles */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide mb-1.5">
                  Scene Types
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(['slide', 'quiz', 'interactive', 'pbl'] as const).map((t) => {
                    const active = module.sceneTypes?.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          const current = module.sceneTypes ?? [];
                          const next = active ? current.filter((x) => x !== t) : [...current, t];
                          onUpdate({ sceneTypes: next });
                        }}
                        className={cn(
                          'text-xs px-2 py-1 rounded-md border transition-all',
                          active
                            ? sceneTypeColor[t] + ' border-transparent'
                            : 'border-border/50 text-muted-foreground/60 hover:border-border',
                        )}
                      >
                        {sceneTypeBadge[t]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="size-6 rounded-md bg-[#8C1D40]/10 dark:bg-[#8C1D40]/20 text-[#8C1D40] dark:text-[#C75B7A] flex items-center justify-center">
        <Icon className="size-3.5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground/80">{title}</h3>
    </div>
  );
}

// ── AI Chat panel ──────────────────────────────────────────────────────────

function AIChatPanel({
  syllabus,
  onSyllabusUpdate,
}: {
  syllabus: CourseSyllabus;
  onSyllabusUpdate: (s: CourseSyllabus) => void;
}) {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content:
        "I'm here to help refine your syllabus. Try asking me to:\n• Add a module about a specific topic\n• Make the learning objectives more specific\n• Adjust the assessment weights\n• Expand or shorten the course duration",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const newMessages: AIChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Build a prompt that asks the AI to apply edits and return updated JSON
      const systemPrompt = `You are an expert instructional designer helping refine a university course syllabus. The user will ask you to modify the syllabus. Apply their requested changes and return the COMPLETE updated syllabus as valid JSON matching the original schema. Return ONLY the JSON, no explanation.`;

      const userPrompt = `Current syllabus JSON:\n${JSON.stringify(syllabus, null, 2)}\n\nUser request: ${text}\n\nReturn the complete updated syllabus JSON.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userPrompt }],
          storeState: { stage: null, scenes: [], currentSceneId: null, mode: 'playback' },
          config: { agentIds: ['default'], sessionType: 'syllabus-edit' },
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      // Read SSE stream for the text response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          // Parse SSE lines
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as { type?: string; text?: string };
                if (data.type === 'text-delta' && data.text) fullText += data.text;
              } catch {
                // skip malformed lines
              }
            }
          }
        }
      }

      // Try to extract and apply the updated syllabus JSON
      let assistantReply = "Done! I've applied your changes to the syllabus.";
      try {
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const updated = JSON.parse(jsonrepair(jsonMatch[0])) as Partial<CourseSyllabus>;
          if (updated.title && updated.modules) {
            const merged: CourseSyllabus = {
              ...syllabus,
              ...updated,
              id: syllabus.id,
              metadata: {
                ...syllabus.metadata,
                updatedAt: new Date().toISOString(),
                source: 'edited',
              },
            };
            onSyllabusUpdate(merged);
            assistantReply = "Done! I've updated the syllabus based on your request.";
          }
        }
      } catch {
        assistantReply =
          fullText ||
          "I've reviewed your request but couldn't parse the update. Please try rephrasing.";
      }

      setMessages([...newMessages, { role: 'assistant', content: assistantReply }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `Sorry, something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
        <div className="size-6 rounded-md bg-[#8C1D40]/10 dark:bg-[#8C1D40]/20 text-[#8C1D40] dark:text-[#C75B7A] flex items-center justify-center">
          <Sparkles className="size-3.5" />
        </div>
        <p className="text-sm font-semibold">AI Refinement</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-[#8C1D40] text-white rounded-br-sm'
                  : 'bg-muted/60 dark:bg-slate-800/60 text-foreground/80 rounded-bl-sm',
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted/60 dark:bg-slate-800/60 px-3 py-2 rounded-xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="size-1.5 rounded-full bg-[#8C1D40]/60 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/40">
        <div className="flex items-end gap-2 bg-muted/40 dark:bg-slate-800/40 rounded-xl border border-border/50 px-3 py-2 focus-within:border-[#8C1D40]/30 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask AI to refine the syllabus…"
            rows={2}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground/40 leading-relaxed"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className={cn(
              'shrink-0 size-7 rounded-lg flex items-center justify-center transition-all',
              input.trim() && !loading
                ? 'bg-[#8C1D40] text-white hover:opacity-90'
                : 'bg-muted text-muted-foreground/30 cursor-not-allowed',
            )}
          >
            <ArrowUp className="size-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 mt-1.5 text-right">⌘+Enter to send</p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function SyllabusEditor({ onGenerate, onClose }: SyllabusEditorProps) {
  const syllabus = useSyllabusStore((s) => s.syllabus);
  const setSyllabus = useSyllabusStore((s) => s.setSyllabus);
  const updateField = useSyllabusStore((s) => s.updateField);
  const updateModule = useSyllabusStore((s) => s.updateModule);
  const addModule = useSyllabusStore((s) => s.addModule);
  const removeModule = useSyllabusStore((s) => s.removeModule);
  const moveModule = useSyllabusStore((s) => s.moveModule);

  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'assessment'>('overview');
  const [chatOpen, setChatOpen] = useState(false);

  if (!syllabus) return null;

  const sourceLabel: Record<string, string> = {
    generated: 'AI Generated',
    uploaded: 'Uploaded PDF',
    edited: 'Edited',
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 dark:bg-stone-950">
      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-border/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-[#8C1D40]/10 dark:bg-[#8C1D40]/20 text-[#8C1D40] dark:text-[#C75B7A] flex items-center justify-center">
            <BookOpen className="size-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Syllabus Review</h1>
            <p className="text-[11px] text-muted-foreground/60 leading-tight">
              {sourceLabel[syllabus.metadata.source] ?? 'Syllabus'} &middot;{' '}
              {syllabus.modules.length} modules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setChatOpen((o) => !o)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              chatOpen
                ? 'bg-[#8C1D40] text-white'
                : 'border border-border/60 hover:border-[#8C1D40]/40 text-muted-foreground hover:text-foreground',
            )}
          >
            <Sparkles className="size-3.5" />
            AI Refine
          </button>

          <button
            onClick={() => onGenerate(syllabus)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#8C1D40] text-white text-xs font-semibold hover:opacity-90 shadow-sm transition-opacity"
          >
            <GraduationCap className="size-3.5" />
            Generate Course
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Main editor ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Tab nav */}
          <div className="sticky top-0 z-10 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-sm border-b border-border/30 px-6">
            <div className="flex gap-1 -mb-px">
              {(
                [
                  { id: 'overview', icon: BookOpen, label: 'Overview' },
                  {
                    id: 'modules',
                    icon: LayoutList,
                    label: `Modules (${syllabus.modules.length})`,
                  },
                  { id: 'assessment', icon: BarChart3, label: 'Assessment' },
                ] as const
              ).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors',
                    activeTab === id
                      ? 'border-[#8C1D40] text-[#8C1D40] dark:text-[#C75B7A]'
                      : 'border-transparent text-muted-foreground/60 hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-3xl mx-auto px-6 py-6 space-y-8">
            {/* ── Overview tab ── */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Course header */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#8C1D40]/5 to-[#FFC627]/5 border border-[#8C1D40]/10">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <EditableText
                        value={syllabus.title}
                        onChange={(v) => updateField('title', v)}
                        className="text-xl font-bold text-foreground"
                        placeholder="Course title…"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground/60">
                      {syllabus.courseCode && (
                        <EditableText
                          value={syllabus.courseCode}
                          onChange={(v) => updateField('courseCode', v)}
                          className="font-mono font-medium"
                        />
                      )}
                      {syllabus.credits != null && <span>{syllabus.credits} credits</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground/70">
                    {syllabus.estimatedDuration && (
                      <span className="flex items-center gap-1">
                        <span className="opacity-50">⏱</span>
                        <EditableText
                          value={syllabus.estimatedDuration}
                          onChange={(v) => updateField('estimatedDuration', v)}
                        />
                      </span>
                    )}
                    {syllabus.targetAudience && (
                      <span className="flex items-center gap-1">
                        <span className="opacity-50">👥</span>
                        <EditableText
                          value={syllabus.targetAudience}
                          onChange={(v) => updateField('targetAudience', v)}
                        />
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <SectionHeader icon={BookOpen} title="Course Description" />
                  <div className="text-sm text-muted-foreground/80 leading-relaxed">
                    <EditableText
                      value={syllabus.description}
                      onChange={(v) => updateField('description', v)}
                      multiline
                      placeholder="Course description…"
                    />
                  </div>
                </div>

                {/* Prerequisites */}
                {(syllabus.prerequisites?.length ?? 0) > 0 && (
                  <div>
                    <SectionHeader icon={Check} title="Prerequisites" />
                    <EditableList
                      items={syllabus.prerequisites ?? []}
                      onChange={(v) => updateField('prerequisites', v)}
                      placeholder="Add prerequisite…"
                    />
                  </div>
                )}

                {/* Course Bloom's Range */}
                <div>
                  <SectionHeader icon={BarChart3} title="Course Bloom's Range" />
                  <BloomsRangeSelect
                    label="Target cognitive depth across the course"
                    value={syllabus.bloomsRange}
                    onChange={(range) => updateField('bloomsRange', range)}
                  />
                </div>

                {/* Learning Outcomes */}
                <div>
                  <SectionHeader icon={GraduationCap} title="Learning Outcomes" />
                  <EditableBloomsList
                    items={syllabus.learningOutcomes}
                    blooms={syllabus.learningOutcomesBloom ?? []}
                    onChangeItems={(v) => updateField('learningOutcomes', v)}
                    onChangeBlooms={(v) => updateField('learningOutcomesBloom', v as BloomsLevel[])}
                    placeholder="Add learning outcome…"
                  />
                </div>

                {/* Learning Objectives */}
                <div>
                  <SectionHeader icon={Target} title="Learning Objectives" />
                  <EditableBloomsList
                    items={syllabus.learningObjectives}
                    blooms={syllabus.learningObjectivesBloom ?? []}
                    onChangeItems={(v) => updateField('learningObjectives', v)}
                    onChangeBlooms={(v) =>
                      updateField('learningObjectivesBloom', v as BloomsLevel[])
                    }
                    placeholder="Add learning objective…"
                  />
                </div>
              </motion.div>
            )}

            {/* ── Modules tab ── */}
            {activeTab === 'modules' && (
              <motion.div
                key="modules"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {syllabus.modules.map((mod, idx) => (
                  <ModuleCard
                    key={mod.id}
                    module={mod}
                    isFirst={idx === 0}
                    isLast={idx === syllabus.modules.length - 1}
                    onUpdate={(updates) => updateModule(mod.id, updates)}
                    onRemove={() => removeModule(mod.id)}
                    onMove={(dir) => moveModule(mod.id, dir)}
                  />
                ))}

                <button
                  onClick={() => addModule()}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-border/50 hover:border-[#8C1D40]/40 text-muted-foreground/50 hover:text-[#8C1D40] dark:hover:text-[#C75B7A] flex items-center justify-center gap-2 text-sm transition-all"
                >
                  <Plus className="size-4" />
                  Add Module
                </button>
              </motion.div>
            )}

            {/* ── Assessment tab ── */}
            {activeTab === 'assessment' && (
              <motion.div
                key="assessment"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <SectionHeader icon={BarChart3} title="Assessment Strategy" />
                {syllabus.assessmentStrategy?.components.length ? (
                  <div className="space-y-3">
                    {syllabus.assessmentStrategy.components.map((comp, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-white/50 dark:bg-slate-900/30"
                      >
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-[#FFC627]/20 flex flex-col items-center justify-center">
                          <span className="text-sm font-bold text-[#8C1D40] dark:text-[#C75B7A]">
                            {comp.weight}%
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{comp.name}</p>
                            {comp.bloomsLevel && <BloomsBadge level={comp.bloomsLevel} size="sm" />}
                          </div>
                          <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">
                            {comp.description}
                          </p>
                          <div className="mt-2 max-w-xs">
                            <BloomsLevelSelect
                              value={comp.bloomsLevel}
                              onChange={(level) => {
                                const strategy = syllabus.assessmentStrategy;
                                if (!strategy) return;
                                const nextComponents = strategy.components.map((c, i) =>
                                  i === idx ? { ...c, bloomsLevel: level } : c,
                                );
                                updateField('assessmentStrategy', {
                                  ...strategy,
                                  components: nextComponents,
                                });
                              }}
                              allowUnset
                              placeholder="Bloom's level…"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground/40 text-right">
                      Total:{' '}
                      {syllabus.assessmentStrategy.components.reduce((s, c) => s + c.weight, 0)}%
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/50 italic">
                    No assessment strategy defined. Ask AI to add one.
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* ── AI Chat sidebar ── */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="shrink-0 border-l border-border/40 bg-white/80 dark:bg-slate-900/80 overflow-hidden"
            >
              <AIChatPanel syllabus={syllabus} onSyllabusUpdate={setSyllabus} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
