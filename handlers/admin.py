import asyncio
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery
from config import ADMIN_ID
from database import db
from utils.admin_utils import get_servers_from_file, add_server_to_file, remove_server_from_file, clear_servers_file
from keyboards.admin_keyboards import (
    get_admin_main_keyboard, get_admin_back_keyboard, get_cancel_keyboard,
    get_confirm_keyboard, get_servers_management_keyboard, get_broadcast_choice_keyboard
)

router = Router()
admin_state = {}
pending_broadcast = {}

def emoji(emoji_id: str, fallback: str) -> str:
    return f'<tg-emoji emoji-id="{emoji_id}">{fallback}</tg-emoji>'

async def send_safe_message(chat_id: int, text: str, reply_markup=None):
    from handlers.start import bot
    try:
        return await bot.send_message(chat_id, text=text, reply_markup=reply_markup, parse_mode="HTML")
    except Exception:
        return await bot.send_message(chat_id, text=text, reply_markup=reply_markup, parse_mode=None)

@router.message(Command("admin"))
async def cmd_admin(message: Message):
    if message.from_user.id != ADMIN_ID:
        return
    await message.answer(
        f"{emoji('5904630315946611415', '👨‍💻')} <b>Админ панель</b>",
        reply_markup=get_admin_main_keyboard(),
        parse_mode="HTML"
    )

@router.message(Command("stats"))
async def cmd_stats(message: Message):
    if message.from_user.id != ADMIN_ID:
        return
    stats = db.get_stats()
    text = (
        f"{emoji('5936143551854285132', '📊')} <b>Статистика</b>\n\n"
        f"{emoji('6032609071373226027', '👥')} <b>Пользователи:</b> {stats['total_users']}"
    )
    await message.answer(text, parse_mode="HTML")

