from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from database import Base
import uuid


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(64), unique=True, nullable=False, index=True, comment="用户名")
    password_hash = Column(String(128), nullable=False, comment="密码哈希")
    nickname = Column(String(64), nullable=True, comment="昵称/显示名")
    avatar_url = Column(String(512), nullable=True, comment="头像 URL")
    created_at = Column(DateTime, server_default=func.now(), comment="注册时间")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "nickname": self.nickname,
            "avatar_url": self.avatar_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
