import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # 数据库配置
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", 3306))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "mathpro_db")
    
    # 数据库连接URL
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
    
    # API配置
    API_V1_PREFIX = "/api"
    
    # UniAPI 大模型解题（Base URL 与 Token 实际运行时优先从 system_settings 表读取，
    # 这里的环境变量仅作为「后端默认值/回退值」，不再在代码中写死具体地址和密钥）
    UNIAPI_BASE_URL = os.getenv("UNIAPI_BASE_URL", "")
    UNIAPI_TOKEN = os.getenv("UNIAPI_TOKEN", "")
    UNIAPI_MODEL = os.getenv("UNIAPI_MODEL", "gpt-5.2")
    # 可选解题大模型列表（逗号分隔），用于前端下拉与接口校验，如：gpt-5.2,gpt-4o,claude-3-5-sonnet
    UNIAPI_SOLVE_MODELS = os.getenv("UNIAPI_SOLVE_MODELS", "gpt-5.2,gpt-4o,qwen2.5-72b-instruct,deepseek-v3")
    # 知识点识别、语义情境识别专用模型（不配置则与解题使用同一模型）
    UNIAPI_MODEL_KNOWLEDGE = os.getenv("UNIAPI_MODEL_KNOWLEDGE", "") or None
    UNIAPI_MODEL_SEMANTIC = os.getenv("UNIAPI_MODEL_SEMANTIC", "") or None
    
    # JWT 认证
    JWT_SECRET = os.getenv("JWT_SECRET", "mathpro-jwt-secret-change-in-production")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 60 * 24 * 7))  # 默认 7 天

    # 头像上传：目录相对 backend 目录，最大 2MB，允许的扩展名
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
    AVATAR_MAX_BYTES = int(os.getenv("AVATAR_MAX_BYTES", 2 * 1024 * 1024))  # 2MB
    AVATAR_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

    # CORS配置（前端开发默认端口 3000）
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "http://192.168.31.147:5173",
        "http://192.168.31.147:8080",
    ]
    # 本地开发：允许任意 localhost/127.0.0.1 端口（正则）
    CORS_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

    # 管理员端：密钥校验，请求头 X-Admin-Token 或 Authorization: Bearer <ADMIN_SECRET>
    ADMIN_SECRET = os.getenv("ADMIN_SECRET", "MWPSolver-KS-admin-secret-change-in-production")

settings = Settings()
