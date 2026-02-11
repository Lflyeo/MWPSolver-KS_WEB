import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Heart } from 'lucide-react';
import { favoritesList, favoriteRemove, mapFavoriteToHistory } from '@/services/favorites';
import type { ProblemHistory } from '@/types/problem';
import { toast } from 'sonner';

export default function MyFavorites() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [list, setList] = useState<ProblemHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(() => {
    setLoading(true);
    favoritesList({ page: 1, pageSize: 50, keyword: searchTerm || undefined })
      .then((res) => {
        if (res.errCode === 0 && Array.isArray(res.data)) {
          setList(res.data.map(mapFavoriteToHistory));
        }
      })
      .catch(() => {
        setList([]);
        toast.error('加载收藏失败');
      })
      .finally(() => setLoading(false));
  }, [searchTerm]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleRemoveFavorite = (recordId: string | number) => {
    if (!window.confirm('确定要取消收藏这道题目吗？')) return;
    favoriteRemove(String(recordId))
      .then((res) => {
        if (res.errCode === 0) {
          toast.success('已取消收藏');
          fetchList();
        } else {
          toast.error(res.errMsg || '取消失败');
        }
      })
      .catch(() => toast.error('取消失败'));
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 flex items-center gap-3 pb-4">
        <button type="button" className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors" onClick={() => navigate(-1)} aria-label="返回">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">我的收藏</h1>
          <p className="text-sm text-gray-500">管理您收藏的题目</p>
        </div>
      </header>
      <div className="shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="搜索收藏..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-shadow" />
        </div>
      </div>
      <div className="shrink-0 flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-800">收藏题目</h2>
        {list.length > 0 && <span className="text-sm text-gray-500">共 {list.length} 条</span>}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse h-44" />)}
          </div>
        ) : list.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
            {list.map((problem) => (
              <div key={String(problem.id)} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-base font-medium text-gray-800 line-clamp-3 flex-1 pr-2">
                      {problem.question}
                    </h3>
                    <button
                      type="button"
                      className="text-amber-500 shrink-0 p-1 rounded-full hover:bg-amber-50 transition-colors"
                      onClick={() => handleRemoveFavorite(problem.id)}
                      title="取消收藏"
                      aria-label="取消收藏"
                    >
                      <Heart size={18} className="fill-current" />
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 mb-4 line-clamp-2"><span className="font-medium">答案:</span> {problem.answerSummary}</div>
                  <div className="mb-4">
                    {problem.tags.filter(tag => tag.type === 'knowledge').length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-500 mr-1">知识点:</span>
                        {problem.tags.filter(tag => tag.type === 'knowledge').map((tag, tagIndex) => (
                          <span key={tagIndex} className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">{tag.name}</span>
                        ))}
                      </div>
                    )}
                    {problem.tags.filter(tag => tag.type === 'context').length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-medium text-gray-500 mr-1">语义情境:</span>
                        {problem.tags.filter(tag => tag.type === 'context').map((tag, tagIndex) => (
                          <span key={tagIndex} className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">{tag.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-400 space-y-0.5">
                      {problem.favoriteTime && <p>收藏: {problem.favoriteTime}</p>}
                      {problem.timestamp && <p>{problem.timestamp}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/problem-result/${problem.id}`}
                        className="text-blue-500 hover:text-blue-600 text-sm font-medium transition-colors"
                      >
                        查看详情
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-gray-500">暂无收藏题目</p>
            <Link to="/problem-input" className="mt-4 inline-flex items-center text-blue-500 hover:text-blue-600 font-medium transition-colors">立即开始解题</Link>
          </div>
        )}
      </div>
    </div>
  );
}
