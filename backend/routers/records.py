from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional
from datetime import datetime

from database import get_db
from models.favorite import Favorite
from models.record import SolutionRecord
from routers.auth import get_current_user, get_current_user_optional
from schemas.record import (
    RecordCreate,
    RecordSaveApiResponse,
    RecordListResponse,
    RecordDetailApiResponse,
    RecordRemoveResponse,
    RecordStatsResponse,
    RecordResponse,
    RecordDetailResponse,
    KnowledgePoint
)
from config import settings

router = APIRouter(prefix="/records", tags=["解题记录"])


@router.post("/save", response_model=RecordSaveApiResponse)
def save_record(
    record: RecordCreate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """
    保存解题记录（需登录，当前用户 ID 会写入记录）
    """
    try:
        db_record = SolutionRecord(
            question=record.question,
            answer=record.answer,
            solution=record.solution,
            knowledge_points=record.knowledge_points or [],
            semantic_contexts=record.semantic_contexts or [],
            user_id=current_user_id,
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        
        return RecordSaveApiResponse(
            errCode=0,
            errMsg="success",
            data={"id": db_record.id}
        )
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        # 提供更友好的错误提示
        if "Can't connect to MySQL server" in error_msg or "2003" in error_msg:
            error_msg = "数据库连接失败，请检查：1) MySQL 服务是否启动 2) .env 配置是否正确"
        elif "Unknown database" in error_msg or "1049" in error_msg:
            error_msg = f"数据库 '{settings.DB_NAME}' 不存在，请先执行 init_db.sql 创建数据库"
        elif "Access denied" in error_msg or "1045" in error_msg:
            error_msg = "数据库访问被拒绝，请检查用户名和密码是否正确"
        return RecordSaveApiResponse(
            errCode=500,
            errMsg=f"保存失败: {error_msg}",
            data={}
        )

@router.get("/stats", response_model=RecordStatsResponse)
def get_record_stats(
    db: Session = Depends(get_db),
    current_user_id: Optional[str] = Depends(get_current_user_optional),
):
    """
    获取当前用户的解题统计：总条数、有做题的不同天数（学习天数）。
    未登录时统计未关联用户的记录。
    """
    try:
        query = db.query(SolutionRecord)
        if current_user_id is not None:
            query = query.filter(
                (SolutionRecord.user_id == current_user_id) | (SolutionRecord.user_id.is_(None))
            )
        else:
            query = query.filter(SolutionRecord.user_id.is_(None))
        total = query.count()
        # 有做题记录的不同天数：按 created_at 的日期去重计数
        days_query = query.with_entities(func.date(SolutionRecord.created_at)).distinct()
        days_of_learning = days_query.count()
        return RecordStatsResponse(
            errCode=0,
            errMsg="success",
            data={"total": total, "daysOfLearning": days_of_learning},
        )
    except Exception as e:
        return RecordStatsResponse(
            errCode=500,
            errMsg=f"查询失败: {str(e)}",
            data={"total": 0, "daysOfLearning": 0},
        )


@router.get("/list", response_model=RecordListResponse)
def get_record_list(
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(10, ge=1, le=100, description="每页数量"),
    keyword: Optional[str] = Query(None, description="关键词搜索"),
    category: Optional[str] = Query(None, description="分类筛选(knowledge/semantic)"),
    db: Session = Depends(get_db),
    current_user_id: Optional[str] = Depends(get_current_user_optional),
):
    """
    获取解题记录列表（分页）。已登录时仅返回当前用户的记录；未登录时仅返回未关联用户的记录。
    """
    try:
        query = db.query(SolutionRecord)
        if current_user_id is not None:
            query = query.filter(
                (SolutionRecord.user_id == current_user_id) | (SolutionRecord.user_id.is_(None))
            )
        else:
            query = query.filter(SolutionRecord.user_id.is_(None))
        
        # 关键词搜索（搜索题目和答案）
        if keyword:
            query = query.filter(
                or_(
                    SolutionRecord.question.like(f"%{keyword}%"),
                    SolutionRecord.answer.like(f"%{keyword}%")
                )
            )
        
        # 分类筛选（在 knowledge_points 或 semantic_contexts 中查找）
        if category:
            # 注意：MySQL JSON 查询可能因版本而异，这里使用 Python 过滤作为兼容方案
            # 如果需要更高效，可以使用 JSON_CONTAINS 等 SQL 函数
            pass  # 暂时不做 category 筛选，或后续优化
        
        # 按创建时间倒序
        query = query.order_by(SolutionRecord.created_at.desc())
        
        # 总数
        total = query.count()
        
        # 分页
        offset = (page - 1) * pageSize
        records = query.offset(offset).limit(pageSize).all()
        
        # 转换为响应格式
        record_list = []
        for record in records:
            tags = []
            # 添加知识点标签
            if record.knowledge_points:
                for kp in record.knowledge_points:
                    if isinstance(kp, str):
                        tags.append(KnowledgePoint(name=kp, type="knowledge"))
                    elif isinstance(kp, dict) and "name" in kp:
                        tags.append(KnowledgePoint(name=kp["name"], type="knowledge"))
            # 添加语义情境标签
            if record.semantic_contexts:
                for sc in record.semantic_contexts:
                    if isinstance(sc, str):
                        tags.append(KnowledgePoint(name=sc, type="semantic"))
                    elif isinstance(sc, dict) and "name" in sc:
                        tags.append(KnowledgePoint(name=sc["name"], type="semantic"))
            
            # 格式化时间
            time_str = record.created_at.strftime("%Y-%m-%d %H:%M:%S") if record.created_at else ""
            
            record_list.append(RecordResponse(
                id=record.id,
                question=record.question,
                answer=record.answer,
                time=time_str,
                tags=tags
            ))
        
        return RecordListResponse(
            errCode=0,
            errMsg="success",
            data=record_list,
            total=total
        )
    except Exception as e:
        return RecordListResponse(
            errCode=500,
            errMsg=f"查询失败: {str(e)}",
            data=[],
            total=0
        )

@router.get("/detail", response_model=RecordDetailApiResponse)
def get_record_detail(
    id: str = Query(..., description="记录ID"),
    db: Session = Depends(get_db),
    current_user_id: Optional[str] = Depends(get_current_user_optional),
):
    """
    获取解题记录详情。已登录时仅可查看自己的记录；未登录时仅可查看未关联用户的记录。
    """
    try:
        record = db.query(SolutionRecord).filter(SolutionRecord.id == id).first()
        
        if not record:
            return RecordDetailApiResponse(
                errCode=400,
                errMsg="记录不存在",
                data=None
            )
        if record.user_id is not None and record.user_id != current_user_id:
            return RecordDetailApiResponse(
                errCode=403,
                errMsg="无权限查看该记录",
                data=None
            )
        
        # 构建 tags
        tags = []
        if record.knowledge_points:
            for kp in record.knowledge_points:
                if isinstance(kp, str):
                    tags.append(KnowledgePoint(name=kp, type="knowledge"))
                elif isinstance(kp, dict) and "name" in kp:
                    tags.append(KnowledgePoint(name=kp["name"], type="knowledge"))
        if record.semantic_contexts:
            for sc in record.semantic_contexts:
                if isinstance(sc, str):
                    tags.append(KnowledgePoint(name=sc, type="semantic"))
                elif isinstance(sc, dict) and "name" in sc:
                    tags.append(KnowledgePoint(name=sc["name"], type="semantic"))
        
        time_str = record.created_at.strftime("%Y-%m-%d %H:%M:%S") if record.created_at else ""
        
        detail = RecordDetailResponse(
            id=record.id,
            question=record.question,
            answer=record.answer,
            solution=record.solution,
            time=time_str,
            tags=tags
        )
        
        return RecordDetailApiResponse(
            errCode=0,
            errMsg="success",
            data=detail
        )
    except Exception as e:
        return RecordDetailApiResponse(
            errCode=500,
            errMsg=f"查询失败: {str(e)}",
            data=None
        )


@router.delete("/remove", response_model=RecordRemoveResponse)
def remove_record(
    id: str = Query(..., description="记录ID"),
    db: Session = Depends(get_db),
    current_user_id: Optional[str] = Depends(get_current_user_optional),
):
    """
    删除解题记录（同时删除其收藏记录）。仅可删除自己的记录或未关联用户的记录。
    """
    try:
        record = db.query(SolutionRecord).filter(SolutionRecord.id == id).first()
        if not record:
            return RecordRemoveResponse(
                errCode=400,
                errMsg="记录不存在",
                data={}
            )
        if record.user_id is not None and record.user_id != current_user_id:
            return RecordRemoveResponse(
                errCode=403,
                errMsg="无权限删除该记录",
                data={}
            )

        # 先删除收藏（favorites.record_id 外键指向 solution_records.id）
        db.query(Favorite).filter(Favorite.record_id == id).delete(synchronize_session=False)

        # 再删除记录
        db.delete(record)
        db.commit()

        return RecordRemoveResponse(
            errCode=0,
            errMsg="success",
            data={}
        )
    except Exception as e:
        db.rollback()
        return RecordRemoveResponse(
            errCode=500,
            errMsg=f"删除失败: {str(e)}",
            data={}
        )
