from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class KnowledgePoint(BaseModel):
    name: str
    type: str = "knowledge"  # "knowledge" 或 "semantic"

class RecordCreate(BaseModel):
    question: str = Field(..., description="题目原文")
    answer: Optional[str] = Field(None, max_length=500, description="简短答案")
    solution: Optional[str] = Field(None, description="完整解题过程(Markdown)")
    knowledge_points: Optional[List[str]] = Field(default_factory=list, description="知识点列表")
    semantic_contexts: Optional[List[str]] = Field(default_factory=list, description="语义情境列表")

class RecordResponse(BaseModel):
    id: str
    question: str
    answer: Optional[str]
    time: str  # created_at 格式化后的时间字符串
    tags: List[KnowledgePoint]  # 合并 knowledge_points 和 semantic_contexts

class RecordDetailResponse(RecordResponse):
    solution: Optional[str]  # 详情页额外包含 solution

class RecordListResponse(BaseModel):
    errCode: int = 0
    errMsg: str = "success"
    data: List[RecordResponse]
    total: int = 0  # 满足条件的总条数，用于个人页展示与分页

class RecordDetailApiResponse(BaseModel):
    errCode: int = 0
    errMsg: str = "success"
    data: Optional[RecordDetailResponse] = None

class RecordSaveApiResponse(BaseModel):
    errCode: int = 0
    errMsg: str = "success"
    data: dict  # {"id": "xxx"}


class RecordRemoveResponse(BaseModel):
    errCode: int = 0
    errMsg: str = "success"
    data: dict = Field(default_factory=dict)


class RecordStatsResponse(BaseModel):
    errCode: int = 0
    errMsg: str = "success"
    data: dict = Field(default_factory=dict)  # {"total": int, "daysOfLearning": int}
