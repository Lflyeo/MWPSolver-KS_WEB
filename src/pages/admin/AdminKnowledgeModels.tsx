import { useState, useEffect } from 'react';
import { KeyRound, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminUniapiConfigGet, adminUniapiConfigUpdate, type AdminUniapiConfig } from '@/services/admin';

export default function AdminKnowledgeModels() {
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [knowledgeSaving, setKnowledgeSaving] = useState(false);
  const [configBaseUrl, setConfigBaseUrl] = useState('');
  const [configToken, setConfigToken] = useState('');
  const [configModelKnowledge, setConfigModelKnowledge] = useState('');

  const loadConfig = () => {
    setConfigLoading(true);
    adminUniapiConfigGet()
      .then((res) => {
        const data = res.data as AdminUniapiConfig | null;
        setConfigBaseUrl(data?.base_url ?? '');
        setConfigToken(data?.token ?? '');
        setConfigModelKnowledge(data?.model_knowledge ?? '');
      })
      .catch((err) => toast.error(err?.message || '加载配置失败'))
      .finally(() => setConfigLoading(false));
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveApi = async () => {
    if (!configBaseUrl.trim() || !configToken.trim()) {
      toast.error('请填写完整的 API 地址和 Token');
      return;
    }
    setConfigSaving(true);
    try {
      await adminUniapiConfigUpdate({
        base_url: configBaseUrl.trim(),
        token: configToken.trim(),
      });
      toast.success('API 配置已保存');
      loadConfig();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSaveKnowledgeModel = async () => {
    setKnowledgeSaving(true);
    try {
      await adminUniapiConfigUpdate({
        // 空字符串表示“跟随解题模型/使用后端默认值”
        model_knowledge: configModelKnowledge.trim() || '',
      });
      toast.success('知识点识别模型已保存');
      loadConfig();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setKnowledgeSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">知识点识别模型管理</h1>

      {/* API 配置，样式与解题大模型配置保持一致 */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <KeyRound size={18} className="text-amber-500" />
          <div>
            <div className="text-sm font-medium text-slate-800">模型接口</div>
            <div className="text-xs text-slate-500 mt-0.5">
              在此配置用于知识点识别调用的模型接口地址与 Token，保存后立即生效，无需重启服务。
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveApi}
                  disabled={configSaving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
                >
                  {configSaving ? '保存中...' : '保存 API 配置'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 知识点识别模型 ID 管理 */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="text-sm font-medium text-slate-800">知识点识别模型</div>
          <div className="text-xs text-slate-500 mt-0.5">
            配置用于识别题目中「知识点」的专用模型 ID。留空时将与默认解题模型保持一致。
          </div>
        </div>
        <div className="p-4 space-y-2">
          {configLoading ? (
            <div className="text-sm text-slate-500">加载中...</div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">知识点识别模型 ID</label>
                <input
                  type="text"
                  value={configModelKnowledge}
                  onChange={(e) => setConfigModelKnowledge(e.target.value)}
                  placeholder="如 gpt-5.2，留空则与解题模型相同"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  对应后端 UNIAPI_MODEL_KNOWLEDGE；为空时由后端自动回退到 UNIAPI_MODEL。
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveKnowledgeModel}
                  disabled={knowledgeSaving}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                >
                  {knowledgeSaving ? '保存中...' : '保存知识点模型'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

