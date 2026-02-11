import { apiGet, apiPost, apiPatch, BASE_URL } from '@/lib/api';

const TOKEN_KEY = 'mathpro_token';
const USER_KEY = 'mathpro_user';

export interface AuthUser {
  id: string;
  username: string;
  nickname?: string | null;
  avatar_url?: string | null;
}

export interface LoginResData {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function login(username: string, password: string): Promise<LoginResData> {
  const res = await apiPost<LoginResData>('/auth/login', { username, password });
  if (res.errCode !== 0 || !res.data?.access_token) {
    throw new Error(res.errMsg || '登录失败');
  }
  return res.data;
}

export async function register(username: string, password: string): Promise<LoginResData> {
  const res = await apiPost<LoginResData>('/auth/register', { username, password });
  if (res.errCode !== 0 || !res.data?.access_token) {
    throw new Error(res.errMsg || '注册失败');
  }
  return res.data;
}

export interface ProfileData {
  id: string;
  username: string;
  nickname?: string | null;
  avatar_url?: string | null;
}

export async function getProfile(): Promise<ProfileData> {
  const res = await apiGet<ProfileData>('/auth/profile');
  if (res.errCode !== 0 || !res.data) {
    throw new Error(res.errMsg || '获取资料失败');
  }
  return res.data;
}

export async function updateProfile(body: { nickname?: string; avatar_url?: string }): Promise<ProfileData> {
  const res = await apiPatch<ProfileData>('/auth/profile', body);
  if (res.errCode !== 0 || !res.data) {
    throw new Error(res.errMsg || '更新资料失败');
  }
  return res.data;
}

/** 上传头像图片，返回可用的 avatar_url（相对路径，存库或展示时需用 getAssetUrl 转成完整 URL） */
export async function uploadAvatar(file: File): Promise<string> {
  const token = localStorage.getItem(TOKEN_KEY);
  const formData = new FormData();
  formData.append('file', file);
  const url = `${BASE_URL}/api/auth/avatar/upload`;
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', body: formData, headers });
  const json = (await res.json()) as { errCode: number; errMsg: string; data?: { url?: string } };
  if (!res.ok || json.errCode !== 0 || !json.data?.url) {
    throw new Error(json.errMsg || '上传失败');
  }
  return json.data.url;
}
