import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Brain, ChevronDown, Tag, Sparkles, BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { solve, solveAnalyze, solveModels, type SolveModelOption } from '@/services/solve';
import { recordSave } from '@/services/records';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

type StepId = string;
type MessageType = 'user' | 'analyzing' | 'tags' | 'solving' | 'solution' | 'error';

interface BaseMessage {
  id: StepId;
  type: MessageType;
}

interface UserMessage extends BaseMessage {
  type: 'user';
  content: string;
}

interface AnalyzingMessage extends BaseMessage {
  type: 'analyzing';
}

interface TagsMessage extends BaseMessage {
  type: 'tags';
  knowledge_points: string[];
  semantic_contexts: string[];
}

interface SolvingMessage extends BaseMessage {
  type: 'solving';
}

interface SolutionMessage extends BaseMessage {
  type: 'solution';
  content: string;
  knowledge_points: string[];
  semantic_contexts: string[];
  /** 解题完成后已保存的记录 ID，用于「查看完整解析」直接跳转 */
  recordId?: string;
}

interface ErrorMessage extends BaseMessage {
  type: 'error';
  stage: 'analyze' | 'solve';
  message: string;
  /** 本次出错对应的题目，便于用户一键重试 */
  question: string;
}

type Message = UserMessage | AnalyzingMessage | TagsMessage | SolvingMessage | SolutionMessage | ErrorMessage;

