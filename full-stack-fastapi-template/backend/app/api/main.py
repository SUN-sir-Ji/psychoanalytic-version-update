from fastapi import APIRouter

from app.api.routes import analysis_records, items, login, private, users, utils
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(analysis_records.router, prefix="/analysis-records", tags=["analysis-records"])


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
