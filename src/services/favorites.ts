import { apiGet, apiPost, apiDelete, type ApiResult } from '@/lib/api';
import type { RecordTag } from './records';
import type { ProblemHistory } from '@/types/problem';

export interface FavoriteListItem {
  id: string;
  record_id: string;
  question: string;
  answer: string | null;
  favoriteTime: string;
  tags: RecordTag[];
}

export function favoritesList(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}): Promise<ApiResult<FavoriteListItem[]> & { total: number }> {
  return apiGet<FavoriteListItem[]>('/favorites/list', {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 10,
    keyword: params.keyword ?? undefined,
  }) as Promise<ApiResult<FavoriteListItem[]> & { total: number }>;
}

export function favoriteAdd(record_id: string): Promise<ApiResult<{ id: string }>> {
  return apiPost<{ id: string }>('/favorites/add', { record_id });
}

export function favoriteRemove(record_id: string): Promise<ApiResult<Record<string, never>>> {
  return apiDelete<Record<string, never>>('/favorites/remove', { record_id });
}

export function favoriteCheck(record_id: string): Promise<ApiResult<{ is_favorited: boolean; favorite_id: string | null }>> {
  return apiGet<{ is_favorited: boolean; favorite_id: string | null }>('/favorites/check', { record_id });
}

/** 将收藏项转为前端 ProblemHistory（用于列表展示，id 为 record_id 便于跳转详情） */
export function mapFavoriteToHistory(f: FavoriteListItem): ProblemHistory {
  return {
    id: f.record_id,
    question: f.question,
    answerSummary: f.answer ?? '',
    timestamp: '', // 列表接口未返回记录创建时间，可后续扩展
    favoriteTime: f.favoriteTime,
    isFavorite: true,
    tags: f.tags.map((t, i) => ({
      id: i + 1,
      name: t.name,
      type: (t.type === 'semantic' ? 'context' : 'knowledge') as 'knowledge' | 'context',
    })),
  };
}
