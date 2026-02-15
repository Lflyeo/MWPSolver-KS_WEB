import { useState } from 'react';
import { Wifi, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { BASE_URL } from '@/lib/api';

type TestStatus = 'idle' | 'running' | 'success' | 'fail';

interface TestResult {
  status: TestStatus;
  message: string;
  durationMs?: number;
  detail?: string;
}

export default function AdminTest() {
  const [apiTest, setApiTest] = useState<TestResult>({ status: 'idle', message: '' });

  const testApiLink = async () => {
    setApiTest({ status: 'running', message: '正在请求后端健康检查...' });
    const start = Date.now();
    try {
      const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/health`, { method: 'GET' });
      const durationMs = Date.now() - start;
      const text = await res.text();
      let detail = text;
      try {
        const json = JSON.parse(text) as { status?: string };
        detail = json.status ?? text;
      } catch {
        // keep raw text
      }
      if (res.ok) {
        setApiTest({
          status: 'success',
          message: '后端服务连接正常',
          durationMs,
          detail: `响应: ${detail}`,
        });
      } else {
        setApiTest({
          status: 'fail',
          message: `请求失败 (HTTP ${res.status})`,
          durationMs,
          detail: text.slice(0, 200),
        });
      }
    } catch (err) {
      const durationMs = Date.now() - start;
      setApiTest({
        status: 'fail',
        message: err instanceof Error ? err.message : '网络错误',
        durationMs,
        detail: '请检查后端服务是否启动、地址是否正确，以及是否存在 CORS 限制。',
      });
    }
  };

  const isRunning = apiTest.status === 'running';
  const isSuccess = apiTest.status === 'success';

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-2">连接测试</h1>
      <p className="text-sm text-slate-500 mb-6">
        当前 API 地址：<code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{BASE_URL || '(未配置)'}</code>
      </p>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Wifi size={18} className="text-blue-500" />
          <div>
            <div className="text-sm font-medium text-slate-800">后端服务连接测试</div>
            <div className="text-xs text-slate-500 mt-0.5">检测本后端是否可访问（GET /health）</div>
          </div>
        </div>
        <div className="p-4">
          <button
            type="button"
            onClick={testApiLink}
            disabled={isRunning}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                测试中...
              </>
            ) : (
              '测试后端连接'
            )}
          </button>
          {apiTest.status !== 'idle' && (
            <div
              className={`mt-3 p-3 rounded-lg border text-sm ${
                isRunning
                  ? 'border-slate-200 bg-slate-50'
                  : isSuccess
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {isRunning && <Loader2 size={16} className="animate-spin shrink-0" />}
                {!isRunning && (isSuccess ? <CheckCircle size={16} className="shrink-0" /> : <XCircle size={16} className="shrink-0" />)}
                <span className="font-medium">{apiTest.message}</span>
                {apiTest.durationMs != null && <span className="text-slate-500">（{apiTest.durationMs} ms）</span>}
              </div>
              {apiTest.detail && <p className="mt-1.5 text-xs opacity-90 break-words">{apiTest.detail}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
