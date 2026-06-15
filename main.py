import asyncio
import logging
import secrets
from pathlib import Path
from aiohttp import web
from aiogram import Bot, Dispatcher
from config import BOT_TOKEN
from database import db
from handlers import start_router, about_service_router, help_router, admin_router

logging.basicConfig(level=logging.INFO)

PORT = 9283

def generate_token() -> str:
    return secrets.token_urlsafe(9)[:12]

def get_or_create_user_token(user_id: int) -> str:
    token = db.get_user_token(user_id)
    if not token:
        token = generate_token()
        db.save_user_token(user_id, token)
    return token

async def handle_token_info(request):
    token = request.match_info.get('token')
    conn = db._get_connection()
    row = conn.execute("SELECT user_id FROM user_tokens WHERE token = ?", (token,)).fetchone()
    conn.close()
    if not row:
        return web.json_response({"error": "Token not found"}, status=404)
    user_id = row['user_id']
    user = db.get_user(user_id)
    if not user:
        return web.json_response({"error": "User not found"}, status=404)
    is_active = db.is_subscription_active(user_id)
    subscription_end = db.get_subscription_end(user_id)
    response_data = {
        "status": "active" if is_active else "inactive",
        "first_name": user.get('first_name', 'User'),
        "user_id": user_id,
        "expires_at": subscription_end.isoformat() if subscription_end else None
    }
    return web.json_response(response_data)

async def handle_webapp(request):
    index_path = Path(__file__).parent / 'public' / 'index.html'
    if not index_path.exists():
        return web.Response(text="index.html not found", status=404)
    with open(index_path, 'r', encoding='utf-8') as f:
        html = f.read()
    return web.Response(text=html, content_type='text/html')

async def start_webapp():
    app = web.Application()
    app.router.add_get('/api/token/{token}', handle_token_info)
    app.router.add_get('/{token}', handle_webapp)
    app.router.add_get('/', handle_webapp)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', PORT)
    await site.start()
    logging.info(f"Mini App сервер запущен на порту {PORT}")

async def main():
    db._init_db()
    logging.info("База данных инициализирована")
    
    asyncio.create_task(start_webapp())
    
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher()
    dp.include_router(start_router)
    dp.include_router(about_service_router)
    dp.include_router(help_router)
    dp.include_router(admin_router)
    
    logging.info("Бот запущен")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
