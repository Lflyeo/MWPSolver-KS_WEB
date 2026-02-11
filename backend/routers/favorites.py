from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional

from database import get_db
from models.favorite import Favorite
from models.record import SolutionRecord
from routers.auth import get_current_user, get_current_user_optional
from schemas.favorite import (
    FavoriteCreate,
    FavoriteAddResponse,
    FavoriteRemoveResponse,
    FavoriteListResponse,
    FavoriteCheckResponse,
    FavoriteResponse
)
from schemas.record import KnowledgePoint
from config import settings

router = APIRouter(prefix="/favorites", tags=["收藏"])


@router.post("/add", response_model=FavoriteAddResponse)
def add_favorite(
    favorite: FavoriteCreate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """
    添加收藏（需登录，收藏记录会绑定当前用户 ID）
    """
    try:
        # 检查记录是否存在
        record = db.query(SolutionRecord).filter(SolutionRecord.id == favorite.record_id).first()
        if not record:
            return FavoriteAddResponse(
                errCode=400,
                errMsg="解题记录不存在",
                data={}
            )
        
        # 检查当前用户是否已收藏该记录
        existing = db.query(Favorite).filter(
            Favorite.record_id == favorite.record_id,
            Favorite.user_id == current_user_id,
        ).first()
        if existing:
            return FavoriteAddResponse(
                errCode=400,
                errMsg="已收藏，无需重复收藏",
                data={"id": existing.id}
            )
        
        # 创建收藏记录（写入用户 ID）
        db_favorite = Favorite(
            record_id=favorite.record_id,
            user_id=current_user_id,
        )
        db.add(db_favorite)
        db.commit()
        db.refresh(db_favorite)
        
        return FavoriteAddResponse(
            errCode=0,
            errMsg="success",
            data={"id": db_favorite.id}
        )
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        if "Can't connect to MySQL server" in error_msg or "2003" in error_msg:
            error_msg = "数据库连接失败，请检查：1) MySQL 服务是否启动 2) .env 配置是否正确"
        elif "Unknown database" in error_msg or "1049" in error_msg:
            error_msg = f"数据库 '{settings.DB_NAME}' 不存在，请先执行 init_db.sql 创建数据库"
        elif "Access denied" in error_msg or "1045" in error_msg:
            error_msg = "数据库访问被拒绝，请检查用户名和密码是否正确"
        return FavoriteAddResponse(
            errCode=500,
            errMsg=f"添加收藏失败: {error_msg}",
            data={}
        )

@router.delete("/remove", response_model=FavoriteRemoveResponse)
def remove_favorite(
    record_id: str = Query(..., description="解题记录ID"),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """
    取消收藏（仅可取消自己的收藏）
    """
    try:
        favorite = db.query(Favorite).filter(
            Favorite.record_id == record_id,
            Favorite.user_id == current_user_id,
        ).first()
        
        if not favorite:
            return FavoriteRemoveResponse(
                errCode=400,
                errMsg="收藏记录不存在或无权操作",
                data={}
            )
        
        db.delete(favorite)
        db.commit()
        
        return FavoriteRemoveResponse(
            errCode=0,
            errMsg="success",
            data={}
        )
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        return FavoriteRemoveResponse(
            errCode=500,
            errMsg=f"取消收藏失败: {error_msg}",
            data={}
        )

@router.get("/list", response_model=FavoriteListResponse)
def get_favorite_list(
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(10, ge=1, le=100, description="每页数量"),
    keyword: Optional[str] = Query(None, description="关键词搜索"),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """
    获取收藏列表（分页，仅返回当前用户的收藏）
    """
    try:
        # 关联查询收藏和解题记录，仅当前用户的收藏
        query = db.query(Favorite, SolutionRecord).join(
            SolutionRecord, Favorite.record_id == SolutionRecord.id
        ).filter(Favorite.user_id == current_user_id)
        
        # 关键词搜索（搜索题目和答案）
        if keyword:
            query = query.filter(
                or_(
                    SolutionRecord.question.like(f"%{keyword}%"),
                    SolutionRecord.answer.like(f"%{keyword}%")
                )
            )
        
        # 按收藏时间倒序
        query = query.order_by(Favorite.created_at.desc())
        
        # 总数（在分页前统计）
        total = query.count()
        
        # 分页
        offset = (page - 1) * pageSize
        results = query.offset(offset).limit(pageSize).all()
        
        # 转换为响应格式
        favorite_list = []
        for favorite, record in results:
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
            
            # 格式化收藏时间
            favorite_time = favorite.created_at.strftime("%Y-%m-%d %H:%M:%S") if favorite.created_at else ""
            
            favorite_list.append(FavoriteResponse(
                id=favorite.id,
                record_id=record.id,
                question=record.question,
                answer=record.answer,
                favoriteTime=favorite_time,
                tags=tags
            ))
        
        return FavoriteListResponse(
            errCode=0,
            errMsg="success",
            data=favorite_list,
            total=total
        )
    except Exception as e:
        return FavoriteListResponse(
            errCode=500,
            errMsg=f"查询失败: {str(e)}",
            data=[],
            total=0
        )

@router.get("/check", response_model=FavoriteCheckResponse)
def check_favorite(
    record_id: str = Query(..., description="解题记录ID"),
    db: Session = Depends(get_db),
    current_user_id: Optional[str] = Depends(get_current_user_optional),
):
    """
    检查当前用户是否已收藏该记录（按用户隔离）
    """
    try:
        if current_user_id is None:
            return FavoriteCheckResponse(
                errCode=0,
                errMsg="success",
                data={"is_favorited": False, "favorite_id": None}
            )
        favorite = db.query(Favorite).filter(
            Favorite.record_id == record_id,
            Favorite.user_id == current_user_id,
        ).first()
        
        return FavoriteCheckResponse(
            errCode=0,
            errMsg="success",
            data={
                "is_favorited": favorite is not None,
                "favorite_id": favorite.id if favorite else None
            }
        )
    except Exception as e:
        return FavoriteCheckResponse(
            errCode=500,
            errMsg=f"查询失败: {str(e)}",
            data={"is_favorited": False, "favorite_id": None}
        )
