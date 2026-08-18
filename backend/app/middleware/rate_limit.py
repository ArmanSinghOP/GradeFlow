import time
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.config import settings

request_history = {}

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api/v1/health"):
            return await call_next(request)
            
        if not (request.url.path.startswith("/api/v1/evaluate") or request.url.path.startswith("/api/v1/anchors")):
            return await call_next(request)

        if "X-Forwarded-For" in request.headers:
            client_ip = request.headers["X-Forwarded-For"].split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        now = time.time()
        window = settings.rate_limit_window
        limit = settings.rate_limit_requests

        if client_ip not in request_history:
            request_history[client_ip] = []
        
        request_history[client_ip] = [ts for ts in request_history[client_ip] if now - ts < window]

        if len(request_history[client_ip]) >= limit:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Try again later.",
                    "retry_after": window
                }
            )

        request_history[client_ip].append(now)
        return await call_next(request)
