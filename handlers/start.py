from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message
from datetime import datetime
from database import db
from keyboards.main_menu import get_main_keyboard

router = Router()

def emoji(emoji_id: str, fallback: str) -> str:
    return f'<tg-emoji emoji-id="{emoji_id}">{fallback}</tg-emoji>'

@router.message(CommandStart())
async def cmd_start(message: Message):
    user_id = message.from_user.id
    first_name = message.from_user.first_name
    username = message.from_user.username

    user = db.get_user(user_id)
    is_new = user is None

    if is_new:
        subscription_end = db.create_user(user_id, first_name, username)
        gift_text = "\n\n🎁 В честь первого захода мы подарили вам подписку на 3 дня"
    else:
        subscription_end = user.get("subscription_end")
        if subscription_end:
            subscription_end = datetime.fromisoformat(subscription_end)
        gift_text = ""

    is_active = db.is_subscription_active(user_id)
    
    user_emoji = emoji("5258011929993026890", "👨‍🦱")
    
    if is_active:
        status_emoji = emoji("5276229330131772747", "✅")
        sub_status = "активна"
        end_date_str = subscription_end.strftime('%d %B %Y') if subscription_end else "—"
        sub_line = f"╭ <b>Подписка:</b> <code>{sub_status}</code> {status_emoji}\n╰ <b>До:</b> <code>{end_date_str}</code>"
    else:
        status_emoji = emoji("5276240711795107620", "⚠️")
        sub_status = "истекла"
        sub_line = f"<b>Подписка:</b> <code>{sub_status}</code> {status_emoji}"

    text = (
        f"<blockquote>{user_emoji} <code>{first_name}  [{user_id}]</code></blockquote>\n\n"
        f"{sub_line}"
        f"{gift_text}"
    )

    await message.answer(
        text,
        reply_markup=get_main_keyboard(user_id),
        parse_mode="HTML"
    )