@router.callback_query(F.data == "admin_panel")
async def admin_panel(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.edit_text(
        f"{emoji('5904630315946611415', '👨‍💻')} <b>Админ панель</b>",
        reply_markup=get_admin_main_keyboard(),
        parse_mode="HTML"
    )

@router.callback_query(F.data == "admin_stats")
async def admin_stats(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    stats = db.get_stats()
    text = (
        f"{emoji('5936143551854285132', '📊')} <b>Статистика</b>\n\n"
        f"{emoji('6032609071373226027', '👥')} <b>Пользователи</b>\n"
        f"• За день: {stats['today_users']}\n"
        f"• За неделю: {stats['week_users']}\n"
        f"• За месяц: {stats['month_users']}\n"
        f"• Всего: {stats['total_users']}\n\n"
        f"{emoji('5987880246865565644', '💰')} <b>Пополнения</b>\n"
        f"• За день: {stats['today_payments']} ₽\n"
        f"• За неделю: {stats['week_payments']} ₽\n"
        f"• За месяц: {stats['month_payments']} ₽\n"
        f"• Всего: {stats['total_payments']} ₽\n\n"
        f"{emoji('6030664675253820292', '💎')} <b>Продажи премиума</b>\n"
        f"• За день: {stats['today_sales']} ₽\n"
        f"• За неделю: {stats['week_sales']} ₽\n"
        f"• За месяц: {stats['month_sales']} ₽\n"
        f"• Всего: {stats['total_sales']} ₽"
    )
    await callback.message.edit_text(text, reply_markup=get_admin_back_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "admin_ban")
async def admin_ban_start(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.edit_text(
        f"{emoji('5774077015388852135', '🔒')} <b>Отправьте ID пользователя для бана:</b>",
        reply_markup=get_cancel_keyboard(),
        parse_mode="HTML"
    )
    admin_state[callback.from_user.id] = {"action": "ban", "msg_id": callback.message.message_id, "chat_id": callback.message.chat.id}

@router.callback_query(F.data == "admin_unban")
async def admin_unban_start(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.edit_text(
        f"{emoji('5774022692642492953', '🔓')} <b>Отправьте ID пользователя для разбана:</b>",
        reply_markup=get_cancel_keyboard(),
        parse_mode="HTML"
    )
    admin_state[callback.from_user.id] = {"action": "unban", "msg_id": callback.message.message_id, "chat_id": callback.message.chat.id}

@router.callback_query(F.data == "admin_give_premium")
async def admin_give_premium_start(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.edit_text(
        f"{emoji('6023940002008799618', '👑')} <b>Отправьте ID пользователя для выдачи премиума (30 дней):</b>",
        reply_markup=get_cancel_keyboard(),
        parse_mode="HTML"
    )
    admin_state[callback.from_user.id] = {"action": "give_premium", "msg_id": callback.message.message_id, "chat_id": callback.message.chat.id}

@router.callback_query(F.data == "admin_take_premium")
async def admin_take_premium_start(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.edit_text(
        f"{emoji('6021852682262682598', '👎')} <b>Отправьте ID пользователя для забора премиума:</b>",
        reply_markup=get_cancel_keyboard(),
        parse_mode="HTML"
    )
    admin_state[callback.from_user.id] = {"action": "take_premium", "msg_id": callback.message.message_id, "chat_id": callback.message.chat.id}

@router.callback_query(F.data == "admin_price")
async def admin_price_start(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.edit_text(
        f"{emoji('5974217466270716579', '💰')} <b>Отправьте новую цену тарифа (только число):</b>",
        reply_markup=get_cancel_keyboard(),
        parse_mode="HTML"
    )
    admin_state[callback.from_user.id] = {"action": "price", "msg_id": callback.message.message_id, "chat_id": callback.message.chat.id}

@router.callback_query(F.data == "admin_servers")
async def admin_servers(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.edit_text(
        f"{emoji('5291980250811506652', '🖥️')} <b>Управление серверами</b>",
        reply_markup=get_servers_management_keyboard(),
        parse_mode="HTML"
    )

@router.callback_query(F.data == "admin_servers_count")
async def admin_servers_count(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    servers = get_servers_from_file()
    if servers:
        text = f"{emoji('5938539885907415367', '📈')} <b>Список серверов:</b>\n\n" + "\n".join([f"{s['id']}. {s['name']}" for s in servers])
    else:
        text = f"{emoji('5774077015388852135', '❌')} <b>Серверы не найдены</b>"
    await callback.message.edit_text(text, reply_markup=get_admin_back_keyboard("admin_servers"), parse_mode="HTML")

@router.callback_query(F.data == "admin_server_add")
async def admin_server_add_prompt(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.edit_text(
        f"{emoji('5818711397860642669', '➕')} <b>Отправьте ссылку на сервер (или несколько, каждую с новой строки):</b>\n\n"
        f"<i>Также можно отправить TXT файл со списком ссылок</i>",
        reply_markup=get_cancel_keyboard("admin_servers"),
        parse_mode="HTML"
    )
    admin_state[callback.from_user.id] = {"action": "add_server", "msg_id": callback.message.message_id, "chat_id": callback.message.chat.id}

@router.callback_query(F.data == "admin_server_remove")
async def admin_server_remove_prompt(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    servers = get_servers_from_file()
    if not servers:
        await callback.answer("Нет серверов для удаления", show_alert=True)
        return
    text = f"{emoji('5774077015388852135', '🗑️')} <b>Выберите номер сервера для удаления:</b>\n\n" + "\n".join([f"{s['id']}. {s['name']}" for s in servers])
    await callback.message.edit_text(text, reply_markup=get_cancel_keyboard("admin_servers"), parse_mode="HTML")
    admin_state[callback.from_user.id] = {"action": "remove_server", "msg_id": callback.message.message_id, "chat_id": callback.message.chat.id}

@router.callback_query(F.data == "admin_server_clear")
async def admin_server_clear_confirm(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.edit_text(
        f"{emoji('5776240711795107620', '⚠️')} <b>Вы точно хотите очистить весь список серверов?</b>",
        reply_markup=get_confirm_keyboard("admin_server_clear_confirm", "admin_servers"),
        parse_mode="HTML"
    )

@router.callback_query(F.data == "admin_server_clear_confirm")
async def admin_server_clear_do(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    clear_servers_file()
    await callback.message.edit_text(
        f"{emoji('5774022692642492953', '✅')} <b>Список серверов очищен</b>",
        reply_markup=get_admin_back_keyboard("admin_servers"),
        parse_mode="HTML"
    )

@router.message(F.text, lambda message: admin_state.get(message.from_user.id, {}).get("action") in ["ban", "unban", "give_premium", "take_premium", "price", "add_server", "remove_server"])
async def handle_admin_text_input(message: Message):
    user_id = message.from_user.id
    if user_id != ADMIN_ID:
        return
    state = admin_state.get(user_id, {})
    action = state.get("action")
    if not action:
        return

    if action == "price":
        try:
            new_price = int(message.text.strip())
            if new_price < 1:
                await message.answer(f"{emoji('5774077015388852135', '❌')} <b>Цена должна быть больше 0!</b>", parse_mode="HTML")
                return
            await message.answer(f"{emoji('5774022692642492953', '✅')} <b>Цена изменена на {new_price} ₽</b>", parse_mode="HTML")
        except ValueError:
            await message.answer(f"{emoji('5774077015388852135', '❌')} <b>Введите число</b>", parse_mode="HTML")

    elif action == "ban":
        try:
            target_id = int(message.text.strip())
            if db.is_user_banned(target_id):
                await message.answer(f"{emoji('5776240711795107620', '⚠️')} <b>Пользователь {target_id} уже забанен</b>", parse_mode="HTML")
            else:
                db.ban_user(target_id)
                await message.answer(f"{emoji('5774022692642492953', '✅')} <b>Пользователь {target_id} забанен</b>", parse_mode="HTML")
        except ValueError:
            await message.answer(f"{emoji('5774077015388852135', '❌')} <b>Неверный ID</b>", parse_mode="HTML")

    elif action == "unban":
        try:
            target_id = int(message.text.strip())
            if not db.is_user_banned(target_id):
                await message.answer(f"{emoji('5776240711795107620', '⚠️')} <b>Пользователь {target_id} не забанен</b>", parse_mode="HTML")
            else:
                db.unban_user(target_id)
                await message.answer(f"{emoji('5774022692642492953', '✅')} <b>Пользователь {target_id} разбанен</b>", parse_mode="HTML")
        except ValueError:
            await message.answer(f"{emoji('5774077015388852135', '❌')} <b>Неверный ID</b>", parse_mode="HTML")

    elif action == "give_premium":
        try:
            target_id = int(message.text.strip())
            if db.check_premium_active(target_id):
                await message.answer(f"{emoji('5776240711795107620', '⚠️')} <b>У пользователя {target_id} уже активен премиум</b>", parse_mode="HTML")
            else:
                db.activate_premium(target_id, days=30)
                await message.answer(f"{emoji('5774022692642492953', '✅')} <b>Пользователю {target_id} выдан премиум на 30 дней</b>", parse_mode="HTML")
                from handlers.start import bot
                try:
                    await bot.send_message(target_id, f"{emoji('6023940002008799618', '👑')} <b>Администратор выдал вам премиум-доступ на 30 дней!</b>", parse_mode="HTML")
                except Exception:
                    pass
        except ValueError:
            await message.answer(f"{emoji('5774077015388852135', '❌')} <b>Неверный ID</b>", parse_mode="HTML")

    elif action == "take_premium":
        try:
            target_id = int(message.text.strip())
            if not db.check_premium_active(target_id):
                await message.answer(f"{emoji('5776240711795107620', '⚠️')} <b>У пользователя {target_id} нет активного премиума</b>", parse_mode="HTML")
            else:
                db.disable_premium(target_id)
                await message.answer(f"{emoji('5774022692642492953', '✅')} <b>У пользователя {target_id} забран премиум</b>", parse_mode="HTML")
                from handlers.start import bot
                try:
                    await bot.send_message(target_id, f"{emoji('5776240711795107620', '⚠️')} <b>Администратор забрал у вас премиум-доступ</b>", parse_mode="HTML")
                except Exception:
                    pass
        except ValueError:
            await message.answer(f"{emoji('5774077015388852135', '❌')} <b>Неверный ID</b>", parse_mode="HTML")

    elif action == "add_server":
        lines = message.text.strip().splitlines()
        added = 0
        for line in lines:
            line = line.strip()
            if line:
                add_server_to_file(line)
                added += 1
        await message.answer(f"{emoji('5774022692642492953', '✅')} <b>Добавлено {added} серверов</b>", parse_mode="HTML")

    elif action == "remove_server":
        try:
            idx = int(message.text.strip())
            servers = get_servers_from_file()
            if 1 <= idx <= len(servers):
                remove_server_from_file(idx)
                await message.answer(f"{emoji('5774022692642492953', '✅')} <b>Сервер {idx} удалён</b>", parse_mode="HTML")
            else:
                await message.answer(f"{emoji('5774077015388852135', '❌')} <b>Неверный номер сервера</b>", parse_mode="HTML")
        except ValueError:
            await message.answer(f"{emoji('5774077015388852135', '❌')} <b>Введите число</b>", parse_mode="HTML")

    from handlers.start import bot
    await bot.edit_message_text(
        chat_id=state["chat_id"],
        message_id=state["msg_id"],
        text=f"{emoji('5904630315946611415', '👨‍💻')} <b>Админ панель</b>",
        reply_markup=get_admin_main_keyboard(),
        parse_mode="HTML"
    )
    del admin_state[user_id]

@router.callback_query(F.data == "admin_broadcast")
async def admin_broadcast_start(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.edit_text(
        f"{emoji('5771695636411847302', '📢')} <b>Выберите тип рассылки:</b>",
        reply_markup=get_broadcast_choice_keyboard(),
        parse_mode="HTML"
    )

@router.callback_query(F.data == "broadcast_custom")
async def broadcast_custom_start(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.edit_text(
        f"{emoji('5818711397860642669', '📝')} <b>Отправьте сообщение для рассылки (текст, фото, видео):</b>",
        reply_markup=get_cancel_keyboard("admin_panel"),
        parse_mode="HTML"
    )
    admin_state[callback.from_user.id] = {"action": "broadcast_wait_message", "msg_id": callback.message.message_id, "chat_id": callback.message.chat.id}

@router.callback_query(F.data == "broadcast_ready")
async def broadcast_ready_start(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.edit_text(
        f"{emoji('5771695636411847302', '📋')} <b>Отправьте готовое сообщение для рассылки:</b>",
        reply_markup=get_cancel_keyboard("admin_panel"),
        parse_mode="HTML"
    )
    admin_state[callback.from_user.id] = {"action": "broadcast_wait_ready_message", "msg_id": callback.message.message_id, "chat_id": callback.message.chat.id}

@router.message(F.chat.type == "private", lambda message: admin_state.get(message.from_user.id, {}).get("action") == "broadcast_wait_ready_message")
async def handle_ready_broadcast_message(message: Message):
    user_id = message.from_user.id
    if user_id != ADMIN_ID:
        return
    pending_broadcast[user_id] = {"message": message, "type": "ready"}
    del admin_state[user_id]
    await show_broadcast_preview(message, user_id)

@router.message(F.chat.type == "private", lambda message: admin_state.get(message.from_user.id, {}).get("action") == "broadcast_wait_message")
async def handle_broadcast_message(message: Message):
    user_id = message.from_user.id
    if user_id != ADMIN_ID:
        return
    pending_broadcast[user_id] = {"message": message, "type": "custom"}
    admin_state[user_id]["action"] = "broadcast_wait_buttons"
    await message.answer(
        "<b>➕ Добавление кнопок</b>\n\n"
        "• Новая строка = новая кнопка\n"
        "• Несколько кнопок в ряд — раздели через |\n"
        "• Цвет в конце: зелёный, синий или красный\n\n"
        "<b>Пример:</b>\n"
        "<code>Поддержка — https://t.me/StreamNetAdmin — зелёный</code>\n\n"
        "Отправьте кнопки или нажмите «Пропустить»:",
        reply_markup=get_confirm_keyboard("skip_buttons", "cancel_broadcast"),
        parse_mode="HTML"
    )

@router.callback_query(F.data == "skip_buttons")
async def skip_buttons(callback: CallbackQuery):
    user_id = callback.from_user.id
    if user_id != ADMIN_ID:
        await callback.answer()
        return
    pending_broadcast[user_id]["buttons"] = None
    del admin_state[user_id]
    await show_broadcast_preview(callback.message, user_id)
    await callback.answer()

@router.callback_query(F.data == "cancel_broadcast")
async def cancel_broadcast(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    pending_broadcast.pop(callback.from_user.id, None)
    admin_state.pop(callback.from_user.id, None)
    await callback.message.edit_text(
        f"{emoji('5904630315946611415', '👨‍💻')} <b>Админ панель</b>",
        reply_markup=get_admin_main_keyboard(),
        parse_mode="HTML"
    )

@router.callback_query(F.data == "confirm_broadcast")
async def confirm_broadcast(callback: CallbackQuery):
    user_id = callback.from_user.id
    if user_id != ADMIN_ID:
        await callback.answer()
        return
    await callback.answer()
    data = pending_broadcast.get(user_id, {})
    msg = data.get("message")
    if not msg:
        await callback.answer("Нет данных для рассылки", show_alert=True)
        return

    users = db.get_all_users()
    await callback.message.edit_text(f"{emoji('5771695636411847302', '📢')} <b>Рассылка начата...</b>", parse_mode="HTML")

    success = 0
    for user in users:
        try:
            if msg.text:
                await send_safe_message(user, msg.text)
            elif msg.photo:
                from handlers.start import bot
                await bot.send_photo(user, msg.photo[-1].file_id, caption=msg.caption)
            elif msg.video:
                from handlers.start import bot
                await bot.send_video(user, msg.video.file_id, caption=msg.caption)
            success += 1
            await asyncio.sleep(0.05)
        except Exception as e:
            print(f"Broadcast error to {user}: {e}")

    del pending_broadcast[user_id]
    await callback.message.edit_text(
        f"{emoji('5774022692642492953', '✅')} <b>Рассылка завершена!</b>\n\nОтправлено: {success} / {len(users)} пользователям",
        reply_markup=get_admin_back_keyboard(),
        parse_mode="HTML"
    )

async def show_broadcast_preview(source, user_id: int):
    data = pending_broadcast.get(user_id, {})
    msg = data.get("message")
    if not msg:
        await source.answer("Ошибка: данные не найдены")
        return

    await source.answer(f"{emoji('5253959125838090076', '👁️')} <b>Предпросмотр рассылки:</b>", parse_mode="HTML")
    if msg.text:
        await source.answer(msg.text)
    elif msg.photo:
        await source.answer_photo(msg.photo[-1].file_id, caption=msg.caption)
    elif msg.video:
        await source.answer_video(msg.video.file_id, caption=msg.caption)

    await source.answer(
        f"{emoji('5884510167986343350', '❓')} <b>Вы точно хотите разослать это сообщение всем пользователям?</b>",
        reply_markup=get_confirm_keyboard("confirm_broadcast", "cancel_broadcast"),
        parse_mode="HTML"
    )