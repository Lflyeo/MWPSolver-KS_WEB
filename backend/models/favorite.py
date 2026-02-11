from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid

class Favorite(Base):
    __tablename__ = "favorites"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    record_id = Column(String(36), ForeignKey("solution_records.id"), nullable=False, comment="解题记录ID")
    user_id = Column(String(36), nullable=True, comment="用户ID(预留)")
    created_at = Column(DateTime, server_default=func.now(), comment="收藏时间")
    
    # 关联关系
    record = relationship("SolutionRecord", backref="favorites")
    
    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "record_id": self.record_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
