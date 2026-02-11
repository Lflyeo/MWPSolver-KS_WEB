import { apiGet, apiPost, type ApiResult } from '@/lib/api';

export interface SolveModelOption {
  id: string;
  name: string;
}

export interface SolveResultData {
  content: string;
  knowledge_points: string[];
  semantic_contexts: string[];
}

export interface AnalyzeResultData {
  knowledge_points: string[];
  semantic_contexts: string[];
}

export function solveModels(): Promise<ApiResult<SolveModelOption[]>> {
  return apiGet<SolveModelOption[]>('/solve/models');
}

/** 仅分析题目：识别知识点与语义情境 */
export function solveAnalyze(body: { question: string }): Promise<ApiResult<AnalyzeResultData>> {
  return apiPost<AnalyzeResultData>('/solve/analyze', body);
}

/** 解题（可传入已识别的 knowledge_points / semantic_contexts，避免重复识别） */
export function solve(body: {
  question: string;
  model?: string;
  knowledge_points?: string[];
  semantic_contexts?: string[];
}): Promise<ApiResult<SolveResultData>> {
  return apiPost<SolveResultData>('/solve', body);
}
