"""
解题接口：题目提交后先由两个专用模型分别识别知识点与语义情境，
再将其整合进 prompt 调用解题模型，增强解题效果。
解题可选模型优先从数据库 solve_models 表读取（管理员可维护），为空时回退到环境变量。
"""
import asyncio
import json
import re
import httpx
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.solve_model import SolveModel
from models.system_setting import SystemSetting
from schemas.solve import SolveRequest, SolveResponse, AnalyzeRequest, AnalyzeResponse

router = APIRouter(prefix="/solve", tags=["解题"])
CHAT_COMPLETIONS_PATH = "/v1/chat/completions"

# 环境变量回退时的默认展示名
SOLVE_MODEL_DISPLAY_NAMES = {
    "gpt-5.2": "GPT-5.2",
    "gpt-4o": "GPT-4o",
    "qwen2.5-72b-instruct": "Qwen2.5-72B",
    "deepseek-v3": "DeepSeek-V3",
}


def _get_solve_model_options_from_env() -> list:
    """从环境变量返回 [{ id, name }]，用于 DB 无数据时回退。"""
    raw = (settings.UNIAPI_SOLVE_MODELS or "").strip()
    if not raw:
        return [{"id": settings.UNIAPI_MODEL or "gpt-5.2", "name": SOLVE_MODEL_DISPLAY_NAMES.get(settings.UNIAPI_MODEL, settings.UNIAPI_MODEL or "GPT-5.2")}]
    ids = [x.strip() for x in raw.split(",") if x.strip()]
    return [{"id": mid, "name": SOLVE_MODEL_DISPLAY_NAMES.get(mid, mid)} for mid in ids]


def seed_solve_models_from_env(db: Session) -> int:
    """当 solve_models 表为空时，用环境变量 UNIAPI_SOLVE_MODELS 写入初始数据，使管理端与用户端共用同一数据源。返回插入条数。"""
    if db.query(SolveModel).count() > 0:
        return 0
    options = _get_solve_model_options_from_env()
    added = 0
    for i, opt in enumerate(options):
        model_id = opt.get("id") or ""
        name = opt.get("name") or model_id
        if not model_id:
            continue
        row = SolveModel(
            model_id=model_id,
            display_name=name,
            sort_order=i,
            enabled=True,
        )
        db.add(row)
        added += 1
    db.commit()
    return added

# 知识点识别系统 prompt：要求只返回 JSON 数组，便于解析
KNOWLEDGE_SYSTEM = """你是一个数学题目分析助手。根据用户给出的数学题目，识别该题目所涉及的知识点（如：一元二次方程、概率、勾股定理、相似三角形等）。
只输出一个 JSON 数组，每个元素是一个知识点的名称字符串，不要输出任何其他说明或 markdown。若无法识别则输出 []。
示例：["一元二次方程","根的判别式"]"""

# 语义情境识别系统 prompt
SEMANTIC_SYSTEM = """你是一个数学题目分析助手。根据用户给出的数学题目，识别题目所处的语义情境/应用场景（如：行程问题、利润问题、几何测量、生活中的概率等）。
只输出一个 JSON 数组，每个元素是一个语义情境的名称字符串，不要输出任何其他说明或 markdown。若无法识别则输出 []。
示例：["行程问题","相遇问题"]"""

# 解题模型系统 prompt（会在 user 消息中注入知识点与语义情境）
SOLVE_SYSTEM = """You are a helpful math assistant. Please solve the math problem step by step and provide detailed explanations in Chinese.
If the problem context includes suggested knowledge points or semantic context, use them to guide your solution and explanation."""


def _get_uniapi_base_and_token(db: Session | None) -> tuple[str, str]:
    """
    获取 UniAPI 的 Base URL 与 Token。
    优先从 system_settings 表读取，若未配置或查询失败则回退到环境变量。
    """
    base_url = settings.UNIAPI_BASE_URL
    token = settings.UNIAPI_TOKEN
    if not db:
        return base_url, token
    try:
        rows = (
            db.query(SystemSetting)
            .filter(SystemSetting.key.in_(["UNIAPI_BASE_URL", "UNIAPI_TOKEN"]))
            .all()
        )
        for row in rows:
            if row.key == "UNIAPI_BASE_URL" and row.value:
                base_url = row.value.strip()
            elif row.key == "UNIAPI_TOKEN" and row.value:
                token = row.value.strip()
    except Exception:
        # 表不存在或出错时直接回退到环境变量
        pass
    return base_url, token


