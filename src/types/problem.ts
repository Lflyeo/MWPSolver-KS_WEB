export type TagType = 'knowledge' | 'context';

export interface Tag {
  id: number;
  name: string;
  type: TagType;
}

export interface ProblemHistory {
  id: number | string;
  question: string;
  answerSummary: string;
  tags: Tag[];
  timestamp: string;
  isFavorite?: boolean;
  favoriteTime?: string;
}

export interface ProblemDetail extends ProblemHistory {
  /** 后端原始解题内容（Markdown/LaTeX），用于富文本展示与复制 */
  solutionMarkdown: string;
  solutionSteps: string[];
  finalAnswer: string;
}

export interface UserInfo {
  name: string;
  avatar?: string;
  daysOfLearning: number;
  stats?: {
    problemCount: number;
    favoriteCount: number;
  };
}