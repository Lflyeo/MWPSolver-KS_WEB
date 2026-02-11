import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { setAdminToken, clearAdminToken, adminUsersList } from '@/services/admin';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) {
      toast.error('请输入管理员密钥');
      return;
    }
    setLoading(true);
    try {
      setAdminToken(secret.trim());
      await adminUsersList({ page: 1, pageSize: 1 });
      toast.success('验证成功');
      navigate('/admin/users', { replace: true });
    } catch (err) {
      clearAdminToken();
      setSecret('');
      toast.error(err instanceof Error ? err.message : '验证失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-600 mb-3">
              <Shield size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800">管理员登录</h1>
            <p className="text-slate-500 text-sm mt-1">请输入管理员密钥</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-secret" className="block text-sm font-medium text-slate-700 mb-1.5">
                密钥
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="admin-secret"
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="ADMIN_SECRET"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  autoComplete="off"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? '验证中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