def _get_model_knowledge_and_semantic(db: Session | None) -> tuple[str, str]:
    """
    获取知识点识别模型与语义情境识别模型。

    优先读取 system_settings 表中的：
    - UNIAPI_MODEL_KNOWLEDGE
    - UNIAPI_MODEL_SEMANTIC
    若为空则回退到：
    - UNIAPI_MODEL_KNOWLEDGE 或 UNIAPI_MODEL_SEMANTIC 环境变量
    - 最终都回退到 UNIAPI_MODEL（默认 gpt-5.2）
    """
    default_model = (settings.UNIAPI_MODEL or "gpt-5.2").strip()
    model_k = (settings.UNIAPI_MODEL_KNOWLEDGE or "").strip() or default_model
    model_s = (settings.UNIAPI_MODEL_SEMANTIC or "").strip() or default_model
    if not db:
        return model_k, model_s
    try:
        rows = (
            db.query(SystemSetting)
            .filter(SystemSetting.key.in_(["UNIAPI_MODEL", "UNIAPI_MODEL_KNOWLEDGE", "UNIAPI_MODEL_SEMANTIC"]))
            .all()
        )
        # 允许在 DB 中覆盖默认解题模型
        for row in rows:
            if row.key == "UNIAPI_MODEL" and row.value:
                default_model = row.value.strip() or default_model
        # 再次根据 DB 中的默认模型回退
        model_k = default_model
        model_s = default_model
        for row in rows:
            if row.key == "UNIAPI_MODEL_KNOWLEDGE":
                value = (row.value or "").strip()
                if value:
                    model_k = value
            elif row.key == "UNIAPI_MODEL_SEMANTIC":
                value = (row.value or "").strip()
                if value:
                    model_s = value
    except Exception:
        # 任何异常都不影响服务，直接回退到环境变量/默认值
        pass
    return model_k, model_s


def _parse_list_from_content(raw: str) -> list:
    """从模型输出中解析出字符串列表。支持 JSON 数组，或每行一项、顿号/逗号分隔。"""
    if not raw or not isinstance(raw, str):
        return []
    s = raw.strip()
    if not s:
        return []
    # 尝试提取 JSON 数组
    try:
        # 允许被 markdown 代码块包裹
        m = re.search(r"\[[\s\S]*?\]", s)
        if m:
            arr = json.loads(m.group())
            if isinstance(arr, list):
                return [str(x).strip() for x in arr if x]
    except (json.JSONDecodeError, TypeError):
        pass
    # 回退：按行或顿号、逗号分割
    for sep in ["\n", "、", "，", ","]:
        if sep in s:
            return [x.strip() for x in s.split(sep) if x.strip()]
    return [s] if s else []


async def _call_uniapi(client: httpx.AsyncClient, model: str, messages: list, base_url: str, token: str) -> str:
    url = f"{base_url.rstrip('/')}{CHAT_COMPLETIONS_PATH}"
    headers = {
        "Authorization": f"Bearer {token.strip()}",
        "Content-Type": "application/json",
    }
    payload = {"model": model, "messages": messages}
    resp = await client.post(url, json=payload, headers=headers)
    resp.raise_for_status()
    data = resp.json()
    content = ""
    if data and isinstance(data.get("choices"), list) and len(data["choices"]) > 0:
        msg = data["choices"][0].get("message") or {}
        content = (msg.get("content") or "").strip()
    return content


async def _extract_knowledge_points(
    client: httpx.AsyncClient, question: str, base_url: str, token: str, model: str
) -> list:
    messages = [
        {"role": "developer", "content": KNOWLEDGE_SYSTEM},
        {"role": "user", "content": question},
    ]
    try:
        content = await _call_uniapi(client, model, messages, base_url, token)
        return _parse_list_from_content(content)
    except Exception:
        return []


async def _extract_semantic_contexts(
    client: httpx.AsyncClient, question: str, base_url: str, token: str, model: str
) -> list:
    messages = [
        {"role": "developer", "content": SEMANTIC_SYSTEM},
        {"role": "user", "content": question},
    ]
    try:
        content = await _call_uniapi(client, model, messages, base_url, token)
        return _parse_list_from_content(content)
    except Exception:
        return []


def _build_enhanced_user_message(question: str, knowledge_points: list, semantic_contexts: list) -> str:
    parts = ["【题目】\n", question]
    if knowledge_points:
        parts.append("\n\n【涉及知识点】\n")
        parts.append("、".join(knowledge_points))
    if semantic_contexts:
        parts.append("\n\n【语义情境】\n")
        parts.append("、".join(semantic_contexts))
    parts.append("\n\n请根据以上题目与标注信息，给出详细解题过程与答案。")
    return "".join(parts)


