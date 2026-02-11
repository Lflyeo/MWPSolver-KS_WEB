import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Edit, History, Heart, HelpCircle, MessageCircle, LogOut, ChevronRight, X, Upload, Image as ImageIcon } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { toast } from 'sonner';
import { recordsList } from '@/services/records';
import { favoritesList } from '@/services/favorites';
import { updateProfile, getStoredToken, setStoredAuth, uploadAvatar } from '@/services/auth';
import { getAssetUrl } from '@/lib/api';
import type { UserInfo } from '@/types/problem';

const DEFAULT_AVATAR = '';

const defaultUser: UserInfo = {
  name: '',
  avatar: DEFAULT_AVATAR,
  daysOfLearning: 0,
  stats: { problemCount: 0, favoriteCount: 0 },
};

export default function MyPage() {
  const { user: authUser, logout, setUser } = useContext(AuthContext);
  const [userInfo, setUserInfo] = useState<UserInfo>(defaultUser);
  const [editOpen, setEditOpen] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const displayName = authUser?.nickname?.trim() || authUser?.username || userInfo.name || '未设置昵称';
  const displayAvatar = authUser?.avatar_url?.trim() || userInfo.avatar || DEFAULT_AVATAR;
  const displayAvatarFull = getAssetUrl(displayAvatar) || DEFAULT_AVATAR;

  const openEdit = useCallback(() => {
    setEditNickname(authUser?.nickname?.trim() ?? authUser?.username ?? '');
    setEditAvatarUrl(authUser?.avatar_url?.trim() ?? '');
    setEditOpen(true);
  }, [authUser]);

  useEffect(() => {
    Promise.all([
      recordsList({ page: 1, pageSize: 1 }),
      favoritesList({ page: 1, pageSize: 1 }),
    ]).then(([recordsRes, favoritesRes]) => {
      const problemTotal = (recordsRes as { total?: number }).total ?? 0;
      const favoriteTotal = (favoritesRes as { total?: number }).total ?? 0;
      setUserInfo((prev) => ({
        ...prev,
        stats: { problemCount: problemTotal, favoriteCount: favoriteTotal },
      }));
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const data = await updateProfile({
        nickname: editNickname.trim() || undefined,
        avatar_url: editAvatarUrl.trim() || undefined,
      });
      const token = getStoredToken();
      if (token) {
        setStoredAuth(token, { id: data.id, username: data.username, nickname: data.nickname ?? undefined, avatar_url: data.avatar_url ?? undefined });
      }
      setUser({ id: data.id, username: data.username, nickname: data.nickname ?? undefined, avatar_url: data.avatar_url ?? undefined });
      toast.success('资料已更新');
      setEditOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (!window.confirm('确定要退出登录吗？')) return;
    logout();
    toast.success('已成功退出登录');
  };

  const menuItemClass = 'flex items-center justify-between w-full px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left';
  const menuIconWrap = 'w-10 h-10 rounded-xl flex items-center justify-center shrink-0';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="space-y-4 pb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 bg-gray-100">
                <img
                  src={displayAvatarFull}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                />
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <h2 className="text-lg font-bold text-gray-800">{displayName}</h2>
                  <button
                    type="button"
                    onClick={openEdit}
                    className="inline-flex items-center justify-center text-blue-500 hover:text-blue-600 text-sm font-medium"
                  >
                    <Edit size={16} className="mr-1.5 shrink-0" />
                    编辑资料
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">学习的第 {userInfo.daysOfLearning} 天</p>
              </div>
            </div>
          </div>

          {editOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !saving && setEditOpen(false)}>
              <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800">编辑资料</h3>
                  <button type="button" className="p-2 rounded-lg hover:bg-gray-100" onClick={() => !saving && setEditOpen(false)} aria-label="关闭">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">昵称</label>
                    <input
                      type="text"
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      placeholder="请输入昵称（留空则显示用户名）"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                      maxLength={64}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">头像</label>
                    <div className="flex items-center gap-3">
                      {editAvatarUrl.trim() || displayAvatarFull ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                          <img
                            src={editAvatarUrl.trim() ? getAssetUrl(editAvatarUrl) : displayAvatarFull}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                          <ImageIcon size={18} />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error('图片不能超过 2MB');
                              return;
                            }
                            setUploading(true);
                            try {
                              const url = await uploadAvatar(file);
                              setEditAvatarUrl(url);
                              toast.success('头像上传成功');
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : '上传失败');
                            } finally {
                              setUploading(false);
                              e.target.value = '';
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={uploading}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-xs font-medium"
                        >
                          {uploading ? '上传中...' : (
                            <>
                              <Upload size={14} />
                              上传图片
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500">支持 JPG、PNG、GIF、WebP，不超过 2MB</p>
                        <input
                          type="url"
                          value={editAvatarUrl}
                          onChange={(e) => setEditAvatarUrl(e.target.value)}
                          placeholder="头像 URL（可手动填写）"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 px-5 pb-5">
                  <button type="button" onClick={() => !saving && setEditOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">取消</button>
                  <button type="button" onClick={handleSaveProfile} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <Link to="/problem-records" className={`${menuItemClass} border-b border-gray-100`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`${menuIconWrap} bg-blue-50`}><History className="text-blue-600" size={20} /></div>
                <span className="font-medium text-gray-800">解题记录</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-gray-500">{userInfo.stats?.problemCount ?? 0}</span>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </Link>
            <Link to="/my-favorites" className={`${menuItemClass} border-b border-gray-100`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`${menuIconWrap} bg-amber-50`}><Heart className="text-amber-600" size={20} /></div>
                <span className="font-medium text-gray-800">我的收藏</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-gray-500">{userInfo.stats?.favoriteCount ?? 0}</span>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </Link>
            <button type="button" className={`${menuItemClass} border-b border-gray-100 w-full`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`${menuIconWrap} bg-violet-50`}><HelpCircle className="text-violet-600" size={20} /></div>
                <span className="font-medium text-gray-800">常见问题</span>
              </div>
              <ChevronRight size={18} className="text-gray-400 shrink-0" />
            </button>
            <button type="button" className={`${menuItemClass} border-b border-gray-100 w-full`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`${menuIconWrap} bg-emerald-50`}><MessageCircle className="text-emerald-600" size={20} /></div>
                <span className="font-medium text-gray-800">联系客服</span>
              </div>
              <ChevronRight size={18} className="text-gray-400 shrink-0" />
            </button>
            <button type="button" className={`${menuItemClass} text-red-600 w-full`} onClick={handleLogout}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`${menuIconWrap} bg-red-50`}><LogOut className="text-red-500" size={20} /></div>
                <span className="font-medium">退出登录</span>
              </div>
              <ChevronRight size={18} className="text-red-300 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
