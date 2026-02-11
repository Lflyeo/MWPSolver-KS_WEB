from sqlalchemy import Column, String, Integer, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base


class SolveModel(Base):
    __tablename__ = "solve_models"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_id = Column(String(128), unique=True, nullable=False, index=True, comment="模型ID")
    display_name = Column(String(128), nullable=False, comment="展示名称")
    sort_order = Column(Integer, default=0, comment="排序")
    enabled = Column(Boolean, default=True, comment="是否启用")
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "model_id": self.model_id,
            "display_name": self.display_name,
            "sort_order": self.sort_order,
            "enabled": bool(self.enabled),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
