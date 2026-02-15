import { useState, useEffect } from 'react';
import { KeyRound, Link2, Wifi, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminUniapiConfigGet,
  adminUniapiConfigUpdate,
  adminTestSemantic,
  type AdminUniapiConfig,
} from '@/services/admin';

export default function AdminSemanticModels() {
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configTest, setConfigTest] = useState<'idle' | 'running' | 'ok' | 'fail'>('idle');
  const [configTestMsg, setConfigTestMsg] = useState('');
  const [semanticSaving, setSemanticSaving] = useState(false);
  const [configBaseUrl, setConfigBaseUrl] = useState('');
  const [configToken, setConfigToken] = useState('');
  const [configModelSemantic, setConfigModelSemantic] = useState('');

  const loadConfig = () => {
    setConfigLoading(true);
    adminUniapiConfigGet()
      .then((res) => {
        const data = res.data as AdminUniapiConfig | null;
        setConfigBaseUrl(data?.base_url_semantic ?? data?.base_url ?? '');
        setConfigToken(data?.token_semantic ?? data?.token ?? '');
        setConfigModelSemantic(data?.model_semantic ?? '');
      })
      .catch((err) => toast.error(err?.message || '加载配置失败'))
      .finally(() => setConfigLoading(false));
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveApi = async () => {
    if (configBaseUrl.trim() && !configToken.trim()) {
      toast.error('填写了 API 地址时请同时填写 Token');
      return;
    }
    if (!configBaseUrl.trim() && configToken.trim()) {
      toast.error('填写了 Token 时请同时填写 API 地址');
      return;
    }
    setConfigSaving(true);
    try {
      await adminUniapiConfigUpdate({
        base_url_semantic: configBaseUrl.trim() || '',
        token_semantic: configToken.trim() || '',
      });
      toast.success('语义情境模型 API 配置已保存');
      loadConfig();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleTestConnect = async () => {
    setConfigTest('running');
    setConfigTestMsg('');
    try {
      const res = await adminTestSemantic();
      if (res.errCode === 0 && res.data?.success) {
        setConfigTest('ok');
        setConfigTestMsg(res.data.model ? `模型: ${res.data.model}，${res.data.durationMs ?? 0} ms` : '');
      } else {
        setConfigTest('fail');
        setConfigTestMsg(res.errMsg || '连接失败');
      }
    } catch (err) {
      setConfigTest('fail');
      setConfigTestMsg(err instanceof Error ? err.message : '请求异常');
    }
  };

  const handleSaveSemanticModel = async () => {
    setSemanticSaving(true);
    try {
      await adminUniapiConfigUpdate({
        model_semantic: configModelSemantic.trim() || '',
      });
      toast.success('语义情境识别模型 ID 已保存');
      loadConfig();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSemanticSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">语义情境识别模型管理</h1>

      {/* API 配置，样式与解题大模型配置保持一致 */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <KeyRound size={18} className="text-amber-500" />
          <div>
            <div className="text-sm font-medium text-slate-800">模型接口</div>
            <div className="text-xs text-slate-500 mt-0.5">
              独立配置语义情境识别模型的 API 地址与 Token，留空则使用解题模型配置。保存后立即生效。
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {configLoading ? (
            <div className="text-sm text-slate-500">加载中...</div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <Link2 size={14} />
                  API Base URL
                </label>
                <input
                  type="url"
                  value={configBaseUrl}
                  onChange={(e) => setConfigBaseUrl(e.target.value)}
                  placeholder="如 https://api.uniapi.io"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">API Token</label>
                <div className="relative">
                  <input
                    type="password"
                    value={configToken}
                    onChange={(e) => setConfigToken(e.target.value)}
                    placeholder="以 sk- 开头的密钥"
                    className="w-full px-3 pr-10 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  仅管理员可见，用于调用模型接口。请妥善保管，避免在前端或客户端代码中暴露。
                </p>
              </div>
              <div className="flex justify-end items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleTestConnect}
                  disabled={configTest === 'running'}
                  className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {configTest === 'running' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      连接测试中...
                    </>
                  ) : (
                    <>
                      <Wifi size={16} />
                      连接测试
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSaveApi}
                  disabled={configSaving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
                >
                  {configSaving ? '保存中...' : '保存接口配置'}
                </button>
                {configTest === 'ok' && (
                  <span className="text-sm text-emerald-600 inline-flex items-center gap-1">
                    <CheckCircle size={16} /> 连接正常
                    {configTestMsg && <span className="text-slate-500">({configTestMsg})</span>}
                  </span>
                )}
                {configTest === 'fail' && (
                  <span className="text-sm text-red-600 inline-flex items-center gap-1">
                    <XCircle size={16} /> {configTestMsg || '连接失败'}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 语义情境识别模型 ID 管理 */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="text-sm font-medium text-slate-800">语义情境识别模型</div>
          <div className="text-xs text-slate-500 mt-0.5">
            配置用于识别题目「语义情境/应用场景」的专用模型 ID。留空时将与默认解题模型保持一致。
          </div>
        </div>
        <div className="p-4 space-y-2">
          {configLoading ? (
            <div className="text-sm text-slate-500">加载中...</div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">语义情境识别模型 ID</label>
                <input
                  type="text"
                  value={configModelSemantic}
                  onChange={(e) => setConfigModelSemantic(e.target.value)}
                  placeholder="如 deepseek-v3，留空则与解题模型相同"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  对应后端 UNIAPI_MODEL_SEMANTIC；为空时由后端自动回退到 UNIAPI_MODEL。
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveSemanticModel}
                  disabled={semanticSaving}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                >
                  {semanticSaving ? '保存中...' : '保存语义情境模型'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

