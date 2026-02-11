import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ProblemCard } from '@/components/ProblemCard';
import { recordsList, mapRecordToHistory } from '@/services/records';
import type { ProblemHistory } from '@/types/problem';

export default function Home() {
  const [recentProblems, setRecentProblems] = useState<ProblemHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    recordsList({ page: 1, pageSize: 6 })
      .then((res) => {
        if (!cancelled && res.errCode === 0 && Array.isArray(res.data)) {
          setRecentProblems(res.data.map(mapRecordToHistory));
        }
      })
      .catch(() => { if (!cancelled) setRecentProblems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-12">
      {/* Hero区域 - 突出MWPSolver-KS特点 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 md:p-12 shadow-sm border border-blue-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              MWPSolver-KS
            </h1>
            <h2 className="text-xl md:text-2xl text-blue-600 font-medium mb-6">
              增强型LLMs驱动数学应用题求解系统
            </h2>
            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              通过知识点标注和语义情境分析，提升数学应用题的理解和解决能力，为学习提供更智能、更精准的辅导。
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/problem-input" 
                className="px-12 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-md hover:bg-blue-700 transition-colors flex items-center"
              >
                <span className="mr-2">开始解题</span>
                <i className="fa-solid fa-arrow-right"></i>
              </Link>
              {/* <Link 
                to="#features" 
                className="px-6 py-3 bg-white text-blue-600 border border-blue-200 rounded-xl font-medium shadow-sm hover:bg-blue-50 transition-colors"
              >
                了解更多
              </Link> */}
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative w-full h-64 md:h-80">
              <div className="absolute inset-0 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                {/* 背景光晕 */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-70" />
                <div className="absolute -bottom-12 -left-8 w-44 h-44 bg-indigo-100 rounded-full blur-3xl opacity-70" />

                <div className="relative z-10 h-full p-5 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                      智能解题流程
                    </p>
                    <p className="text-sm text-gray-500">
                      从「题目 → 知识点 → 情境 → 解答」的完整 AI 工作流动态演示。
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {/* 步骤 1 */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className="absolute inline-flex h-4 w-4 rounded-full bg-blue-400 opacity-50 animate-ping" />
                        <span className="relative inline-flex h-4 w-4 rounded-full bg-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">知识点识别</p>
                        <p className="text-xs text-gray-500">
                          自动标注题目涉及的代数、几何、概率等核心知识点。
                        </p>
                      </div>
                    </div>

                    {/* 连接线 */}
                    <div className="ml-2 h-6 w-[2px] bg-gradient-to-b from-blue-400/60 to-violet-400/0 animate-pulse" />

                    {/* 步骤 2 */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className="absolute inline-flex h-4 w-4 rounded-full bg-violet-400 opacity-50 animate-ping" />
                        <span className="relative inline-flex h-4 w-4 rounded-full bg-violet-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">语义情境分析</p>
                        <p className="text-xs text-gray-500">
                          识别鸡兔同笼、工程、相遇等应用场景，理解题目语境。
                        </p>
                      </div>
                    </div>

                    {/* 连接线 */}
                    <div className="ml-2 h-6 w-[2px] bg-gradient-to-b from-violet-400/60 to-emerald-400/0 animate-pulse" />

                    {/* 步骤 3 */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className="absolute inline-flex h-4 w-4 rounded-full bg-emerald-400 opacity-50 animate-ping" />
                        <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">逐步解题与讲解</p>
                        <p className="text-xs text-gray-500">
                          结合知识点与情境，给出结构化步骤、推导过程和最终答案。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 动态进度条 */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>工作流执行中</span>
                      <span>实时优化解题路径</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 特点介绍 */}
      <div id="features" className="space-y-12">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">核心特点</h2>
          <p className="text-gray-600">
            MWPSolver-KS 通过创新的知识点标注和语义情境分析，提高大模型求解数学应用题的性能
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 知识点特点 */}
          <div className="bg-white rounded-xl p-8 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <i className="fa-solid fa-lightbulb text-2xl text-blue-600"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">知识点标注</h3>
            <p className="text-gray-600 mb-4">
              通过专用模型自动识别并标注题目中涉及的数学知识点，帮助学生理解题目背后的数学概念和原理。
            </p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <i className="fa-solid fa-check text-green-500 mt-1 mr-2"></i>
                <span className="text-gray-600">自动识别数学概念</span>
              </li>
              <li className="flex items-start">
                <i className="fa-solid fa-check text-green-500 mt-1 mr-2"></i>
                <span className="text-gray-600">建立知识点之间的关联网络</span>
              </li>
              <li className="flex items-start">
                <i className="fa-solid fa-check text-green-500 mt-1 mr-2"></i>
                <span className="text-gray-600">针对性强化薄弱环节</span>
              </li>
            </ul>
          </div>

          {/* 语义情境特点 */}
          <div className="bg-white rounded-xl p-8 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <i className="fa-solid fa-brain text-2xl text-orange-500"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">语义情境分析</h3>
            <p className="text-gray-600 mb-4">
              利用专用模型深入理解题目中的语义情境，将实际问题与数学模型建立准确联系，提高解题的准确性。
            </p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <i className="fa-solid fa-check text-green-500 mt-1 mr-2"></i>
                <span className="text-gray-600">解析自然语言中的数学关系</span>
              </li>
              <li className="flex items-start">
                <i className="fa-solid fa-check text-green-500 mt-1 mr-2"></i>
                <span className="text-gray-600">识别不同场景下的数学应用</span>
              </li>
              <li className="flex items-start">
                <i className="fa-solid fa-check text-green-500 mt-1 mr-2"></i>
                <span className="text-gray-600">提升跨情境问题解决能力</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 快速操作区 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-400 to-blue-500 text-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold mb-2">输入题目</h3>
          <p className="text-sm mb-4 opacity-90">输入您的数学问题，获取详细解答</p>
          <Link 
            to="/problem-input" 
            className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
          >
            立即开始
          </Link>
        </div>
        
        <div className="bg-gradient-to-br from-purple-400 to-purple-500 text-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold mb-2">解题记录</h3>
          <p className="text-sm mb-4 opacity-90">查看您之前解决过的题目</p>
          <Link 
            to="/problem-records" 
            className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
          >
            查看记录
          </Link>
        </div>
        
        <div className="bg-gradient-to-br from-amber-400 to-amber-500 text-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold mb-2">我的收藏</h3>
          <p className="text-sm mb-4 opacity-90">访问您收藏的重点题目</p>
          <Link 
            to="/my-favorites" 
            className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
          >
            查看收藏
          </Link>
        </div>
      </div>
      
      {/* 最近解题历史 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">最近解题</h2>
          <Link 
            to="/problem-records" 
            className="text-blue-500 hover:text-blue-600 text-sm"
          >
            查看全部
          </Link>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-md border border-gray-100 p-5 animate-pulse h-40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentProblems.length > 0 ? recentProblems.map((problem) => (
              <ProblemCard key={String(problem.id)} problem={problem} />
            )) : (
              <div className="col-span-2 bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
                暂无解题记录，<Link to="/problem-input" className="text-blue-500 hover:text-blue-600">去解题</Link>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
