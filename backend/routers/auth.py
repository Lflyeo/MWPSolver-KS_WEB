import hashlib
import os
import uuid
from pathlib import Path
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt
import bcrypt

from database import get_db
from models.user import User
from schemas.auth import RegisterRequest, LoginRequest, UserInfo, ProfileUpdateRequest
from config import settings

router = APIRouter(prefix="/auth", tags=["认证"])
http_bearer = HTTPBearer(auto_error=False)


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
) -> str | None:
    """从 JWT 解析当前用户 ID，未携带或无效时返回 None。"""
    if not credentials:
        return None
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload.get("sub")
    except Exception:
        return None


def get_current_user(user_id: str | None = Depends(get_current_user_optional)) -> str:
    """获取当前用户 ID，未登录时抛出 401。"""
    if not user_id:
        raise HTTPException(status_code=401, detail="未登录或登录已过期")
    return user_id


def _to_bcrypt_input(password: str) -> bytes:
    """保证传入 bcrypt 的字节长度不超过 72，避免 ValueError。"""
    raw = password.encode("utf-8")
    if len(raw) > 72:
        return hashlib.sha256(raw).hexdigest().encode("ascii")  # 64 字节
    return raw


def hash_password(password: str) -> str:
    data = _to_bcrypt_input(password)
    return bcrypt.hashpw(data, bcrypt.gensalt()).decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    data = _to_bcrypt_input(plain)
    return bcrypt.checkpw(data, hashed.encode("ascii"))


def create_access_token(user_id: str, username: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": user_id, "username": username, "exp": expire}
    return jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """用户注册"""
    if db.query(User).filter(User.username == req.username).first():
        return {
            "errCode": 400,
            "errMsg": "用户名已被使用",
            "data": {},
        }
    user = User(
        username=req.username,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.username)
    return {
        "errCode": 0,
        "errMsg": "success",
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": {"id": user.id, "username": user.username, "nickname": user.nickname, "avatar_url": user.avatar_url},
        },
    }


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """用户登录"""
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        return {
            "errCode": 401,
            "errMsg": "用户名或密码错误",
            "data": {},
        }
    token = create_access_token(user.id, user.username)
    return {
        "errCode": 0,
        "errMsg": "success",
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": {"id": user.id, "username": user.username, "nickname": user.nickname, "avatar_url": user.avatar_url},
        },
    }


def _get_avatar_upload_dir() -> Path:
    """头像保存目录（backend/uploads/avatars）"""
    base = Path(__file__).resolve().parent.parent
    d = base / settings.UPLOAD_DIR / "avatars"
    d.mkdir(parents=True, exist_ok=True)
    return d


@router.post("/avatar/upload")
def upload_avatar(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user),
):
    """
    上传头像图片（需登录）。返回可访问的 URL 路径（相对路径，前端需拼接 BASE_URL）。
    """
    if not file.filename:
        return {"errCode": 400, "errMsg": "请选择文件", "data": {}}
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.AVATAR_ALLOWED_EXTENSIONS:
        return {
            "errCode": 400,
            "errMsg": f"仅支持图片格式：{', '.join(settings.AVATAR_ALLOWED_EXTENSIONS)}",
            "data": {},
        }
    content = file.file.read()
    if len(content) > settings.AVATAR_MAX_BYTES:
        return {
            "errCode": 400,
            "errMsg": f"图片大小不能超过 {settings.AVATAR_MAX_BYTES // (1024*1024)}MB",
            "data": {},
        }
    file.file.seek(0)
    upload_dir = _get_avatar_upload_dir()
    name = f"{current_user_id}_{uuid.uuid4().hex[:12]}{ext}"
    path = upload_dir / name
    try:
        with open(path, "wb") as f:
            f.write(content)
    except Exception as e:
        return {"errCode": 500, "errMsg": f"保存失败: {e}", "data": {}}
    # 返回相对路径，前端用 BASE_URL + url 得到完整 URL
    url_path = f"/api/{settings.UPLOAD_DIR}/avatars/{name}"
    return {"errCode": 0, "errMsg": "success", "data": {"url": url_path}}


@router.get("/profile")
def get_profile(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """获取当前用户资料（需登录）"""
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        return {"errCode": 401, "errMsg": "用户不存在", "data": {}}
    return {
        "errCode": 0,
        "errMsg": "success",
        "data": {"id": user.id, "username": user.username, "nickname": user.nickname, "avatar_url": user.avatar_url},
    }


@router.patch("/profile")
def update_profile(
    req: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """更新当前用户资料（昵称、头像）"""
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        return {"errCode": 401, "errMsg": "用户不存在", "data": {}}
    if req.nickname is not None:
        user.nickname = req.nickname.strip() or None
    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url.strip() or None
    db.commit()
    db.refresh(user)
    return {
        "errCode": 0,
        "errMsg": "success",
        "data": {"id": user.id, "username": user.username, "nickname": user.nickname, "avatar_url": user.avatar_url},
    }
