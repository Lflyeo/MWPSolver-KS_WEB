from sqlalchemy import Column, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from database import Base
import uuid

class SolutionRecord(Base):
    __tablename__ = "solution_records"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question = Column(Text, nullable=False, comment="题目原文")
    answer = Column(String(500), nullable=True, comment="简短答案")
    solution = Column(Text, nullable=True, comment="完整解题过程(Markdown)")
    knowledge_points = Column(JSON, nullable=True, default=list, comment="知识点列表")
    semantic_contexts = Column(JSON, nullable=True, default=list, comment="语义情境列表")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    user_id = Column(String(36), nullable=True, comment="用户ID(预留)")
    
    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "question": self.question,
            "answer": self.answer,
            "solution": self.solution,
            "knowledge_points": self.knowledge_points or [],
            "semantic_contexts": self.semantic_contexts or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "user_id": self.user_id
        }
