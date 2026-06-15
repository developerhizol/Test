import asyncio
import logging
from aiogram import Bot, Dispatcher
from config import BOT_TOKEN
from database import db
from handlers import start_router, about_service_router, help_router, connect_router, admin_router

logging.basicConfig(level=logging.INFO)

async def main():
    db._init_db()
    logging.info("База данных инициализирована")
    
    bot = Bot(token=BOT_TOKEN)
    
    dp = Dispatcher()
    dp.include_router(start_router)
    dp.include_router(about_service_router)
    dp.include_router(help_router)
    dp.include_router(connect_router)
    dp.include_router(admin_router)
    
    logging.info("Бот запущен")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())