@router.get("/models")
def list_solve_models(db: Session = Depends(get_db)):
    """返回可选解题大模型列表（优先从 DB 读取，可管理员实时维护），供前端下拉选择。"""
    rows = db.query(SolveModel).filter(SolveModel.enabled == True).order_by(SolveModel.sort_order, SolveModel.id).all()
    if rows:
        data = [{"id": r.model_id, "name": r.display_name} for r in rows]
    else:
        data = _get_solve_model_options_from_env()
    return {"errCode": 0, "errMsg": "success", "data": data}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_question(
    body: AnalyzeRequest,
    db: Session = Depends(get_db),
):
    """
    仅做题目分析：识别知识点与语义情境，供前端流式展示工作流时先调用。
    """
    base_url, token = _get_uniapi_base_and_token(db)
    model_k, model_s = _get_model_knowledge_and_semantic(db)
    if not (token and token.strip()):
        return AnalyzeResponse(
            errCode=400,
            errMsg="请联系管理员在后台配置模型接口。",
            data={},
        )
    question = (body.question or "").strip()
    if not question:
        return AnalyzeResponse(errCode=400, errMsg="题目不能为空", data={})
    knowledge_points: list = []
    semantic_contexts: list = []
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            knowledge_points, semantic_contexts = await asyncio.gather(
                _extract_knowledge_points(client, question, base_url, token, model_k),
                _extract_semantic_contexts(client, question, base_url, token, model_s),
            )
    except Exception as e:
        return AnalyzeResponse(errCode=500, errMsg=f"分析失败: {str(e)}", data={})
    return AnalyzeResponse(
        errCode=0,
        errMsg="success",
        data={"knowledge_points": knowledge_points, "semantic_contexts": semantic_contexts},
    )


@router.post("", response_model=SolveResponse)
async def solve_question(
    body: SolveRequest,
    db: Session = Depends(get_db),
):
    """
    工作流：若未传 knowledge_points/semantic_contexts 则先识别；
    再将知识点与语义情境嵌入 prompt 调用解题模型，返回解题过程。
    """
    base_url, token = _get_uniapi_base_and_token(db)
    if not (token and token.strip()):
        return SolveResponse(
            errCode=400,
            errMsg="请联系管理员在后台配置模型接口。",
            data={},
        )
    url = f"{base_url.rstrip('/')}{CHAT_COMPLETIONS_PATH}"
    headers = {
        "Authorization": f"Bearer {token.strip()}",
        "Content-Type": "application/json",
    }
    question = (body.question or "").strip()
    if not question:
        return SolveResponse(errCode=400, errMsg="题目不能为空", data={})

    knowledge_points: list = list(body.knowledge_points) if body.knowledge_points else []
    semantic_contexts: list = list(body.semantic_contexts) if body.semantic_contexts else []

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            if not knowledge_points and not semantic_contexts:
                model_k, model_s = _get_model_knowledge_and_semantic(db)
                knowledge_points, semantic_contexts = await asyncio.gather(
                    _extract_knowledge_points(client, question, base_url, token, model_k),
                    _extract_semantic_contexts(client, question, base_url, token, model_s),
                )
            # 构建增强 prompt 并调用解题模型（优先使用请求中的 model）
            user_message = _build_enhanced_user_message(question, knowledge_points, semantic_contexts)
            solve_model = (body.model or "").strip() or (settings.UNIAPI_MODEL or "gpt-5.2")
            print(f"solve_model: {solve_model}")
            payload = {
                "model": solve_model,
                "messages": [
                    {"role": "developer", "content": SOLVE_SYSTEM},
                    {"role": "user", "content": user_message},
                ],
            }
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        return SolveResponse(
            errCode=500,
            errMsg="大模型请求超时，请稍后重试",
            data={},
        )
    except httpx.HTTPStatusError as e:
        err_detail = ""
        try:
            err_body = e.response.json()
            err_detail = err_body.get("error", {}).get("message", "") or str(err_body)
        except Exception:
            err_detail = e.response.text or str(e)
        return SolveResponse(
            errCode=500,
            errMsg=f"大模型请求失败: {err_detail}",
            data={},
        )
    except Exception as e:
        return SolveResponse(
            errCode=500,
            errMsg=f"解题服务异常: {str(e)}",
            data={},
        )

    content = ""
    if data and isinstance(data.get("choices"), list) and len(data["choices"]) > 0:
        msg = data["choices"][0].get("message") or {}
        content = msg.get("content") or ""
    if not content:
        return SolveResponse(
            errCode=500,
            errMsg="大模型返回内容为空",
            data={},
        )

    return SolveResponse(
        errCode=0,
        errMsg="success",
        data={
            "content": content,
            "knowledge_points": knowledge_points,
            "semantic_contexts": semantic_contexts,
        },
    )
