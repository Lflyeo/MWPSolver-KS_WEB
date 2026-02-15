"""
管理员端：用户管理、解题模型管理。
认证方式：请求头 X-Admin-Token 或 Authorization: Bearer <ADMIN_SECRET>，与 config.ADMIN_SECRET 一致即通过。
"""
import time
from fastapi import APIRouter, Depends, HTTPException, Query, Header, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import Optional
from pathlib import Path
import uuid

import httpx
from routers import solve as solve_router

from config import settings
from database import get_db
from models.user import User
from models.solve_model import SolveModel
from models.record import SolutionRecord
from models.favorite import Favorite
from models.system_setting import SystemSetting
from schemas.admin import (
    AdminUserItem,
    AdminUserListResponse,
    AdminUserDetailResponse,
    AdminUserUpdateRequest,
    AdminUserCreateRequest,
    AdminUserPasswordUpdateRequest,
    AdminUniapiConfig,
    AdminUniapiConfigResponse,
    AdminUniapiConfigUpdateRequest,
    AdminSolveModelItem,
    AdminSolveModelListResponse,
    AdminSolveModelCreateRequest,
    AdminSolveModelUpdateRequest,
    AdminSolveModelUpsertResponse,
    AdminRecordItem,
    AdminRecordListResponse,
    AdminRecordDetailItem,
    AdminRecordDetailResponse,
    AdminFavoriteItem,
    AdminFavoriteListResponse,
    AdminCommonResponse,
)
from .auth import hash_password

router = APIRouter(prefix="/admin", tags=["管理员"])


def get_admin_token(
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
    authorization: Optional[str] = Header(None),
) -> str:
    """从请求头获取管理员 token，校验通过返回 token。"""
    token = x_admin_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    if not token or token != settings.ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="管理员认证失败")
    return token


