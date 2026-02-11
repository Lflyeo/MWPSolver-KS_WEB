import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Heart, Share2, Copy, ArrowLeft } from 'lucide-react';
import { recordDetail, mapDetailToProblemDetail } from '@/services/records';
import { favoriteCheck, favoriteAdd, favoriteRemove } from '@/services/favorites';
import type { ProblemDetail } from '@/types/problem';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function ProblemResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    recordDetail(id)
      .then((res) => {
        if (res.errCode === 0 && res.data) {
          setDetail(mapDetailToProblemDetail(res.data));
        } else {
          setDetail(null);
        }
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    favoriteCheck(id)
      .then((res) => {
        if (res.errCode === 0 && res.data) {
          setIsFavorite(res.data.is_favorited);
        }
      })
      .catch(() => {});
  }, [id]);

  const handleCopy = () => {
    if (!detail) return;
    const knowledge = knowledgeTags.map((t) => t.name).filter(Boolean);
    const contexts = contextTags.map((t) => t.name).filter(Boolean);
    const tagLines: string[] = [];
    if (knowledge.length > 0) tagLines.push(`知识点：${knowledge.join('、')}`);
    if (contexts.length > 0) tagLines.push(`语义情境：${contexts.join('、')}`);
    const tagBlock = tagLines.length > 0 ? `${tagLines.join('\n')}\n\n` : '';
    const solutionText = markdownToPlainText(detail.solutionMarkdown || detail.solutionSteps.join('\n\n'));
    const textToCopy = `${detail.question}\n\n${tagBlock}${solutionText}`;
    navigator.clipboard.writeText(textToCopy);
    toast.success('已复制到剪贴板');
  };

  const markdownToPlainText = (md: string) => {
    // 加强版：在去掉 Markdown 语法的同时，对常见 LaTeX 公式做可读化处理
    let text = (md || '')
      .replace(/\r\n/g, '\n')
      .replace(/```[\s\S]*?```/g, (m) => {
        // 代码块转为缩进文本
        const body = m.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').trimEnd();
        return '\n' + body.split('\n').map((l) => (l ? `    ${l}` : '')).join('\n') + '\n';
      })
      .replace(/^\s*---+\s*$/gm, '')
      .replace(/^(#{1,6})\s+/gm, '') // 标题去掉 #
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/^\s*(\d+)\.\s+/gm, '$1) ')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      // 先保留行内/块级数学内容，后面再对公式做进一步转换
      .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
      .replace(/\\\[([\s\S]*?)\\\]/g, '\n$1\n');

    // LaTeX 可读化：\text{...} -> ...；\frac{a}{b} -> (a/b)
    text = text
      .replace(/\\text\{([\s\S]*?)\}/g, '$1')
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1/$2)');

    return text
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const handleShare = () => {
    toast('分享功能暂未实现');
  };

  const handleFavorite = () => {
    if (!id) return;
    if (isFavorite) {
      favoriteRemove(id)
        .then((res) => {
          if (res.errCode === 0) {
            setIsFavorite(false);
            toast.success('已取消收藏');
          } else toast.error(res.errMsg || '取消失败');
        })
        .catch(() => toast.error('取消失败'));
    } else {
      favoriteAdd(id)
        .then((res) => {
          if (res.errCode === 0) {
            setIsFavorite(true);
            toast.success('已添加到收藏');
          } else toast.error(res.errMsg || '添加失败');
        })
        .catch(() => toast.error('添加失败'));
    }
  };

  if (loading || !detail) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <header className="shrink-0 flex items-center gap-3 pb-4">
          <button
            type="button"
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">解题结果</h1>
            <p className="text-sm text-gray-500">查看题目与解题过程</p>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-40 animate-pulse" />
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-32 animate-pulse" />
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-24 animate-pulse" />
              </div>
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[360px] animate-pulse" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-500">
              记录不存在或加载失败
            </div>
          )}
        </div>
      </div>
    );
  }

  const knowledgeTags = detail.tags.filter((t) => t.type === 'knowledge');
  const contextTags = detail.tags.filter((t) => t.type === 'context');

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 固定：页头（左侧标题，右上角收藏/分享/复制） */}
      <header className="shrink-0 flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-800">解题结果</h1>
            <p className="text-sm text-gray-500">查看题目与解题过程</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className={`p-2.5 rounded-xl flex items-center gap-1.5 text-sm font-medium transition-colors ${
              isFavorite
                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={handleFavorite}
            title={isFavorite ? '取消收藏' : '收藏'}
            aria-label={isFavorite ? '取消收藏' : '收藏'}
          >
            <Heart size={18} className={isFavorite ? 'fill-amber-500' : ''} />
            <span className="hidden sm:inline">{isFavorite ? '已收藏' : '收藏'}</span>
          </button>
          <button
            type="button"
            className="p-2.5 rounded-xl flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={handleShare}
            title="分享"
            aria-label="分享"
          >
            <Share2 size={18} />
            <span className="hidden sm:inline">分享</span>
          </button>
          <button
            type="button"
            className="p-2.5 rounded-xl flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={handleCopy}
            title="复制题目与解答"
            aria-label="复制"
          >
            <Copy size={18} />
            <span className="hidden sm:inline">复制</span>
          </button>
        </div>
      </header>

      {/* 可滚动：主内容区 */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pb-6">
          {/* 左侧：题目、标签、操作（大屏吸顶） */}
          <aside className="lg:col-span-1 flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start">
            {/* 题目卡片 */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/80">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">题目</h2>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  {detail.question}
                </p>
                {(knowledgeTags.length > 0 || contextTags.length > 0) && (
                  <div className="space-y-3">
                    {knowledgeTags.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">知识点</p>
                        <div className="flex flex-wrap gap-2">
                          {knowledgeTags.map((tag, index) => (
                            <span
                              key={index}
                              className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {contextTags.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">语义情境</p>
                        <div className="flex flex-wrap gap-2">
                          {contextTags.map((tag, index) => (
                            <span
                              key={index}
                              className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </aside>

          {/* 右侧：解题过程（主内容） */}
          <main className="lg:col-span-2 min-w-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[320px]">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-blue-500">📝</span>
                  解题过程
                </h2>
              </div>
              <div className="p-6 md:p-8">
                <div className="prose prose-slate max-w-none prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:rounded-xl prose-pre:p-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {detail.solutionMarkdown || detail.solutionSteps.join('\n\n')}
                  </ReactMarkdown>
                </div>
                {detail.finalAnswer && (
                  <div className="mt-8 pt-6 border-t border-gray-200 rounded-xl bg-emerald-50/60 border border-emerald-100 p-5">
                    <h3 className="text-sm font-bold text-emerald-800 mb-2 uppercase tracking-wide">答案</h3>
                    <p className="text-gray-800 leading-relaxed">{detail.finalAnswer}</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
