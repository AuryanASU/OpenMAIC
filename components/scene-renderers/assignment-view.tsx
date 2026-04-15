'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  ChevronRight,
  Loader2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ClipboardList,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/hooks/use-i18n';
import { createLogger } from '@/lib/logger';
import { useDraftCache } from '@/lib/hooks/use-draft-cache';
import { SpeechButton } from '@/components/audio/speech-button';

import type { AssignmentContent, Rubric, RubricCriterion } from '@/lib/types/stage';

const log = createLogger('AssignmentView');

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = 'instructions' | 'writing' | 'grading' | 'review';

interface CriterionResult {
  criterionId: string;
  criterionName: string;
  levelAchieved: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface GradeResult {
  totalScore: number;
  maxScore: number;
  criterionResults: CriterionResult[];
  overallFeedback: string;
}

interface AssignmentViewProps {
  readonly content: AssignmentContent;
  readonly sceneId: string;
  readonly mode: 'autonomous' | 'playback';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Call /api/grade-assignment for AI grading. */
async function gradeAssignment(
  submission: string,
  rubric: Rubric,
  aiGradingPrompt: string,
  language: string,
): Promise<GradeResult> {
  try {
    const res = await fetch('/api/grade-assignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission,
        rubric,
        aiGradingPrompt,
        language,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as GradeResult & { success?: boolean };
    return {
      totalScore: data.totalScore,
      maxScore: data.maxScore,
      criterionResults: data.criterionResults,
      overallFeedback: data.overallFeedback,
    };
  } catch (err) {
    log.error('[assignment-view] AI grading failed:', err);
    // Fallback: give 50% on each criterion
    const fallbackResults: CriterionResult[] = rubric.criteria.map((c) => {
      const maxPts = Math.round((c.weight / 100) * rubric.totalPoints);
      return {
        criterionId: c.id,
        criterionName: c.name,
        levelAchieved: c.levels[Math.floor(c.levels.length / 2)]?.label ?? 'N/A',
        score: Math.round(maxPts * 0.5),
        maxScore: maxPts,
        feedback:
          language === 'zh-CN'
            ? '评分服务暂时不可用，已给予基础分。'
            : 'Grading service unavailable. Base score given.',
      };
    });
    return {
      totalScore: fallbackResults.reduce((s, r) => s + r.score, 0),
      maxScore: rubric.totalPoints,
      criterionResults: fallbackResults,
      overallFeedback:
        language === 'zh-CN'
          ? '评分服务暂时不可用，请稍后再试。'
          : 'Grading service is temporarily unavailable. Please try again later.',
    };
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function AssignmentCover({
  content,
  onStart,
}: {
  content: AssignmentContent;
  onStart: () => void;
}) {
  const { t } = useI18n();
  const { rubric } = content;

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      {/* Hero section */}
      <div className="flex flex-col items-center justify-center gap-4 relative py-8 px-6 shrink-0">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
          <FileText className="w-52 h-52 text-[#8C1D40]" />
        </div>
        <div className="absolute bottom-0 left-0 p-6 opacity-[0.02]">
          <ClipboardList className="w-40 h-40 text-[#8C1D40] rotate-12" />
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-16 h-16 bg-gradient-to-br from-[#8C1D40]/10 to-[#8C1D40]/5 dark:from-[#C75B7A]/20 dark:to-[#C75B7A]/10 rounded-2xl flex items-center justify-center shadow-lg shadow-[#8C1D40]/10 dark:shadow-[#C75B7A]/30 ring-1 ring-[#8C1D40]/15 dark:ring-[#C75B7A]/50"
        >
          <FileText className="w-8 h-8 text-[#8C1D40]" />
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center z-10"
        >
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{content.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('assignment.subtitle')}
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-5 text-sm z-10"
        >
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <div className="w-7 h-7 rounded-lg bg-[#8C1D40]/10 dark:bg-[#C75B7A]/30 flex items-center justify-center">
              <ClipboardList className="w-3.5 h-3.5 text-[#8C1D40]" />
            </div>
            <span>
              {rubric.criteria.length} {t('assignment.criteriaCount')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <div className="w-7 h-7 rounded-lg bg-[#8C1D40]/10 dark:bg-[#C75B7A]/30 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[#8C1D40]" />
            </div>
            <span>
              {rubric.totalPoints} {t('assignment.pointsSuffix')}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Instructions */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="px-6 pb-4"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            {t('assignment.instructions')}
          </h4>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {content.instructions}
          </div>
        </div>
      </motion.div>

      {/* Rubric table */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="px-6 pb-4"
      >
        <RubricTable rubric={rubric} />
      </motion.div>

      {/* Submission guidelines */}
      {content.submissionGuidelines && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="px-6 pb-4"
        >
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-[#FFC627]/10 dark:bg-[#FFC627]/5 border border-[#FFC627]/30 dark:border-[#FFC627]/20">
            <Info className="w-4 h-4 text-[#FFC627] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-0.5">
                {t('assignment.submissionGuidelines')}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {content.submissionGuidelines}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Due description */}
      {content.dueDescription && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="px-6 pb-4"
        >
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            {t('assignment.due')}: {content.dueDescription}
          </p>
        </motion.div>
      )}

      {/* Start button */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="flex justify-center pb-8 shrink-0"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="px-8 py-2.5 bg-gradient-to-r from-[#8C1D40] to-[#7A1938] text-white rounded-full font-medium shadow-lg shadow-[#8C1D40]/30 dark:shadow-[#C75B7A]/50 hover:shadow-[#8C1D40]/40 transition-shadow z-10 flex items-center gap-2"
        >
          {t('assignment.startWriting')}
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </div>
  );
}

function RubricTable({
  rubric,
  highlightResults,
}: {
  rubric: Rubric;
  highlightResults?: Map<string, string>; // criterionId -> levelAchieved label
}) {
  if (!rubric.criteria.length) return null;

  // Collect unique level labels (ordered from best to worst, based on first criterion)
  const levelLabels = rubric.criteria[0]?.levels.map((l) => l.label) ?? [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{rubric.title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 w-1/5 min-w-[120px]">
                Criterion
              </th>
              {levelLabels.map((label) => (
                <th
                  key={label}
                  className="text-center px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300 min-w-[100px]"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rubric.criteria.map((criterion, idx) => (
              <tr
                key={criterion.id}
                className={cn(
                  'border-b border-gray-50 dark:border-gray-750',
                  idx % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-850/50' : 'bg-white dark:bg-gray-800',
                )}
              >
                <td className="px-4 py-3 align-top">
                  <p className="font-medium text-gray-700 dark:text-gray-200">{criterion.name}</p>
                  <p className="text-gray-400 dark:text-gray-500 mt-0.5">{criterion.weight}%</p>
                </td>
                {criterion.levels.map((level) => {
                  const isHighlighted = highlightResults?.get(criterion.id) === level.label;
                  return (
                    <td
                      key={level.label}
                      className={cn(
                        'px-3 py-3 align-top text-center',
                        isHighlighted &&
                          'bg-[#8C1D40]/10 dark:bg-[#C75B7A]/20 ring-2 ring-inset ring-[#8C1D40]/30 dark:ring-[#C75B7A]/40 rounded-lg',
                      )}
                    >
                      <p
                        className={cn(
                          'font-bold mb-1',
                          isHighlighted
                            ? 'text-[#8C1D40] dark:text-[#C75B7A]'
                            : 'text-gray-600 dark:text-gray-300',
                        )}
                      >
                        {level.points} pts
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                        {level.description}
                      </p>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RubricSummary({ rubric }: { rubric: Rubric }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-150 dark:border-gray-700 p-3 shadow-sm">
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Rubric
      </h4>
      <div className="space-y-1.5">
        {rubric.criteria.map((c) => (
          <div key={c.id} className="flex items-center justify-between text-xs">
            <span className="text-gray-700 dark:text-gray-200 truncate flex-1">{c.name}</span>
            <span className="text-gray-400 dark:text-gray-500 ml-2 shrink-0">{c.weight}%</span>
          </div>
        ))}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-1.5 flex items-center justify-between text-xs font-semibold">
          <span className="text-gray-700 dark:text-gray-200">Total</span>
          <span className="text-[#8C1D40] dark:text-[#C75B7A]">{rubric.totalPoints} pts</span>
        </div>
      </div>
    </div>
  );
}

function ScoreBanner({ result }: { result: GradeResult }) {
  const { t } = useI18n();
  const pct = result.maxScore > 0 ? Math.round((result.totalScore / result.maxScore) * 100) : 0;

  const color = pct >= 80 ? 'emerald' : pct >= 60 ? 'amber' : 'red';
  const colorMap = {
    emerald: {
      bg: 'from-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-200/50 dark:shadow-emerald-900/50',
      text: t('assignment.excellent'),
    },
    amber: {
      bg: 'from-amber-500 to-yellow-500',
      shadow: 'shadow-amber-200/50 dark:shadow-amber-900/50',
      text: t('assignment.keepGoing'),
    },
    red: {
      bg: 'from-red-500 to-rose-500',
      shadow: 'shadow-red-200/50 dark:shadow-red-900/50',
      text: t('assignment.needsReview'),
    },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('rounded-2xl p-6 bg-gradient-to-r text-white shadow-lg', c.bg, c.shadow)}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{c.text}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-4xl font-black">{result.totalScore}</span>
            <span className="text-white/60 text-lg">/ {result.maxScore}</span>
          </div>
          <p className="text-white/70 text-xs mt-2 max-w-xs leading-relaxed">
            {result.overallFeedback}
          </p>
        </div>

        {/* Percentage ring */}
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="6"
            />
            <motion.circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
              animate={{
                strokeDashoffset: 2 * Math.PI * 34 * (1 - pct / 100),
              }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-black">{pct}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CriterionFeedbackCard({
  result,
  criterion,
  index,
}: {
  result: CriterionResult;
  criterion: RubricCriterion;
  index: number;
}) {
  const isStrong = result.maxScore > 0 && result.score / result.maxScore >= 0.8;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-2xl border p-5 relative overflow-hidden',
        isStrong
          ? 'border-emerald-200 dark:border-emerald-800 shadow-sm shadow-emerald-50 dark:shadow-emerald-900/20'
          : 'border-gray-150 dark:border-gray-700 shadow-sm',
      )}
    >
      {/* Left accent */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl',
          isStrong ? 'bg-emerald-400' : 'bg-[#8C1D40]/70',
        )}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
              isStrong
                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                : 'bg-[#8C1D40]/10 dark:bg-[#C75B7A]/20 text-[#8C1D40] dark:text-[#C75B7A]',
            )}
          >
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{criterion.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{criterion.weight}% weight</p>
          </div>
        </div>
        <div className="shrink-0 ml-2 text-right">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
            {result.score}/{result.maxScore}
          </p>
          <p
            className={cn(
              'text-xs font-medium',
              isStrong ? 'text-emerald-500' : 'text-[#8C1D40] dark:text-[#C75B7A]',
            )}
          >
            {result.levelAchieved}
          </p>
        </div>
      </div>

      {/* Feedback */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#8C1D40]/5 dark:bg-[#C75B7A]/10 border border-[#8C1D40]/10 dark:border-[#C75B7A]/20">
        <Sparkles className="w-4 h-4 text-[#8C1D40] dark:text-[#C75B7A] shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          {result.feedback}
        </p>
      </div>

      {/* Level bar showing where they placed */}
      <div className="mt-3 flex gap-1">
        {criterion.levels.map((level) => {
          const isAchieved = level.label === result.levelAchieved;
          return (
            <div
              key={level.label}
              className={cn(
                'flex-1 h-1.5 rounded-full transition-colors',
                isAchieved ? 'bg-[#8C1D40] dark:bg-[#C75B7A]' : 'bg-gray-100 dark:bg-gray-700',
              )}
              title={`${level.label}: ${level.points} pts`}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AssignmentView({ content, sceneId, mode: _mode }: AssignmentViewProps) {
  const { t, locale } = useI18n();
  const [phase, setPhase] = useState<Phase>('instructions');
  const [submission, setSubmission] = useState('');
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

  // Draft cache for submission text
  const {
    cachedValue: cachedSubmission,
    updateCache: updateSubmissionCache,
    clearCache: clearSubmissionCache,
  } = useDraftCache<string>({
    key: `assignmentDraft:${sceneId}`,
  });

  // Restore cached submission during render
  const [prevCached, setPrevCached] = useState(cachedSubmission);
  if (cachedSubmission !== prevCached) {
    setPrevCached(cachedSubmission);
    if (cachedSubmission && cachedSubmission.trim().length > 0 && phase === 'instructions') {
      setSubmission(cachedSubmission);
      setPhase('writing');
    }
  }

  // Ref for speech transcription append
  const submissionRef = useRef(submission);
  useEffect(() => {
    submissionRef.current = submission;
  }, [submission]);

  const handleUpdateSubmission = useCallback(
    (value: string) => {
      setSubmission(value);
      updateSubmissionCache(value);
    },
    [updateSubmissionCache],
  );

  const canSubmit = useMemo(() => submission.trim().length >= 10, [submission]);

  const handleSubmitForGrading = useCallback(() => {
    if (content.gradingMode === 'rubric-only') {
      // No AI grading, just show the rubric
      return;
    }
    setPhase('grading');
    clearSubmissionCache();
  }, [content.gradingMode, clearSubmissionCache]);

  // When entering grading phase, call the AI grading API
  useEffect(() => {
    if (phase !== 'grading') return;
    let cancelled = false;

    (async () => {
      const result = await gradeAssignment(
        submission,
        content.rubric,
        content.aiGradingPrompt ?? '',
        locale,
      );

      if (cancelled) return;

      setGradeResult(result);
      setPhase('review');
    })();

    return () => {
      cancelled = true;
    };
  }, [phase, submission, content.rubric, content.aiGradingPrompt, locale]);

  const handleRetry = useCallback(() => {
    setPhase('instructions');
    setSubmission('');
    setGradeResult(null);
    clearSubmissionCache();
  }, [clearSubmissionCache]);

  // Build highlight map for review rubric
  const highlightMap = useMemo(() => {
    if (!gradeResult) return undefined;
    const map = new Map<string, string>();
    for (const cr of gradeResult.criterionResults) {
      map.set(cr.criterionId, cr.levelAchieved);
    }
    return map;
  }, [gradeResult]);

  // Build criterion lookup
  const criterionMap = useMemo(() => {
    const map = new Map<string, RubricCriterion>();
    for (const c of content.rubric.criteria) {
      map.set(c.id, c);
    }
    return map;
  }, [content.rubric.criteria]);

  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900 overflow-hidden flex flex-col">
      <AnimatePresence mode="wait">
        {/* ─── Instructions Phase ───────────────────────────────────── */}
        {phase === 'instructions' && (
          <motion.div
            key="instructions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 min-h-0"
          >
            <AssignmentCover content={content} onStart={() => setPhase('writing')} />
          </motion.div>
        )}

        {/* ─── Writing Phase ────────────────────────────────────────── */}
        {phase === 'writing' && (
          <motion.div
            key="writing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#8C1D40]" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t('assignment.writing')}
                </span>
                <span className="text-xs text-gray-400 ml-1">
                  {wordCount(submission)} {t('assignment.words')}
                </span>
              </div>
              {content.gradingMode !== 'rubric-only' && (
                <button
                  onClick={handleSubmitForGrading}
                  disabled={!canSubmit}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
                    canSubmit
                      ? 'bg-gradient-to-r from-[#8C1D40] to-[#7A1938] text-white shadow-sm hover:shadow-md hover:shadow-[#8C1D40]/30 dark:hover:shadow-[#C75B7A]/50 active:scale-[0.97]'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed',
                  )}
                >
                  {t('assignment.submitForGrading')}
                </button>
              )}
            </div>

            {/* Content area */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              {/* Rubric sidebar */}
              <div className="lg:w-64 shrink-0 p-4 overflow-y-auto border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700">
                <RubricSummary rubric={content.rubric} />
              </div>

              {/* Textarea area */}
              <div className="flex-1 p-4 flex flex-col min-h-0">
                <div className="flex-1 relative">
                  <textarea
                    value={submission}
                    onChange={(e) => handleUpdateSubmission(e.target.value)}
                    placeholder={t('assignment.writingPlaceholder')}
                    className="w-full h-full p-4 pb-12 rounded-xl border border-gray-200 dark:border-gray-600 text-sm resize-none focus:outline-none focus:border-[#8C1D40]/40 dark:focus:border-[#C75B7A] focus:ring-2 focus:ring-[#8C1D40]/10 dark:focus:ring-[#C75B7A]/20 transition-all dark:bg-gray-800/50 dark:text-gray-200 dark:placeholder:text-gray-500 leading-relaxed"
                  />
                  <SpeechButton
                    size="sm"
                    className="absolute bottom-3 left-3"
                    onTranscription={(text) => {
                      const cur = submissionRef.current;
                      handleUpdateSubmission(cur + (cur ? ' ' : '') + text);
                    }}
                  />
                  <span className="absolute bottom-3 right-3 text-xs text-gray-300 dark:text-gray-600">
                    {submission.length} {t('assignment.chars')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Grading Phase ────────────────────────────────────────── */}
        {phase === 'grading' && (
          <motion.div
            key="grading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-5"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            >
              <Loader2 className="w-10 h-10 text-[#8C1D40]" />
            </motion.div>
            <div className="text-center">
              <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
                {t('assignment.aiGrading')}
              </p>
              <p className="text-sm text-gray-400 mt-1">{t('assignment.aiGradingWait')}</p>
            </div>
            <div className="flex gap-1 mt-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#8C1D40]/70"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.2,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── Review Phase ─────────────────────────────────────────── */}
        {phase === 'review' && gradeResult && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t('assignment.report')}
                </span>
              </div>
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#8C1D40] dark:hover:text-[#C75B7A] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('assignment.retry')}
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <ScoreBanner result={gradeResult} />

              {/* Per-criterion feedback cards */}
              {gradeResult.criterionResults.map((cr, i) => {
                const criterion = criterionMap.get(cr.criterionId);
                if (!criterion) return null;
                return (
                  <CriterionFeedbackCard
                    key={cr.criterionId}
                    result={cr}
                    criterion={criterion}
                    index={i}
                  />
                );
              })}

              {/* Full rubric with highlights */}
              <RubricTable rubric={content.rubric} highlightResults={highlightMap} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
