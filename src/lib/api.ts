/**
 * 后端 API 基础配置与请求封装
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const API_PREFIX = '/api';

export function getApiUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = `${BASE_URL}${API_PREFIX}${path}`;
  if (!params) return url;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.set(k, String(v));
  });
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

export interface ApiResult<T = unknown> {
  errCode: number;
  errMsg: string;
  data: T;
}

const AUTH_TOKEN_KEY = 'mathpro_token';

async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as HeadersInit),
  };
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    ...options,
    headers,
  });
  const json = (await res.json()) as ApiResult<T>;
  if (!res.ok) {
    throw new Error(json.errMsg || res.statusText || '请求失败');
  }
  return json;
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<ApiResult<T>> {
  const url = getApiUrl(path.startsWith('/') ? path : `/${path}`, params);
  return request<T>(url, { method: 'GET' });
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const url = path.startsWith(API_PREFIX) ? `${BASE_URL}${path}` : `${BASE_URL}${API_PREFIX}${path}`;
  return request<T>(url, { method: 'POST', body: JSON.stringify(body) });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const url = path.startsWith(API_PREFIX) ? `${BASE_URL}${path}` : `${BASE_URL}${API_PREFIX}${path}`;
  return request<T>(url, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function apiDelete<T>(path: string, params?: Record<string, string | number | undefined>): Promise<ApiResult<T>> {
  const url = getApiUrl(path.startsWith('/') ? path : `/${path}`, params);
  return request<T>(url, { method: 'DELETE' });
}

/** 将相对路径转为完整 URL（用于头像等静态资源） */
export function getAssetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

export { BASE_URL };
