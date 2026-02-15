import { apiGet, apiPost, apiDelete, type ApiResult } from '@/lib/api';
import type { ProblemHistory, ProblemDetail } from '@/types/problem';

/** 后端返回的标签（type 为 knowledge | semantic） */
export interface RecordTag {
  name: string;
  type: string;
}

export interface RecordListItem {
  id: string;
  question: string;
  answer: string | null;
  time: string;
  tags: RecordTag[];
}

export interface RecordDetailItem extends RecordListItem {
  solution: string | null;
}

export interface RecordListResponse {
  data: RecordListItem[];
  total: number;
}

export interface RecordDetailResponse {
  data: RecordDetailItem | null;
}

export interface RecordSaveResponse {
  data: { id: string };
}

export interface RecordStats {
  total: number;
  daysOfLearning: number;
}

export function recordsStats(): Promise<ApiResult<RecordStats> & { data: RecordStats }> {
  return apiGet<RecordStats>('/records/stats') as Promise<ApiResult<RecordStats> & { data: RecordStats }>;
}

export function recordsList(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
}): Promise<ApiResult<RecordListItem[]> & { total: number }> {
  return apiGet<RecordListItem[]>('/records/list', {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 10,
    keyword: params.keyword ?? undefined,
    category: params.category ?? undefined,
  }) as Promise<ApiResult<RecordListItem[]> & { total: number }>;
}

export function recordDetail(id: string): Promise<ApiResult<RecordDetailItem | null>> {
  return apiGet<RecordDetailItem | null>('/records/detail', { id });
}

export function recordSave(body: {
  question: string;
  answer?: string;
  solution?: string;
  knowledge_points?: string[];
  semantic_contexts?: string[];
}): Promise<ApiResult<{ id: string }>> {
  return apiPost<{ id: string }>('/records/save', body);
}

export function recordRemove(id: string): Promise<ApiResult<Record<string, never>>> {
  return apiDelete<Record<string, never>>('/records/remove', { id });
}

/** 将 API 记录转为前端 ProblemHistory（语义情境 type: semantic -> context） */
export function mapRecordToHistory(r: RecordListItem): ProblemHistory {
  return {
    id: r.id,
    question: r.question,
    answerSummary: r.answer ?? '',
    tags: r.tags.map((t, i) => ({
      id: i + 1,
      name: t.name,
      type: (t.type === 'semantic' ? 'context' : 'knowledge') as 'knowledge' | 'context',
    })),
    timestamp: r.time,
  };
}

/** 将 API 详情转为前端 ProblemDetail */
export function mapDetailToProblemDetail(r: RecordDetailItem): ProblemDetail {
  const solutionMarkdown = r.solution ?? '';
  const steps = solutionMarkdown.split(/\n\n+/).filter(Boolean);
  return {
    id: r.id,
    question: r.question,
    answerSummary: r.answer ?? '',
    tags: r.tags.map((t, i) => ({
      id: i + 1,
      name: t.name,
      type: (t.type === 'semantic' ? 'context' : 'knowledge') as 'knowledge' | 'context',
    })),
    timestamp: r.time,
    solutionMarkdown,
    solutionSteps: steps.length > 0 ? steps : [solutionMarkdown],
    finalAnswer: r.answer ?? '',
  };
}
