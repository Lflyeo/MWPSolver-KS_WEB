import { useEffect, useState, useCallback } from 'react';
import { Search, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { adminRecordsList, adminRecordDelete, type AdminRecordItem } from '@/services/admin';
import { AdminRecordResultModal } from './AdminRecordResultModal';

export default function AdminRecords() {
  const [list, setList] = useState<AdminRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewId, setViewId] = useState<string | null>(null);

  const fetchList = useCallback(
    (p: number) => {
      setLoading(true);
      adminRecordsList({ page: p, pageSize, keyword: keyword || undefined, user_id: userId || undefined })
        .then((res) => {
          setList(res.data || []);
          setTotal((res as { total?: number }).total ?? 0);
        })
        .catch((err) => toast.error(err?.message || '加载失败'))
        .finally(() => setLoading(false));
    },
    [keyword, pageSize, userId],
  );

  useEffect(() => {
    fetchList(page);
  }, [fetchList, page]);

  // 搜索条件变化时自动重置到第 1 页并触发请求，行为与用户端一致
  useEffect(() => {
    setPage(1);
  }, [keyword, userId]);

  const handleDelete = (r: AdminRecordItem) => {
    if (!window.confirm(`确定删除该解题记录？\n用户：${r.username ?? '-'}\n题目：${r.question.slice(0, 40)}...`)) return;
    adminRecordDelete(r.id)
      .then(() => {
        toast.success('已删除解题记录');
        fetchList(page);
      })
      .catch((err) => toast.error(err?.message || '删除失败'));
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">解题记录管理</h1>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="按题目或用户名关键字搜索"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="按用户ID过滤（可选）"
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm min-w-[200px]"
          />
        </div>
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">加载中...</div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-slate-500">暂无解题记录</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-700 w-16">序号</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">题目</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">用户</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">解题时间</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r, idx) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-500 text-sm">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className="line-clamp-2">{r.question}</div>
                    </td>
                    <td className="py-3 px-4">
                      {r.username || r.nickname ? (
                        <>
                          <span>{r.username}</span>
                          {r.nickname && <span className="text-slate-400 text-xs ml-1">（{r.nickname}）</span>}
                        </>
                      ) : (
                        <span className="text-slate-400">匿名/已删除</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setViewId(r.id)}
                        className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1 mr-1"
                        title="查看解题结果"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                        title="删除解题记录"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
          <span>共 {total} 条</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded border border-slate-200 disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-2 py-1">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded border border-slate-200 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
      <AdminRecordResultModal open={!!viewId} recordId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}

