/**
 * Syllabus Types — ASU AI Classroom
 *
 * Represents a structured university course syllabus, either AI-generated
 * from a topic or parsed from an uploaded PDF.
 */

import type { BloomsLevel, BloomsRange } from './blooms';

export interface CourseSyllabus {
  id: string;
  title: string; // e.g., "Introduction to Data Science"
  courseCode?: string; // e.g., "CIS 235"
  credits?: number;
  description: string; // 2-3 paragraph course overview

  learningOutcomes: string[]; // High-level outcomes (4-8 items)
  learningObjectives: string[]; // Specific, measurable objectives

  /** Parallel arrays indexing the Bloom's level of each outcome/objective. */
  learningOutcomesBloom?: BloomsLevel[];
  learningObjectivesBloom?: BloomsLevel[];

  /** Course-level Bloom's target range (e.g., introductory → Remember-Apply). */
  bloomsRange?: BloomsRange;

  modules: CourseModule[]; // The structured course content

  assessmentStrategy?: {
    components: AssessmentComponent[];
  };

  estimatedDuration?: string; // e.g., "7 weeks", "16 weeks"
  targetAudience?: string;
  prerequisites?: string[];

  metadata: {
    createdAt: string;
    updatedAt: string;
    source: 'generated' | 'uploaded' | 'edited';
    originalFileName?: string;
    /** True when Bloom's levels were inferred from uploaded content rather than user-specified. */
    bloomsInferred?: boolean;
  };
}

export interface AssessmentComponent {
  name: string;
  weight: number;
  description: string;
  /** Primary Bloom's level this assessment targets. */
  bloomsLevel?: BloomsLevel;
}

export interface CourseModule {
  id: string;
  order: number;
  title: string; // e.g., "Module 1: Foundations of Data"
  description: string;
  topics: string[]; // Key topics covered
  learningObjectives: string[]; // Module-level objectives
  /** Parallel array: Bloom's level of each learning objective above. */
  learningObjectivesBloom?: BloomsLevel[];
  /** Primary Bloom's cognitive target for this module. */
  bloomsLevel?: BloomsLevel;
  estimatedWeeks?: number;
  sceneTypes?: ('slide' | 'quiz' | 'interactive' | 'pbl' | 'assignment')[];
}

/** Request body for POST /api/generate-syllabus */
export interface GenerateSyllabusRequest {
  topic: string;
  targetAudience?: string;
  duration?: string; // e.g., "8 weeks", "16 weeks"
  depth?: 'introductory' | 'intermediate' | 'advanced';
  language?: 'en-US' | 'zh-CN';
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

/** SSE event streamed by /api/generate-syllabus */
export type SyllabusStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'syllabus'; syllabus: CourseSyllabus }
  | { type: 'error'; error: string }
  | { type: 'done' };

/** Request body for POST /api/parse-syllabus — sent as multipart/form-data */
// file: File (PDF), model?: string, apiKey?: string, baseUrl?: string

/** Response from POST /api/parse-syllabus */
export interface ParseSyllabusResponse {
  success: true;
  syllabus: CourseSyllabus;
}

/** AI chat message for the syllabus editor */
export interface SyllabusEditMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
