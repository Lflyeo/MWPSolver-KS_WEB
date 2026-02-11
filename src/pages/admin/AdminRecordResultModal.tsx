import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { adminRecordDetail, type AdminRecordDetailItem } from '@/services/admin';

export function AdminRecordResultModal(props: {
  open: boolean;
  recordId: string | null;
  onClose: () => void;
}) {
  const { open, recordId, onClose } = props;
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AdminRecordDetailItem | null>(null);

  useEffect(() => {
    if (!open || !recordId) return;
    setLoading(true);
    setDetail(null);
    adminRecordDetail(recordId)
      .then((res) => setDetail(res.data ?? null))
      .catch((err) => toast.error(err?.message || '加载详情失败'))
      .finally(() => setLoading(false));
  }, [open, recordId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800">解题结果</div>
              <div className="text-xs text-slate-500 truncate">
                {detail?.username || detail?.nickname ? (
                  <>
                    <span>{detail?.username ?? '-'}</span>
                    {detail?.nickname && <span className="ml-1">（{detail.nickname}）</span>}
                  </>
                ) : (
                  <span>匿名/已删除</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              title="关闭"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 max-h-[75vh] overflow-auto">
            {loading ? (
              <div className="py-10 text-center text-slate-500">加载中...</div>
            ) : !detail ? (
              <div className="py-10 text-center text-slate-500">暂无详情</div>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">题目</div>
                  <div className="whitespace-pre-wrap text-slate-800">{detail.question}</div>
                </div>

                {(detail.knowledge_points?.length || detail.semantic_contexts?.length) && (
                  <div className="space-y-3">
                    {(detail.knowledge_points?.length ?? 0) > 0 && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 mb-2">知识点</div>
                        <div className="flex flex-wrap gap-2">
                          {(detail.knowledge_points ?? []).map((t) => (
                            <span
                              key={`k:${t}`}
                              className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(detail.semantic_contexts?.length ?? 0) > 0 && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 mb-2">语义情境</div>
                        <div className="flex flex-wrap gap-2">
                          {(detail.semantic_contexts ?? []).map((t) => (
                            <span
                              key={`s:${t}`}
                              className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">答案</div>
                  <div className="whitespace-pre-wrap text-slate-800">{detail.answer || '-'}</div>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">解题过程</div>
                  <div className="whitespace-pre-wrap text-slate-800">{detail.solution || '-'}</div>
                </div>

                <div className="pt-2 text-xs text-slate-500">
                  创建时间：{detail.created_at ? new Date(detail.created_at).toLocaleString() : '-'}；记录ID：{detail.id}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

