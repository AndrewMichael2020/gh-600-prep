export type QuestionType =
  | "single_choice"
  | "multi_select"
  | "sequence_order"
  | "matching_magnet"
  | "dropdown_completion"
  | "case_study_child"
  | "code_or_config_artifact"
  | "log_or_artifact_interpretation"
  | "policy_control_selection";

export type Difficulty = "medium" | "hard" | "very_hard";

export interface AnswerOption {
  id: "A" | "B" | "C" | "D" | "E" | string;
  text: string;
}

export interface OrderedAnswer {
  order: string[];
}

export interface MatchingAnswer {
  pairs: Record<string, string>;
}

export interface DropdownSlot {
  id: string;
  choices: string[];
}

export interface QuestionArtifact {
  title: string;
  kind:
    | "yaml"
    | "json"
    | "markdown"
    | "log"
    | "policy"
    | "pr_diff"
    | "workflow_output"
    | "terminal_output";
  content: string;
}

export interface Explanation {
  whyCorrect: string;
  whyDistractorsWrong: Record<string, string>;
  examStrategyNote?: string;
}

export interface SourceRef {
  title: string;
  url?: string;
  repo?: string;
  docType:
    | "official_docs"
    | "official_repo"
    | "study_guide"
    | "github_docs"
    | "microsoft_learn";
}

export interface QuestionMetadata {
  generatedAt: string;
  model: string;
  reasoningEffort: string;
  batchId: string;
  validationStatus: "draft" | "validated" | "needs_review" | "rejected";
  correctOptionLengthRank?: "shortest" | "middle" | "longest";
  ambiguityScore?: number;
}

export interface PracticeQuestion {
  id: string;
  examCode: "GH-600";
  domainId: string;
  domainName: string;
  objectiveTags: string[];
  type: QuestionType;
  difficulty: Difficulty;
  stem: string;
  scenario?: string;
  artifact?: QuestionArtifact;
  caseStudyId?: string;
  options: AnswerOption[];
  matchChoices?: string[];
  statementTemplate?: string;
  slots?: DropdownSlot[];
  correctAnswer: string | string[] | OrderedAnswer | MatchingAnswer;
  explanation: Explanation;
  sourceRefs: SourceRef[];
  metadata: QuestionMetadata;
}

export interface CaseStudySection {
  heading: string;
  body: string;
}

export interface CaseStudy {
  id: string;
  title: string;
  intro: string;
  sections: CaseStudySection[];
  artifacts?: QuestionArtifact[];
  questionIds: string[];
}

export interface DomainBlueprint {
  id: string;
  name: string;
  count: number;
}

export interface ItemTypeBlueprint {
  single_choice: number;
  multi_select: number;
  sequence_order: number;
  matching_magnet: number;
  case_study: number;
  code_or_config_artifact: number;
}

export interface GenerationPlan {
  totalQuestions: number;
  domains: DomainBlueprint[];
  itemTypes: ItemTypeBlueprint;
  caseStudyCount: number;
  difficulty: Record<Difficulty, number>;
  batches: BatchPlan[];
}

export interface BatchPlan {
  id: string;
  domainId?: string;
  domainName?: string;
  typeFocus: (keyof ItemTypeBlueprint)[];
  difficultyFocus: Difficulty[];
  caseStudyId?: string;
  questionCount: number;
}

export interface ExamSet {
  id: string;
  createdAt: string;
  plan: GenerationPlan;
  questions: PracticeQuestion[];
  caseStudies: CaseStudy[];
  antiBias: {
    answerPositionDistribution: Record<string, number>;
    longestOptionCorrectRatio: number;
  };
}

export interface Attempt {
  id: string;
  examId: string;
  createdAt: string;
  answers: Record<string, string | string[] | Record<string, string>>;
  confidence: Record<string, "guessed" | "somewhat_confident" | "confident">;
  flagged: string[];
  score: {
    overall: number;
    correct: number;
    total: number;
    byDomain: Record<string, number>;
    incorrectQuestionIds: string[];
  };
}
