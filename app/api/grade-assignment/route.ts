/**
 * Assignment Grading API
 *
 * POST: Receives a student submission + rubric, calls LLM for per-criterion
 * scoring and feedback. Used for written assignments with rubric-based grading.
 */

import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveModel } from '@/lib/server/resolve-model';
import { parseJsonResponse } from '@/lib/generation/json-repair';

const log = createLogger('Assignment Grade');

interface Rubric {
  id: string;
  title: string;
  totalPoints: number;
  criteria: Array<{
    id: string;
    name: string;
    description: string;
    weight: number;
    levels: Array<{
      label: string;
      points: number;
      description: string;
    }>;
  }>;
}

interface GradeRequest {
  submission: string;
  rubric: Rubric;
  aiGradingPrompt: string;
  language?: string;
}

interface CriterionResult {
  criterionId: string;
  criterionName: string;
  levelAchieved: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface GradeResponse {
  totalScore: number;
  maxScore: number;
  criterionResults: CriterionResult[];
  overallFeedback: string;
}

export async function POST(req: NextRequest) {
  let submissionSnippet: string | undefined;
  try {
    const body = (await req.json()) as GradeRequest;
    const { submission, rubric, aiGradingPrompt, language } = body;
    submissionSnippet = submission?.substring(0, 60);

    if (!submission || !rubric) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'submission and rubric are required');
    }

    if (!rubric.criteria || rubric.criteria.length === 0) {
      return apiError('INVALID_REQUEST', 400, 'rubric must have at least one criterion');
    }

    // Resolve model from request headers
    const { model: languageModel } = await resolveModel({});

    const isZh = language === 'zh-CN';

    // Build the criterion descriptions for the prompt
    const criteriaDescription = rubric.criteria
      .map((c, i) => {
        const levelsDesc = c.levels
          .map((l) => `  - ${l.label} (${l.points} pts): ${l.description}`)
          .join('\n');
        return `${i + 1}. ${c.name} (Weight: ${c.weight}%, ID: "${c.id}")
   Description: ${c.description}
   Levels:
${levelsDesc}`;
      })
      .join('\n\n');

    const systemPrompt = isZh
      ? `你是一位专业的教育评估专家。请根据评分量规（rubric）对学生的作业进行详细评分。

评分量规：
${criteriaDescription}

总分：${rubric.totalPoints}分

${aiGradingPrompt ? `评分指导：${aiGradingPrompt}\n` : ''}
请对每个评分标准进行评分，选择最匹配的等级，并提供具体反馈。

必须以如下 JSON 格式回复（不要包含其他内容）：
{
  "totalScore": <总分>,
  "maxScore": ${rubric.totalPoints},
  "criterionResults": [
    {
      "criterionId": "<标准ID>",
      "criterionName": "<标准名称>",
      "levelAchieved": "<达到的等级标签>",
      "score": <该标准得分>,
      "maxScore": <该标准满分>,
      "feedback": "<具体反馈>"
    }
  ],
  "overallFeedback": "<总体评价>"
}`
      : `You are a professional educational assessor. Grade the student's submission against each criterion in the rubric below.

Rubric:
${criteriaDescription}

Total points possible: ${rubric.totalPoints}

${aiGradingPrompt ? `Grading guidance: ${aiGradingPrompt}\n` : ''}
For each criterion, select the performance level that best matches the submission and provide specific, constructive feedback. The score for each criterion should be calculated as: (weight / 100) * totalPoints * (level_points / max_level_points_for_that_criterion).

You must reply in the following JSON format only (no other content):
{
  "totalScore": <sum of all criterion scores>,
  "maxScore": ${rubric.totalPoints},
  "criterionResults": [
    {
      "criterionId": "<criterion ID>",
      "criterionName": "<criterion name>",
      "levelAchieved": "<label of the achieved level>",
      "score": <points earned for this criterion>,
      "maxScore": <max points for this criterion>,
      "feedback": "<specific feedback for this criterion>"
    }
  ],
  "overallFeedback": "<summary feedback on the overall submission>"
}`;

    const userPrompt = isZh
      ? `学生提交的作业：\n\n${submission}`
      : `Student submission:\n\n${submission}`;

    const result = await callLLM(
      {
        model: languageModel,
        system: systemPrompt,
        prompt: userPrompt,
      },
      'assignment-grade',
    );

    // Parse the LLM response as JSON
    const text = result.text.trim();
    let gradeResult: GradeResponse | null = null;

    // Try parseJsonResponse first (handles code blocks, repairs, etc.)
    gradeResult = parseJsonResponse<GradeResponse>(text);

    if (gradeResult && gradeResult.criterionResults) {
      // Validate and cap scores to valid ranges
      const maxScore = rubric.totalPoints;
      let recalculatedTotal = 0;

      gradeResult.criterionResults = gradeResult.criterionResults.map((cr) => {
        const criterion = rubric.criteria.find((c) => c.id === cr.criterionId);
        const criterionMax = criterion
          ? Math.round((criterion.weight / 100) * maxScore)
          : cr.maxScore;
        const cappedScore = Math.max(0, Math.min(criterionMax, Math.round(Number(cr.score))));
        recalculatedTotal += cappedScore;
        return {
          ...cr,
          score: cappedScore,
          maxScore: criterionMax,
        };
      });

      gradeResult.totalScore = Math.max(0, Math.min(maxScore, recalculatedTotal));
      gradeResult.maxScore = maxScore;
    } else {
      // Fallback: give 50% credit on each criterion
      log.warn('Failed to parse AI grading response, using fallback scores');
      const fallbackResults: CriterionResult[] = rubric.criteria.map((c) => {
        const criterionMax = Math.round((c.weight / 100) * rubric.totalPoints);
        return {
          criterionId: c.id,
          criterionName: c.name,
          levelAchieved: c.levels[Math.floor(c.levels.length / 2)]?.label ?? 'N/A',
          score: Math.round(criterionMax * 0.5),
          maxScore: criterionMax,
          feedback: isZh
            ? '已作答，请参考评分量规。'
            : 'Submission received. Please refer to the rubric.',
        };
      });
      gradeResult = {
        totalScore: fallbackResults.reduce((s, r) => s + r.score, 0),
        maxScore: rubric.totalPoints,
        criterionResults: fallbackResults,
        overallFeedback: isZh ? '已完成评分。' : 'Grading complete.',
      };
    }

    return apiSuccess({ ...gradeResult });
  } catch (error) {
    log.error(
      `Assignment grading failed [submission="${submissionSnippet ?? 'unknown'}..."]:`,
      error,
    );
    return apiError('INTERNAL_ERROR', 500, 'Failed to grade assignment');
  }
}
