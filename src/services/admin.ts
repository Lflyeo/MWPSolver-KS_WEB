/**
 * 管理员端 API：所有请求携带 X-Admin-Token（与后端 ADMIN_SECRET 一致）
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const API_PREFIX = '/api';
const ADMIN_TOKEN_KEY = 'mathpro_admin_token';

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

interface ApiResult<T = unknown> {
  errCode: number;
  errMsg: string;
  data: T;
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const token = getAdminToken();
  if (!token) {
    throw new Error('请先登录管理员');
  }
  const url = path.startsWith('/') ? `${BASE_URL}${API_PREFIX}${path}` : `${BASE_URL}${API_PREFIX}/${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Admin-Token': token,
    ...(options.headers as HeadersInit),
  };
  const res = await fetch(url, { ...options, headers });
  const json = (await res.json()) as ApiResult<T>;
  if (!res.ok) throw new Error(json.errMsg || res.statusText || '请求失败');
  return json;
}

export interface AdminUserItem {
  id: string;
  username: string;
  nickname?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
}

export interface AdminSolveModelItem {
  id: number;
  model_id: string;
  display_name: string;
  sort_order: number;
  enabled: boolean;
  created_at?: string | null;
}

export interface AdminUniapiConfig {
  base_url: string;
  token: string;
  model?: string | null;
  base_url_knowledge?: string | null;
  token_knowledge?: string | null;
  model_knowledge?: string | null;
  base_url_semantic?: string | null;
  token_semantic?: string | null;
  model_semantic?: string | null;
}

export interface AdminRecordItem {
  id: string;
  question: string;
  answer?: string | null;
  created_at?: string | null;
  user_id?: string | null;
  username?: string | null;
  nickname?: string | null;
}

export interface AdminRecordDetailItem extends AdminRecordItem {
  solution?: string | null;
  knowledge_points?: string[];
  semantic_contexts?: string[];
}

export interface AdminFavoriteItem {
  id: string;
  record_id: string;
  question: string;
  created_at?: string | null;
  user_id?: string | null;
  username?: string | null;
  nickname?: string | null;
}

export function adminUsersList(params: { page?: number; pageSize?: number; keyword?: string }) {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.pageSize != null) search.set('pageSize', String(params.pageSize));
  if (params.keyword) search.set('keyword', params.keyword);
  const qs = search.toString();
  return adminRequest<AdminUserItem[]>(`/admin/users${qs ? `?${qs}` : ''}`) as Promise<ApiResult<AdminUserItem[]> & { total: number }>;
}

export function adminUserGet(userId: string) {
  return adminRequest<AdminUserItem>(`/admin/users/${userId}`);
}

export function adminUserUpdate(userId: string, body: { nickname?: string; avatar_url?: string }) {
  return adminRequest<{ id: string }>(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function adminUserDelete(userId: string) {
  return adminRequest<Record<string, never>>(`/admin/users/${userId}`, { method: 'DELETE' });
}

export function adminUniapiConfigGet() {
  return adminRequest<AdminUniapiConfig | null>(`/admin/uniapi-config`);
}

export function adminUniapiConfigUpdate(body: {
  base_url?: string;
  token?: string;
  model?: string | null;
  base_url_knowledge?: string | null;
  token_knowledge?: string | null;
  model_knowledge?: string | null;
  base_url_semantic?: string | null;
  token_semantic?: string | null;
  model_semantic?: string | null;
}) {
  return adminRequest<Record<string, never>>(`/admin/uniapi-config`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function adminUserCreate(body: { username: string; password: string }) {
  return adminRequest<{ id: string }>(`/admin/users`, { method: 'POST', body: JSON.stringify(body) });
}

export function adminUserUpdatePassword(userId: string, body: { password: string }) {
  return adminRequest<{ id: string }>(`/admin/users/${userId}/password`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function adminUserUploadAvatar(userId: string, file: File) {
  const token = getAdminToken();
  if (!token) {
    throw new Error('请先登录管理员');
  }
  const url = `${BASE_URL}${API_PREFIX}/admin/users/${userId}/avatar`;
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Admin-Token': token,
    },
    body: formData,
  });
  const json = (await res.json()) as ApiResult<{ url: string }>;
  if (!res.ok || json.errCode !== 0) {
    throw new Error(json.errMsg || res.statusText || '上传失败');
  }
  return json;
}

export function adminSolveModelsList() {
  return adminRequest<AdminSolveModelItem[]>('/admin/solve-models');
}

export function adminSolveModelCreate(body: { model_id: string; display_name: string; sort_order?: number; enabled?: boolean }) {
  return adminRequest<AdminSolveModelItem>('/admin/solve-models', { method: 'POST', body: JSON.stringify(body) });
}

export function adminSolveModelUpdate(id: number, body: { display_name?: string; sort_order?: number; enabled?: boolean }) {
  return adminRequest<AdminSolveModelItem>(`/admin/solve-models/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function adminSolveModelDelete(id: number) {
  return adminRequest<Record<string, never>>(`/admin/solve-models/${id}`, { method: 'DELETE' });
}

export function adminRecordsList(params: { page?: number; pageSize?: number; keyword?: string; user_id?: string }) {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.pageSize != null) search.set('pageSize', String(params.pageSize));
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.user_id) search.set('user_id', params.user_id);
  const qs = search.toString();
  return adminRequest<AdminRecordItem[]>(`/admin/records${qs ? `?${qs}` : ''}`) as Promise<ApiResult<AdminRecordItem[]> & {
    total: number;
  }>;
}

export function adminRecordDelete(id: string) {
  return adminRequest<Record<string, never>>(`/admin/records/${id}`, { method: 'DELETE' });
}

export function adminRecordDetail(id: string) {
  return adminRequest<AdminRecordDetailItem | null>(`/admin/records/${id}`);
}

export function adminFavoritesList(params: { page?: number; pageSize?: number; keyword?: string; user_id?: string }) {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.pageSize != null) search.set('pageSize', String(params.pageSize));
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.user_id) search.set('user_id', params.user_id);
  const qs = search.toString();
  return adminRequest<AdminFavoriteItem[]>(`/admin/favorites${qs ? `?${qs}` : ''}`) as Promise<
    ApiResult<AdminFavoriteItem[]> & { total: number }
  >;
}

export function adminFavoriteDelete(id: string) {
  return adminRequest<Record<string, never>>(`/admin/favorites/${id}`, { method: 'DELETE' });
}

/** 模型 API 连接测试返回 data 结构 */
export interface AdminTestResultData {
  success: boolean;
  durationMs?: number;
  model?: string;
}

/** 测试解题模型 API 连接；可选传入 model_id 测试指定模型（如新增/编辑时的模型 ID） */
export function adminTestSolve(modelId?: string) {
  const qs = modelId?.trim() ? `?model_id=${encodeURIComponent(modelId.trim())}` : '';
  return adminRequest<AdminTestResultData>(`/admin/test/solve${qs}`);
}

/** 测试知识点识别模型 API 连接 */
export function adminTestKnowledge() {
  return adminRequest<AdminTestResultData>('/admin/test/knowledge');
}

/** 测试语义情境识别模型 API 连接 */
export function adminTestSemantic() {
  return adminRequest<AdminTestResultData>('/admin/test/semantic');
}