@router.get("/users", response_model=AdminUserListResponse)
def admin_list_users(
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=100),
    keyword: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """用户列表（分页）。"""
    query = db.query(User)
    if keyword and keyword.strip():
        kw = f"%{keyword.strip()}%"
        query = query.filter(or_(User.username.like(kw), and_(User.nickname.isnot(None), User.nickname.like(kw))))
    total = query.count()
    offset = (page - 1) * pageSize
    users = query.order_by(User.created_at.desc()).offset(offset).limit(pageSize).all()
    data = [
        AdminUserItem(
            id=u.id,
            username=u.username,
            nickname=u.nickname,
            avatar_url=u.avatar_url,
            created_at=u.created_at.isoformat() if u.created_at else None,
        )
        for u in users
    ]
    return AdminUserListResponse(data=data, total=total)


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
def admin_get_user(
    user_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """用户详情。"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return AdminUserDetailResponse(errCode=404, errMsg="用户不存在", data=None)
    return AdminUserDetailResponse(
        errCode=0,
        errMsg="success",
        data=AdminUserItem(
            id=user.id,
            username=user.username,
            nickname=user.nickname,
            avatar_url=user.avatar_url,
            created_at=user.created_at.isoformat() if user.created_at else None,
        ),
    )


@router.patch("/users/{user_id}", response_model=AdminCommonResponse)
def admin_update_user(
    user_id: str,
    req: AdminUserUpdateRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """更新用户（昵称、头像）。"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return AdminCommonResponse(errCode=404, errMsg="用户不存在", data={})
    if req.nickname is not None:
        user.nickname = req.nickname.strip() or None
    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url.strip() or None
    try:
        db.commit()
        db.refresh(user)
        return AdminCommonResponse(errCode=0, errMsg="success", data={"id": user.id})
    except Exception as e:
        db.rollback()
        return AdminCommonResponse(errCode=500, errMsg=f"更新失败: {str(e)}", data={})


@router.delete("/users/{user_id}", response_model=AdminCommonResponse)
def admin_delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """删除用户（会删除其解题记录中的关联、收藏等；记录保留但 user_id 置空）。"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return AdminCommonResponse(errCode=404, errMsg="用户不存在", data={})
    try:
        db.query(SolutionRecord).filter(SolutionRecord.user_id == user_id).update({SolutionRecord.user_id: None})
        db.query(Favorite).filter(Favorite.user_id == user_id).delete(synchronize_session=False)
        db.delete(user)
        db.commit()
        return AdminCommonResponse(errCode=0, errMsg="success", data={})
    except Exception as e:
        db.rollback()
        return AdminCommonResponse(errCode=500, errMsg=f"删除失败: {str(e)}", data={})


@router.get("/uniapi-config", response_model=AdminUniapiConfigResponse)
def admin_get_uniapi_config(
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """获取解题/知识点/语义三套接口配置。每套可独立配置 base_url、token、model。"""
    keys = [
        "UNIAPI_BASE_URL",
        "UNIAPI_TOKEN",
        "UNIAPI_MODEL",
        "UNIAPI_BASE_URL_KNOWLEDGE",
        "UNIAPI_TOKEN_KNOWLEDGE",
        "UNIAPI_MODEL_KNOWLEDGE",
        "UNIAPI_BASE_URL_SEMANTIC",
        "UNIAPI_TOKEN_SEMANTIC",
        "UNIAPI_MODEL_SEMANTIC",
    ]
    base_url = settings.UNIAPI_BASE_URL or ""
    token = settings.UNIAPI_TOKEN or ""
    model = (settings.UNIAPI_MODEL or "gpt-5.2").strip()
    base_url_knowledge: Optional[str] = None
    token_knowledge: Optional[str] = None
    model_knowledge: Optional[str] = None
    base_url_semantic: Optional[str] = None
    token_semantic: Optional[str] = None
    model_semantic: Optional[str] = None
    try:
        rows = db.query(SystemSetting).filter(SystemSetting.key.in_(keys)).all()
        for row in rows:
            v = (row.value or "").strip() or None
            if row.key == "UNIAPI_BASE_URL" and row.value:
                base_url = row.value.strip()
            elif row.key == "UNIAPI_TOKEN" and row.value:
                token = row.value.strip()
            elif row.key == "UNIAPI_MODEL" and row.value:
                model = row.value.strip()
            elif row.key == "UNIAPI_BASE_URL_KNOWLEDGE":
                base_url_knowledge = v
            elif row.key == "UNIAPI_TOKEN_KNOWLEDGE":
                token_knowledge = v
            elif row.key == "UNIAPI_MODEL_KNOWLEDGE":
                model_knowledge = v
            elif row.key == "UNIAPI_BASE_URL_SEMANTIC":
                base_url_semantic = v
            elif row.key == "UNIAPI_TOKEN_SEMANTIC":
                token_semantic = v
            elif row.key == "UNIAPI_MODEL_SEMANTIC":
                model_semantic = v
    except Exception:
        pass
    if not (base_url and token):
        return AdminUniapiConfigResponse(
            errCode=400,
            errMsg="尚未完整配置解题模型接口（Base URL 或 Token 为空），请先在解题模型管理页保存。",
            data=AdminUniapiConfig(
                base_url=base_url or "",
                token=token or "",
                model=model,
                base_url_knowledge=base_url_knowledge,
                token_knowledge=token_knowledge,
                model_knowledge=model_knowledge,
                base_url_semantic=base_url_semantic,
                token_semantic=token_semantic,
                model_semantic=model_semantic,
            ),
        )
    return AdminUniapiConfigResponse(
        errCode=0,
        errMsg="success",
        data=AdminUniapiConfig(
            base_url=base_url,
            token=token,
            model=model,
            base_url_knowledge=base_url_knowledge,
            token_knowledge=token_knowledge,
            model_knowledge=model_knowledge,
            base_url_semantic=base_url_semantic,
            token_semantic=token_semantic,
            model_semantic=model_semantic,
        ),
    )


@router.patch("/uniapi-config", response_model=AdminCommonResponse)
def admin_update_uniapi_config(
    req: AdminUniapiConfigUpdateRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """更新接口配置。仅更新请求中传入的字段（非 None）；空字符串表示清空该键，回退到解题配置或环境变量。"""
    def _set(key: str, value: str | None) -> None:
        row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if value is None:
            return
        val = value.strip()
        if row:
            row.value = val
        else:
            db.add(SystemSetting(key=key, value=val))

    try:
        if req.base_url is not None:
            _set("UNIAPI_BASE_URL", req.base_url)
        if req.token is not None:
            _set("UNIAPI_TOKEN", req.token)
        if req.model is not None:
            row = db.query(SystemSetting).filter(SystemSetting.key == "UNIAPI_MODEL").first()
            val = (req.model or "").strip()
            if not val:
                if row:
                    db.delete(row)
            else:
                _set("UNIAPI_MODEL", req.model)
        if req.base_url_knowledge is not None:
            _set("UNIAPI_BASE_URL_KNOWLEDGE", req.base_url_knowledge or "")
        if req.token_knowledge is not None:
            _set("UNIAPI_TOKEN_KNOWLEDGE", req.token_knowledge or "")
        if req.model_knowledge is not None:
            _set("UNIAPI_MODEL_KNOWLEDGE", req.model_knowledge or "")
        if req.base_url_semantic is not None:
            _set("UNIAPI_BASE_URL_SEMANTIC", req.base_url_semantic or "")
        if req.token_semantic is not None:
            _set("UNIAPI_TOKEN_SEMANTIC", req.token_semantic or "")
        if req.model_semantic is not None:
            _set("UNIAPI_MODEL_SEMANTIC", req.model_semantic or "")
        db.commit()
        return AdminCommonResponse(errCode=0, errMsg="success", data={})
    except Exception as e:
        db.rollback()
        return AdminCommonResponse(errCode=500, errMsg=f"更新失败: {str(e)}", data={})


@router.post("/users", response_model=AdminCommonResponse)
def admin_create_user(
    req: AdminUserCreateRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """管理员创建用户（用户名 + 密码，与注册接口字段一致）。"""
    if db.query(User).filter(User.username == req.username).first():
        return AdminCommonResponse(errCode=400, errMsg="用户名已被使用", data={})
    user = User(username=req.username.strip(), password_hash=hash_password(req.password))
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return AdminCommonResponse(errCode=0, errMsg="success", data={"id": user.id})
    except Exception as e:
        db.rollback()
        return AdminCommonResponse(errCode=500, errMsg=f"创建失败: {str(e)}", data={})


@router.patch("/users/{user_id}/password", response_model=AdminCommonResponse)
def admin_update_user_password(
    user_id: str,
    req: AdminUserPasswordUpdateRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """管理员重置用户密码。"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return AdminCommonResponse(errCode=404, errMsg="用户不存在", data={})
    user.password_hash = hash_password(req.password)
    try:
        db.commit()
        return AdminCommonResponse(errCode=0, errMsg="success", data={"id": user.id})
    except Exception as e:
        db.rollback()
        return AdminCommonResponse(errCode=500, errMsg=f"重置密码失败: {str(e)}", data={})


def _get_avatar_upload_dir() -> Path:
    """头像保存目录（backend/uploads/avatars），与用户端保持一致。"""
    base = Path(__file__).resolve().parent.parent
    d = base / settings.UPLOAD_DIR / "avatars"
    d.mkdir(parents=True, exist_ok=True)
    return d


@router.post("/users/{user_id}/avatar", response_model=AdminCommonResponse)
def admin_upload_user_avatar(
    user_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """
    管理员上传并更新指定用户头像。

    前端需使用 multipart/form-data 上传文件，成功后返回可访问的 URL（相对路径）。
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return AdminCommonResponse(errCode=404, errMsg="用户不存在", data={})
    if not file.filename:
        return AdminCommonResponse(errCode=400, errMsg="请选择文件", data={})
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.AVATAR_ALLOWED_EXTENSIONS:
        return AdminCommonResponse(
            errCode=400,
            errMsg=f"仅支持图片格式：{', '.join(settings.AVATAR_ALLOWED_EXTENSIONS)}",
            data={},
        )
    content = file.file.read()
    if len(content) > settings.AVATAR_MAX_BYTES:
        return AdminCommonResponse(
            errCode=400,
            errMsg=f"图片大小不能超过 {settings.AVATAR_MAX_BYTES // (1024*1024)}MB",
            data={},
        )
    file.file.seek(0)
    upload_dir = _get_avatar_upload_dir()
    name = f"{user_id}_{uuid.uuid4().hex[:12]}{ext}"
    path = upload_dir / name
    try:
        with open(path, "wb") as f:
            f.write(content)
    except Exception as e:
        return AdminCommonResponse(errCode=500, errMsg=f"保存失败: {e}", data={})
    url_path = f"/api/{settings.UPLOAD_DIR}/avatars/{name}"
    user.avatar_url = url_path
    try:
        db.commit()
        return AdminCommonResponse(errCode=0, errMsg="success", data={"id": user.id, "url": url_path})
    except Exception as e:
        db.rollback()
        return AdminCommonResponse(errCode=500, errMsg=f"更新头像失败: {e}", data={})


@router.get("/solve-models", response_model=AdminSolveModelListResponse)
def admin_list_solve_models(
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """解题模型列表（含禁用）。"""
    rows = db.query(SolveModel).order_by(SolveModel.sort_order, SolveModel.id).all()
    data = [
        AdminSolveModelItem(
            id=r.id,
            model_id=r.model_id,
            display_name=r.display_name,
            sort_order=r.sort_order,
            enabled=bool(r.enabled),
            created_at=r.created_at.isoformat() if r.created_at else None,
        )
        for r in rows
    ]
    return AdminSolveModelListResponse(data=data)


@router.post("/solve-models", response_model=AdminSolveModelUpsertResponse)
def admin_create_solve_model(
    req: AdminSolveModelCreateRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """新增解题模型。"""
    if db.query(SolveModel).filter(SolveModel.model_id == req.model_id).first():
        return AdminSolveModelUpsertResponse(errCode=400, errMsg="模型 ID 已存在", data=None)
    row = SolveModel(
        model_id=req.model_id.strip(),
        display_name=req.display_name.strip(),
        sort_order=req.sort_order,
        enabled=req.enabled,
    )
    try:
        db.add(row)
        db.commit()
        db.refresh(row)
        return AdminSolveModelUpsertResponse(
            errCode=0,
            errMsg="success",
            data=AdminSolveModelItem(
                id=row.id,
                model_id=row.model_id,
                display_name=row.display_name,
                sort_order=row.sort_order,
                enabled=bool(row.enabled),
                created_at=row.created_at.isoformat() if row.created_at else None,
            ),
        )
    except Exception as e:
        db.rollback()
        return AdminSolveModelUpsertResponse(errCode=500, errMsg=f"新增失败: {str(e)}", data=None)


@router.patch("/solve-models/{model_pk}", response_model=AdminSolveModelUpsertResponse)
def admin_update_solve_model(
    model_pk: int,
    req: AdminSolveModelUpdateRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """更新解题模型。"""
    row = db.query(SolveModel).filter(SolveModel.id == model_pk).first()
    if not row:
        return AdminSolveModelUpsertResponse(errCode=404, errMsg="模型不存在", data=None)
    if req.display_name is not None:
        row.display_name = req.display_name.strip()
    if req.sort_order is not None:
        row.sort_order = req.sort_order
    if req.enabled is not None:
        row.enabled = req.enabled
    try:
        db.commit()
        db.refresh(row)
        return AdminSolveModelUpsertResponse(
            errCode=0,
            errMsg="success",
            data=AdminSolveModelItem(
                id=row.id,
                model_id=row.model_id,
                display_name=row.display_name,
                sort_order=row.sort_order,
                enabled=bool(row.enabled),
                created_at=row.created_at.isoformat() if row.created_at else None,
            ),
        )
    except Exception as e:
        db.rollback()
        return AdminSolveModelUpsertResponse(errCode=500, errMsg=f"更新失败: {str(e)}", data=None)


@router.delete("/solve-models/{model_pk}", response_model=AdminCommonResponse)
def admin_delete_solve_model(
    model_pk: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """删除解题模型。"""
    row = db.query(SolveModel).filter(SolveModel.id == model_pk).first()
    if not row:
        return AdminCommonResponse(errCode=404, errMsg="模型不存在", data={})
    try:
        db.delete(row)
        db.commit()
        return AdminCommonResponse(errCode=0, errMsg="success", data={})
    except Exception as e:
        db.rollback()
        return AdminCommonResponse(errCode=500, errMsg=f"删除失败: {str(e)}", data={})


@router.get("/records", response_model=AdminRecordListResponse)
def admin_list_records(
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=100),
    keyword: Optional[str] = Query(None, description="按题目或用户名关键字搜索"),
    user_id: Optional[str] = Query(None, description="按用户ID过滤"),
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """解题记录列表（可按题目/用户名关键字与用户过滤）。"""
    # 外连接 users 表，确保能返回 username/nickname（与收藏列表保持一致）
    query = db.query(SolutionRecord).join(User, SolutionRecord.user_id == User.id, isouter=True)
    if keyword and keyword.strip():
        kw = f"%{keyword.strip()}%"
        query = query.filter(
            or_(
                SolutionRecord.question.like(kw),
                User.username.like(kw),
                and_(User.nickname.isnot(None), User.nickname.like(kw)),
            )
        )
    if user_id and user_id.strip():
        query = query.filter(SolutionRecord.user_id == user_id.strip())
    total = query.count()
    offset = (page - 1) * pageSize
    rows = (
        query.order_by(SolutionRecord.created_at.desc())
        .offset(offset)
        .limit(pageSize)
        .with_entities(SolutionRecord, User)
        .all()
    )

    data: list[AdminRecordItem] = []
    for r, u in rows:
        data.append(
            AdminRecordItem(
                id=r.id,
                question=r.question,
                answer=r.answer,
                created_at=r.created_at.isoformat() if r.created_at else None,
                user_id=r.user_id,
                username=getattr(u, "username", None) if u else None,
                nickname=getattr(u, "nickname", None) if u else None,
            )
        )
    return AdminRecordListResponse(data=data, total=total)


@router.get("/records/{record_id}", response_model=AdminRecordDetailResponse)
def admin_get_record_detail(
    record_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """解题记录详情（管理员可查看所有记录）。"""
    row = (
        db.query(SolutionRecord)
        .join(User, SolutionRecord.user_id == User.id, isouter=True)
        .filter(SolutionRecord.id == record_id)
        .with_entities(SolutionRecord, User)
        .first()
    )
    if not row:
        return AdminRecordDetailResponse(errCode=404, errMsg="记录不存在", data=None)
    r, u = row
    return AdminRecordDetailResponse(
        errCode=0,
        errMsg="success",
        data=AdminRecordDetailItem(
            id=r.id,
            question=r.question,
            answer=r.answer,
            solution=getattr(r, "solution", None),
            knowledge_points=list(getattr(r, "knowledge_points", None) or []),
            semantic_contexts=list(getattr(r, "semantic_contexts", None) or []),
            created_at=r.created_at.isoformat() if r.created_at else None,
            user_id=r.user_id,
            username=getattr(u, "username", None) if u else None,
            nickname=getattr(u, "nickname", None) if u else None,
        ),
    )


@router.delete("/records/{record_id}", response_model=AdminCommonResponse)
def admin_delete_record(
    record_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """删除解题记录（级联删除收藏通过外键约束处理）。"""
    row = db.query(SolutionRecord).filter(SolutionRecord.id == record_id).first()
    if not row:
        return AdminCommonResponse(errCode=404, errMsg="记录不存在", data={})
    try:
        db.delete(row)
        db.commit()
        return AdminCommonResponse(errCode=0, errMsg="success", data={})
    except Exception as e:
        db.rollback()
        return AdminCommonResponse(errCode=500, errMsg=f"删除失败: {str(e)}", data={})


@router.get("/favorites", response_model=AdminFavoriteListResponse)
def admin_list_favorites(
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=100),
    keyword: Optional[str] = Query(None, description="按题目关键字或用户名搜索"),
    user_id: Optional[str] = Query(None, description="按用户ID过滤"),
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """收藏记录列表（包含所属题目与用户信息简要）。"""
    query = db.query(Favorite).join(SolutionRecord, Favorite.record_id == SolutionRecord.id, isouter=True).join(
        User, Favorite.user_id == User.id, isouter=True
    )
    if keyword and keyword.strip():
        kw = f"%{keyword.strip()}%"
        query = query.filter(
            or_(
                SolutionRecord.question.like(kw),
                User.username.like(kw),
                and_(User.nickname.isnot(None), User.nickname.like(kw)),
            )
        )
    if user_id and user_id.strip():
        query = query.filter(Favorite.user_id == user_id.strip())
    total = query.count()
    offset = (page - 1) * pageSize
    rows = (
        query.order_by(Favorite.created_at.desc())
        .offset(offset)
        .limit(pageSize)
        .with_entities(Favorite, SolutionRecord, User)
        .all()
    )

    data: list[AdminFavoriteItem] = []
    for fav, rec, user in rows:
        data.append(
            AdminFavoriteItem(
                id=fav.id,
                record_id=fav.record_id,
                question=getattr(rec, "question", "") if rec else "",
                created_at=fav.created_at.isoformat() if fav.created_at else None,
                user_id=fav.user_id,
                username=getattr(user, "username", None) if user else None,
                nickname=getattr(user, "nickname", None) if user else None,
            )
        )
    return AdminFavoriteListResponse(data=data, total=total)


@router.delete("/favorites/{favorite_id}", response_model=AdminCommonResponse)
def admin_delete_favorite(
    favorite_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """删除收藏记录。"""
    row = db.query(Favorite).filter(Favorite.id == favorite_id).first()
    if not row:
        return AdminCommonResponse(errCode=404, errMsg="收藏不存在", data={})
    try:
        db.delete(row)
        db.commit()
        return AdminCommonResponse(errCode=0, errMsg="success", data={})
    except Exception as e:
        db.rollback()
        return AdminCommonResponse(errCode=500, errMsg=f"删除失败: {str(e)}", data={})


# ---------- 模型 API 连接测试（管理员专用） ----------


def _minimal_solve_model_id(db: Session) -> str:
    """返回当前使用的解题模型 ID（用于连接测试）。"""
    row = db.query(SolveModel).filter(SolveModel.enabled == True).order_by(SolveModel.sort_order, SolveModel.id).first()
    if row and row.model_id:
        return row.model_id.strip()
    return (settings.UNIAPI_MODEL or "gpt-5.2").strip()


@router.get("/test/solve", response_model=AdminCommonResponse)
async def admin_test_solve(
    model_id: Optional[str] = Query(None, description="指定要测试的模型 ID，不传则使用当前默认解题模型"),
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """测试解题模型 API 连接：向指定或当前默认解题模型发送最小请求。"""
    base_url, token = solve_router._get_uniapi_base_and_token(db)
    if not (token and token.strip()):
        return AdminCommonResponse(errCode=400, errMsg="未配置 UniAPI 地址或 Token", data={"success": False})
    use_model_id = (model_id or "").strip() or _minimal_solve_model_id(db)
    messages = [
        {"role": "developer", "content": "You are a helpful assistant. Reply only with the number 2."},
        {"role": "user", "content": "1+1=?"},
    ]
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            await solve_router._call_uniapi(client, use_model_id, messages, base_url, token)
        duration_ms = int((time.perf_counter() - start) * 1000)
        return AdminCommonResponse(errCode=0, errMsg="success", data={"success": True, "durationMs": duration_ms, "model": use_model_id})
    except httpx.TimeoutException:
        return AdminCommonResponse(errCode=500, errMsg="请求超时", data={"success": False})
    except Exception as e:
        return AdminCommonResponse(errCode=500, errMsg=str(e), data={"success": False})


@router.get("/test/knowledge", response_model=AdminCommonResponse)
async def admin_test_knowledge(
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """测试知识点识别模型 API 连接（使用知识点独立配置，未配置则回退解题配置）。"""
    base_url, token = solve_router._get_uniapi_base_and_token_knowledge(db)
    if not (token and token.strip()):
        return AdminCommonResponse(errCode=400, errMsg="未配置 UniAPI 地址或 Token", data={"success": False})
    model_k, _ = solve_router._get_model_knowledge_and_semantic(db)
    messages = [
        {"role": "developer", "content": solve_router.KNOWLEDGE_SYSTEM},
        {"role": "user", "content": "1+1=?"},
    ]
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            await solve_router._call_uniapi(client, model_k, messages, base_url, token)
        duration_ms = int((time.perf_counter() - start) * 1000)
        return AdminCommonResponse(errCode=0, errMsg="success", data={"success": True, "durationMs": duration_ms, "model": model_k})
    except httpx.TimeoutException:
        return AdminCommonResponse(errCode=500, errMsg="请求超时", data={"success": False})
    except Exception as e:
        return AdminCommonResponse(errCode=500, errMsg=str(e), data={"success": False})


@router.get("/test/semantic", response_model=AdminCommonResponse)
async def admin_test_semantic(
    db: Session = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """测试语义情境识别模型 API 连接（使用语义独立配置，未配置则回退解题配置）。"""
    base_url, token = solve_router._get_uniapi_base_and_token_semantic(db)
    if not (token and token.strip()):
        return AdminCommonResponse(errCode=400, errMsg="未配置 UniAPI 地址或 Token", data={"success": False})
    _, model_s = solve_router._get_model_knowledge_and_semantic(db)
    messages = [
        {"role": "developer", "content": solve_router.SEMANTIC_SYSTEM},
        {"role": "user", "content": "1+1=?"},
    ]
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            await solve_router._call_uniapi(client, model_s, messages, base_url, token)
        duration_ms = int((time.perf_counter() - start) * 1000)
        return AdminCommonResponse(errCode=0, errMsg="success", data={"success": True, "durationMs": duration_ms, "model": model_s})
    except httpx.TimeoutException:
        return AdminCommonResponse(errCode=500, errMsg="请求超时", data={"success": False})
    except Exception as e:
        return AdminCommonResponse(errCode=500, errMsg=str(e), data={"success": False})
