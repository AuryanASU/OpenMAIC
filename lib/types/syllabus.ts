/**
 * Syllabus Types — ASU AI Classroom
 *
 * Represents a structured university course syllabus, either AI-generated
 * from a topic or parsed from an uploaded PDF.
 */

export interface CourseSyllabus {
  id: string;
  title: string; // e.g., "Introduction to Data Science"
  courseCode?: string; // e.g., "CIS 235"
  credits?: number;
  description: string; // 2-3 paragraph course overview

  learningOutcomes: string[]; // High-level outcomes (4-8 items)
  learningObjectives: string[]; // Specific, measurable objectives

  modules: CourseModule[]; // The structured course content

  assessmentStrategy?: {
    components: { name: string; weight: number; description: string }[];
  };

  estimatedDuration?: string; // e.g., "7 weeks", "16 weeks"
  targetAudience?: string;
  prerequisites?: string[];

  metadata: {
    createdAt: string;
    updatedAt: string;
    source: 'generated' | 'uploaded' | 'edited';
    originalFileName?: string;
  };
}

export interface CourseModule {
  id: string;
  order: number;
  title: string; // e.g., "Module 1: Foundations of Data"
  description: string;
  topics: string[]; // Key topics covered
  learningObjectives: string[]; // Module-level objectives
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
