from typing import List

from pydantic import BaseModel, Field


class SolveRequest(BaseModel):
    question: str = Field(..., description="题目内容")
    model: str | None = Field(None, description="解题大模型 ID，不传则使用后端默认配置")
    knowledge_points: List[str] | None = Field(None, description="已识别的知识点，传入则跳过识别步骤")
    semantic_contexts: List[str] | None = Field(None, description="已识别的语义情境，传入则跳过识别步骤")


class SolveResponse(BaseModel):
    errCode: int = 0
    errMsg: str = "success"
    # content: 解题过程; knowledge_points / semantic_contexts: 识别结果，供保存记录与增强解题
    data: dict = Field(default_factory=dict)


class AnalyzeRequest(BaseModel):
    question: str = Field(..., description="题目内容")


class AnalyzeResponse(BaseModel):
    errCode: int = 0
    errMsg: str = "success"
    data: dict = Field(default_factory=dict)  # { knowledge_points: [], semantic_contexts: [] }
