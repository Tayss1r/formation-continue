"""
News API endpoints for public news/announcements display on landing page.
Also includes Staff CRUD endpoints for managing news.
"""

from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import selectinload

from ..db.database import get_session
from ..db.models import News, User, UserRole
from ..dependencies import get_staff_user

news_router = APIRouter()


# ========================
# PUBLIC ENDPOINTS
# ========================

@news_router.get("/public")
async def get_public_news(
    page: int = Query(1, ge=1),
    per_page: int = Query(6, ge=1, le=20),
    featured_only: bool = Query(False),
    session: AsyncSession = Depends(get_session)
):
    """
    Get published news for the landing page.
    Public endpoint, no authentication required.
    """
    # Base query for published news
    base_query = select(News).where(News.is_published == True)
    
    if featured_only:
        base_query = base_query.where(News.is_featured == True)
    
    # Get total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await session.execute(count_query)).scalar() or 0
    
    # Get paginated results
    offset = (page - 1) * per_page
    query = (
        base_query
        .options(selectinload(News.created_by))
        .order_by(News.is_featured.desc(), News.published_at.desc(), News.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    
    result = await session.execute(query)
    news_items = result.scalars().all()
    
    import math
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    
    def _get_excerpt(item):
        if item.excerpt:
            return item.excerpt
        if item.content:
            return (item.content[:200] + "...") if len(item.content) > 200 else item.content
        return ""

    def _serialize_datetime(dt):
        if dt is None:
            return None
        return dt.isoformat() if hasattr(dt, 'isoformat') else str(dt)

    return {
        "news": [
            {
                "id": item.id,
                "title": item.title,
                "excerpt": _get_excerpt(item),
                "image_path": item.image_path,
                "is_featured": item.is_featured,
                "published_at": _serialize_datetime(item.published_at or item.created_at),
                "author": item.created_by.fullname if item.created_by else "Admin",
            }
            for item in news_items
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }


@news_router.get("/public/{news_id}")
async def get_news_details(
    news_id: int,
    session: AsyncSession = Depends(get_session)
):
    """
    Get details of a specific news item.
    Public endpoint.
    """
    query = (
        select(News)
        .options(selectinload(News.created_by))
        .where(News.id == news_id, News.is_published == True)
    )
    
    result = await session.execute(query)
    news = result.scalar_one_or_none()
    
    if not news:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="News not found"
        )
    
    return {
        "id": news.id,
        "title": news.title,
        "content": news.content,
        "excerpt": news.excerpt,
        "image_path": news.image_path,
        "is_featured": news.is_featured,
        "published_at": news.published_at or news.created_at,
        "author": news.created_by.fullname if news.created_by else "Admin",
    }


# ========================
# STAFF CRUD ENDPOINTS
# ========================

def _serialize_news(item: News) -> dict:
    """Serialize a News model to dict."""
    return {
        "id": item.id,
        "title": item.title,
        "content": item.content,
        "excerpt": item.excerpt,
        "image_path": item.image_path,
        "is_published": item.is_published,
        "is_featured": item.is_featured,
        "published_at": item.published_at.isoformat() if item.published_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        "author": item.created_by.fullname if item.created_by else "Admin",
    }


@news_router.get("/staff/list")
async def staff_list_news(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all news (published and unpublished) for staff management.
    Staff only.
    """
    import math

    base_query = select(News)
    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await session.execute(count_query)).scalar() or 0

    offset = (page - 1) * per_page
    query = (
        base_query
        .options(selectinload(News.created_by))
        .order_by(News.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )

    result = await session.execute(query)
    news_items = result.scalars().all()

    total_pages = math.ceil(total / per_page) if total > 0 else 1

    return {
        "news": [_serialize_news(item) for item in news_items],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }


@news_router.post("/staff/create")
async def staff_create_news(
    title: str = Query(...),
    content: str = Query(...),
    excerpt: str = Query(None),
    is_published: bool = Query(True),
    is_featured: bool = Query(False),
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a new news item. Staff only.
    """
    news = News(
        title=title,
        content=content,
        excerpt=excerpt,
        is_published=is_published,
        is_featured=is_featured,
        created_by_id=current_user.id,
        published_at=datetime.now(timezone.utc) if is_published else None,
    )
    session.add(news)
    await session.commit()
    await session.refresh(news, attribute_names=["created_by"])
    
    return _serialize_news(news)


@news_router.post("/staff/create-json")
async def staff_create_news_json(
    data: dict,
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a new news item from JSON body. Staff only.
    """
    title = data.get("title")
    content = data.get("content")
    if not title or not content:
        raise HTTPException(status_code=400, detail="Title and content are required")

    is_published = data.get("is_published", True)

    news = News(
        title=title,
        content=content,
        excerpt=data.get("excerpt"),
        is_published=is_published,
        is_featured=data.get("is_featured", False),
        created_by_id=current_user.id,
        published_at=datetime.now(timezone.utc) if is_published else None,
    )
    session.add(news)
    await session.commit()
    await session.refresh(news, attribute_names=["created_by"])

    return _serialize_news(news)


@news_router.put("/staff/{news_id}")
async def staff_update_news(
    news_id: int,
    data: dict,
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Update a news item. Staff only.
    """
    query = select(News).options(selectinload(News.created_by)).where(News.id == news_id)
    result = await session.execute(query)
    news = result.scalar_one_or_none()

    if not news:
        raise HTTPException(status_code=404, detail="News not found")

    if "title" in data:
        news.title = data["title"]
    if "content" in data:
        news.content = data["content"]
    if "excerpt" in data:
        news.excerpt = data["excerpt"]
    if "is_published" in data:
        news.is_published = data["is_published"]
        if data["is_published"] and not news.published_at:
            news.published_at = datetime.now(timezone.utc)
    if "is_featured" in data:
        news.is_featured = data["is_featured"]

    await session.commit()
    await session.refresh(news, attribute_names=["created_by"])

    return _serialize_news(news)


@news_router.delete("/staff/{news_id}")
async def staff_delete_news(
    news_id: int,
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Delete a news item. Staff only.
    """
    query = select(News).where(News.id == news_id)
    result = await session.execute(query)
    news = result.scalar_one_or_none()

    if not news:
        raise HTTPException(status_code=404, detail="News not found")

    await session.delete(news)
    await session.commit()

    return {"message": "News deleted successfully"}