export default function ProblemInput() {
  const [problemText, setProblemText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modelOptions, setModelOptions] = useState<SolveModelOption[]>([
    { id: 'gpt-5.2', name: 'GPT-5.2' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'deepseek-v3', name: 'DeepSeek-V3' },
  ]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  /** 与后台「解题模型管理」共用数据源：GET /api/solve/models（DB solve_models 表） */
  const fetchModels = useCallback(() => {
    solveModels()
      .then((res) => {
        if (res.errCode === 0 && Array.isArray(res.data) && res.data.length > 0) {
          setModelOptions(res.data);
          setSelectedModel((prev) => {
            const stillExists = res.data!.some((m) => m.id === prev);
            return stillExists ? prev : res.data![0].id;
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    if (modelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [modelDropdownOpen]);

  /** 打开下拉时重新拉取列表，使管理端修改后无需刷新整页即可看到最新模型 */
  const handleOpenModelDropdown = useCallback(() => {
    setModelDropdownOpen((open) => {
      if (!open) fetchModels();
      return !open;
    });
  }, [fetchModels]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const runSolve = async (question: string) => {
    const q = question.trim();
    if (!q) {
      toast('请输入题目内容');
      return;
    }
    setIsSubmitting(true);
    const idUser = `user-${Date.now()}`;
    const idAnalyzing = `analyzing-${Date.now()}`;
    const idTags = `tags-${Date.now()}`;
    const idSolving = `solving-${Date.now()}`;
    const idSolution = `solution-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: idUser, type: 'user', content: q },
      { id: idAnalyzing, type: 'analyzing' },
    ]);

    try {
      const analyzeRes = await solveAnalyze({ question: q });
      if (analyzeRes.errCode !== 0) {
        const errMsg = analyzeRes.errMsg || '识别知识点与语义情境失败';
        toast.error(errMsg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === idAnalyzing
              ? ({
                  id: `error-${Date.now()}`,
                  type: 'error' as const,
                  stage: 'analyze',
                  message: errMsg,
                  question: q,
                } as ErrorMessage)
              : m
          )
        );
        return;
      }
      const { knowledge_points = [], semantic_contexts = [] } = analyzeRes.data ?? {};
      setMessages((prev) =>
        prev.map((m) =>
          m.id === idAnalyzing
            ? ({ id: idTags, type: 'tags' as const, knowledge_points, semantic_contexts })
            : m
        )
      );

      setMessages((prev) => [...prev, { id: idSolving, type: 'solving' }]);

      const solveRes = await solve({
        question: q,
        model: selectedModel || undefined,
        knowledge_points,
        semantic_contexts,
      });
      if (solveRes.errCode !== 0) {
        const errMsg = solveRes.errMsg || '解题失败';
        toast.error(errMsg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === idSolving
              ? ({
                  id: `error-${Date.now()}`,
                  type: 'error' as const,
                  stage: 'solve',
                  message: errMsg,
                  question: q,
                } as ErrorMessage)
              : m
          )
        );
        return;
      }
      const content = solveRes.data?.content ?? '';
      if (!content) {
        const errMsg = '未返回解题内容';
        toast.error(errMsg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === idSolving
              ? ({
                  id: `error-${Date.now()}`,
                  type: 'error' as const,
                  stage: 'solve',
                  message: errMsg,
                  question: q,
                } as ErrorMessage)
              : m
          )
        );
        return;
      }
      let recordId: string | undefined;
      try {
        const saveRes = await recordSave({
          question: q,
          answer: content.slice(0, 500),
          solution: content,
          knowledge_points,
          semantic_contexts,
        });
        if (saveRes?.errCode === 0 && saveRes?.data?.id) {
          recordId = saveRes.data.id;
          toast.success('解题记录已自动保存');
        }
      } catch {
        toast.error('解题记录保存失败');
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === idSolving
            ? ({
                id: idSolution,
                type: 'solution' as const,
                content,
                knowledge_points,
                semantic_contexts,
                recordId,
              })
            : m
        )
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '请求失败';
      toast.error(errMsg);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== idAnalyzing && m.id !== idSolving),
        {
          id: `error-${Date.now()}`,
          type: 'error',
          stage: 'solve',
          message: errMsg,
          question: q,
        } as ErrorMessage,
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSolve(problemText);
  };

  const handleViewFullResult = (msg: SolutionMessage) => {
    if (msg.recordId) {
      navigate(`/problem-result/${msg.recordId}`);
      return;
    }
    const userMsg = messages.find((m) => m.type === 'user') as UserMessage | undefined;
    const question = userMsg?.content ?? '';
    if (!question) return;
    recordSave({
      question,
      answer: msg.content.slice(0, 500),
      solution: msg.content,
      knowledge_points: msg.knowledge_points,
      semantic_contexts: msg.semantic_contexts,
    })
      .then((saveRes) => {
        if (saveRes?.errCode === 0 && saveRes?.data?.id) {
          toast.success('已保存到解题记录');
          navigate(`/problem-result/${saveRes.data.id}`);
        }
      })
      .catch(() => toast.error('保存失败'));
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    setModelDropdownOpen(false);
  };

  const handleRetry = (question: string) => {
    setProblemText(question);
    void runSolve(question);
  };

  const selectedModelName = (modelOptions.find((m) => m.id === selectedModel)?.name ?? selectedModel) || '请选择模型';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-gray-100 shrink-0"
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-800">解题</h1>
            <p className="text-sm text-gray-500 truncate">输入题目后将自动识别知识点与语义情境，再调用模型解题</p>
          </div>
        </div>
        <div className="shrink-0 relative" ref={modelDropdownRef}>
          <button
            type="button"
            onClick={handleOpenModelDropdown}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 min-w-[140px] justify-between focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-expanded={modelDropdownOpen}
          >
            <Brain size={16} className="text-gray-500 shrink-0" />
            <span className="truncate">{selectedModelName}</span>
            <ChevronDown size={16} className={`text-gray-400 shrink-0 ${modelDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {modelDropdownOpen && (
            <ul className="absolute z-20 right-0 mt-1 w-48 rounded-xl border border-gray-200 bg-white shadow-lg py-1 max-h-48 overflow-auto">
              {modelOptions.map((model) => (
                <li key={model.id}>
                  <button
                    type="button"
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left ${
                      selectedModel === model.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => handleModelChange(model.id)}
                  >
                    <Brain size={14} />
                    {model.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 对话区域 */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <BookOpen size={48} className="mb-3 text-gray-300" />
            <p className="text-sm">输入数学题目，点击「开始解题」</p>
            <p className="text-xs mt-1">将依次进行：识别知识点与语义情境 → 嵌入 prompt → 解题</p>
          </div>
        )}
        {messages.map((msg) => {
          if (msg.type === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-500 text-white px-4 py-3 shadow-sm">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          }
          if (msg.type === 'analyzing') {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="flex items-center gap-3 rounded-2xl rounded-bl-md bg-white border border-gray-200 px-4 py-3 shadow-sm">
                  <Loader2 size={20} className="animate-spin text-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">正在识别知识点与语义情境</p>
                    <p className="text-xs text-gray-500">调用分析模型解析题目...</p>
                  </div>
                </div>
              </div>
            );
          }
          if (msg.type === 'tags') {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white border border-gray-200 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
                    <Tag size={16} className="text-amber-500" />
                    识别结果（将嵌入解题 prompt）
                  </div>
                  <div className="space-y-2 text-sm">
                    {msg.knowledge_points.length > 0 && (
                      <div>
                        <span className="text-gray-500">知识点：</span>
                        <span className="text-gray-800"> {msg.knowledge_points.join('、')}</span>
                      </div>
                    )}
                    {msg.semantic_contexts.length > 0 && (
                      <div>
                        <span className="text-gray-500">语义情境：</span>
                        <span className="text-gray-800"> {msg.semantic_contexts.join('、')}</span>
                      </div>
                    )}
                    {msg.knowledge_points.length === 0 && msg.semantic_contexts.length === 0 && (
                      <p className="text-gray-500">未识别到知识点或语义情境</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          if (msg.type === 'solving') {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="flex items-center gap-3 rounded-2xl rounded-bl-md bg-white border border-gray-200 px-4 py-3 shadow-sm">
                  <Loader2 size={20} className="animate-spin text-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">正在解题</p>
                    <p className="text-xs text-gray-500">将知识点与语义情境嵌入 prompt，调用 {selectedModelName} 生成解答...</p>
                  </div>
                </div>
              </div>
            );
          }
          if (msg.type === 'error') {
            const stageLabel = msg.stage === 'analyze' ? '识别阶段出错' : '解题阶段出错';
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-red-50 border border-red-200 px-4 py-3 shadow-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-red-700">{stageLabel}</p>
                      <p className="text-xs text-red-600">{msg.message}</p>
                      <button
                        type="button"
                        onClick={() => handleRetry(msg.question)}
                        className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-red-500 text-white px-3 py-1.5 text-xs font-medium hover:bg-red-600"
                      >
                        <ArrowRight size={14} />
                        重新尝试解题
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          if (msg.type === 'solution') {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[85%] w-full rounded-2xl rounded-bl-md bg-white border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                    <Sparkles size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-gray-800">解答</span>
                  </div>
                  <div className="p-4 max-h-[320px] overflow-y-auto">
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                    <button
                      type="button"
                      onClick={() => handleViewFullResult(msg)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      <BookOpen size={16} />
                      查看完整解析
                    </button>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })}
        <div ref={conversationEndRef} />
      </div>

      {/* 输入区 */}
      <div className="shrink-0 mt-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={problemText}
            onChange={(e) => setProblemText(e.target.value)}
            placeholder="输入数学题目..."
            className="flex-1 min-h-[88px] px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none text-sm"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!problemText.trim() || isSubmitting}
            className="shrink-0 self-end flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ArrowRight size={18} />
            )}
            <span>{isSubmitting ? '解题中' : '开始解题'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
