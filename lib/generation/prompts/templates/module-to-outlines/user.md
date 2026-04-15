Please expand the following course module into 3-5 scene outlines.

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

Generate a JSON array of 3-5 SceneOutline objects for this module. Each scene must include:

```json
{
  "id": "scene_1",
  "type": "slide" | "quiz" | "interactive" | "pbl" | "assignment",
  "title": "Scene Title",
  "description": "Teaching purpose description",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "teachingObjective": "Learning objective addressed",
  "order": 1
}
```

### Requirements

1. **quiz scenes must include quizConfig** with difficulty set to "{{difficulty}}"
2. **interactive scenes must include interactiveConfig**
3. **pbl scenes must include pblConfig** (include `language: "{{language}}"`)
4. **assignment scenes must include assignmentConfig**
5. Start with a lecture slide introducing the module topic
6. Include at least one assessment scene (quiz or assignment) if the module has 3+ topics
7. Consider the suggested scene types when choosing scene types
8. Align scenes with the assessment strategy when provided
9. Output JSON array directly without additional explanatory text
