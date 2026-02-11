import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Home, History, Heart, User, LogIn, UserPlus, PenTool } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';

export function Layout() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 - 固定在顶部 */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                MWPSolver-KS
              </Link>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link to="/" className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors" title="首页">
                <Home size={20} />
              </Link>
              <Link to="/problem-input" className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors" title="解题">
                <PenTool size={20} />
              </Link>
              <Link to="/problem-records" className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors" title="解题记录">
                <History size={20} />
              </Link>
              <Link to="/my-favorites" className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors" title="我的收藏">
                <Heart size={20} />
              </Link>
              {isAuthenticated ? (
                <Link to="/mypage" className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors" title="我的">
                  <User size={20} />
                </Link>
              ) : (
                <>
                  <Link to="/login" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors text-sm">
                    <LogIn size={18} />
                    <span className="hidden sm:inline">登录</span>
                  </Link>
                  <Link to="/register" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm">
                    <UserPlus size={18} />
                    <span className="hidden sm:inline">注册</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域：固定高度 = 视口减去顶栏，内部由各页面自行滚动 */}
      <main className="max-w-7xl mx-auto pt-20 px-4 sm:px-6 lg:px-8 flex flex-col h-[calc(100vh-1rem)]">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}