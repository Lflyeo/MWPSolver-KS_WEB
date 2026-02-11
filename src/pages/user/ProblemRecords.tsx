import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Trash2, Filter, ArrowLeft } from 'lucide-react';
import { recordsList, recordRemove, mapRecordToHistory } from '@/services/records';
import type { ProblemHistory } from '@/types/problem';
import { toast } from 'sonner';

export default function ProblemRecords() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [list, setList] = useState<ProblemHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const categories = ['全部', '代数', '几何', '算术'];

  const fetchList = useCallback(() => {
    setLoading(true);
    recordsList({ page: 1, pageSize: 20, keyword: searchTerm || undefined, category: selectedCategory === '全部' ? undefined : selectedCategory })
      .then((res) => {
        if (res.errCode === 0 && Array.isArray(res.data)) {
          setList(res.data.map(mapRecordToHistory));
          setTotal((res as { total?: number }).total ?? res.data.length);
        }
      })
      .catch(() => { setList([]); setTotal(0); toast.error('加载解题记录失败'); })
      .finally(() => setLoading(false));
  }, [searchTerm, selectedCategory]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleRemove = (id: string | number) => {
    if (!window.confirm('确定要删除这条解题记录吗？')) return;
    recordRemove(String(id))
      .then((res) => {
        if (res.errCode === 0) { toast.success('已删除'); fetchList(); }
        else toast.error(res.errMsg || '删除失败');
      })
      .catch(() => toast.error('删除失败'));
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 flex items-center gap-3 pb-4">
        <button type="button" className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors" onClick={() => navigate(-1)} aria-label="返回">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">解题记录</h1>
          <p className="text-sm text-gray-500">查看和管理您的解题历史</p>
        </div>
      </header>
      <div className="shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="搜索题目..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-shadow" />
          </div>
          <div className="relative">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full md:w-auto appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-gray-700">
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          </div>
        </div>
      </div>
      <div className="shrink-0 flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-800">最近记录</h2>
        {list.length > 0 && <span className="text-sm text-gray-500">共 {total} 条</span>}
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
                      className="text-red-500 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                      onClick={() => handleRemove(problem.id)}
                      title="删除记录"
                      aria-label="删除记录"
                    >
                      <Trash2 size={18} />
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
                    <p className="text-xs text-gray-400">{problem.timestamp}</p>
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
            <p className="text-gray-500">暂无解题记录</p>
            <Link to="/problem-input" className="mt-4 inline-flex items-center text-blue-500 hover:text-blue-600 font-medium transition-colors">立即开始解题</Link>
          </div>
        )}
      </div>
    </div>
  );
}
