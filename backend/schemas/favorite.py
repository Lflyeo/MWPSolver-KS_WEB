from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from .record import KnowledgePoint

class FavoriteCreate(BaseModel):
    record_id: str = Field(..., description="解题记录ID")

class FavoriteResponse(BaseModel):
    id: str
    record_id: str
    question: str
    answer: Optional[str]
    favoriteTime: str  # created_at 格式化后的时间字符串
    tags: List[KnowledgePoint]  # 从关联的 record 中获取

class FavoriteListResponse(BaseModel):
    errCode: int = 0
    errMsg: str = "success"
    data: List[FavoriteResponse]
    total: int = 0  # 满足条件的总条数，用于个人页展示与分页

class FavoriteAddResponse(BaseModel):
    errCode: int = 0
    errMsg: str = "success"
    data: dict  # {"id": "xxx"}

class FavoriteRemoveResponse(BaseModel):
    errCode: int = 0
    errMsg: str = "success"
    data: dict

class FavoriteCheckResponse(BaseModel):
    errCode: int = 0
    errMsg: str = "success"
    data: dict  # {"is_favorited": true/false, "favorite_id": "xxx"}
