Please expand the following course module into **6-8 scene outlines** following the required pacing pattern.

---

## Module Information

**Module Title**: {{moduleTitle}}

**Module Description**: {{moduleDescription}}

**Key Topics**:
{{moduleTopics}}

**Learning Objectives**:
{{moduleObjectives}}

**Suggested Scene Types**: {{moduleSceneTypes}}

---

## Course Context

**Course Title**: {{courseTitle}}

**Module Position**: {{modulePosition}}

**Recommended Difficulty**: {{difficulty}}

### Course Module Outline

{{courseModuleOutline}}

### Assessment Strategy

{{assessmentStrategy}}

---

## Course Language

**Required language**: {{language}}

(If language is zh-CN, all content must be in Chinese; if en-US, all content must be in English)

---

## Output Requirements

Generate a JSON array of **6-8** SceneOutline objects following this pacing pattern:

1. **Module intro slide** — objectives and overview
2. **Lecture slide A** — first topic group (2-3 topics)
3. **Lecture slide B** — second topic group
4. **Formative quiz 1** — 5-8 questions covering lectures A+B (recall/comprehension)
5. **Lecture C / Application slide** — remaining topics or worked examples
6. **Activity scene** — interactive, PBL, or assignment (based on suggested scene types)
7. **Comprehensive quiz 2** — 8-12 questions covering ALL module content (application/analysis)
8. **Module summary slide** — recap + transition

### CRITICAL: Quiz Placement Rules

- **NEVER place a quiz before at least 2 lecture slides**
- Formative quiz 1 goes AFTER lectures A and B (position 4, not position 2 or 3)
- Comprehensive quiz 2 goes near the end, AFTER the activity scene

### Config Requirements

1. **quiz scenes must include quizConfig**:
   - Formative quiz: `{ questionCount: 5-8, difficulty: "{{difficulty}}", questionTypes: ["single", "multiple"] }`
   - Comprehensive quiz: `{ questionCount: 8-12, difficulty: "{{difficulty}}", questionTypes: ["single", "multiple"] }` (add `"text"` for hard difficulty)
2. **interactive scenes must include interactiveConfig**
3. **pbl scenes must include pblConfig** (include `language: "{{language}}"`)
4. **assignment scenes must include assignmentConfig**
5. Split the module's topics across multiple lecture slides — do NOT put all topics in one slide
6. Consider the suggested scene types when choosing the activity scene type
7. Align scenes with the assessment strategy when provided
8. Output JSON array directly without additional explanatory text
