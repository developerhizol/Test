from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder

def get_admin_main_keyboard():
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(
            text="Рассылка",
            callback_data="admin_broadcast",
            style="primary",
            icon_custom_emoji_id="5771695636411847302"
        ),
        InlineKeyboardButton(
            text="Статистика",
            callback_data="admin_stats",
            style="primary",
            icon_custom_emoji_id="5936143551854285132"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="Разбан",
            callback_data="admin_unban",
            style="success",
            icon_custom_emoji_id="5774022692642492953"
        ),
        InlineKeyboardButton(
            text="Бан",
            callback_data="admin_ban",
            style="danger",
            icon_custom_emoji_id="5774077015388852135"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="Цена",
            callback_data="admin_price",
            style="primary",
            icon_custom_emoji_id="5974217466270716579"
        ),
        InlineKeyboardButton(
            text="Сервера",
            callback_data="admin_servers",
            style="primary",
            icon_custom_emoji_id="5291980250811506652"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="Выдать премиум",
            callback_data="admin_give_premium",
            style="success",
            icon_custom_emoji_id="6023940002008799618"
        ),
        InlineKeyboardButton(
            text="Забрать премиум",
            callback_data="admin_take_premium",
            style="danger",
            icon_custom_emoji_id="6021852682262682598"
        )
    )
    return builder.as_markup()

def get_admin_back_keyboard(callback_data: str = "admin_panel"):
    builder = InlineKeyboardBuilder()
    builder.button(
        text="« Назад",
        callback_data=callback_data,
        style="default"
    )
    return builder.as_markup()

def get_cancel_keyboard(back_callback: str = "admin_panel"):
    builder = InlineKeyboardBuilder()
    builder.button(
        text="Отмена",
        callback_data=back_callback,
        style="danger",
        icon_custom_emoji_id="5774077015388852135"
    )
    return builder.as_markup()

def get_confirm_keyboard(confirm_callback: str, cancel_callback: str):
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(
            text="Да",
            callback_data=confirm_callback,
            style="success",
            icon_custom_emoji_id="5774022692642492953"
        ),
        InlineKeyboardButton(
            text="Нет",
            callback_data=cancel_callback,
            style="danger",
            icon_custom_emoji_id="5774077015388852135"
        )
    )
    return builder.as_markup()

def get_servers_management_keyboard():
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(
            text="Количество серверов",
            callback_data="admin_servers_count",
            style="primary",
            icon_custom_emoji_id="5938539885907415367"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="Удалить сервер",
            callback_data="admin_server_remove",
            style="danger",
            icon_custom_emoji_id="5774077015388852135"
        ),
        InlineKeyboardButton(
            text="Добавить сервер",
            callback_data="admin_server_add",
            style="success",
            icon_custom_emoji_id="5818711397860642669"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="Очистить все серверы",
            callback_data="admin_server_clear",
            style="danger",
            icon_custom_emoji_id="5774077015388852135"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="« Назад",
            callback_data="admin_panel",
            style="default"
        )
    )
    return builder.as_markup()

def get_broadcast_choice_keyboard():
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(
            text="Своя рассылка",
            callback_data="broadcast_custom",
            style="success",
            icon_custom_emoji_id="5818711397860642669"
        ),
        InlineKeyboardButton(
            text="Готовая рассылка",
            callback_data="broadcast_ready",
            style="primary",
            icon_custom_emoji_id="5771695636411847302"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="« Назад",
            callback_data="admin_panel",
            style="default"
        )
    )
    return builder.as_markup()