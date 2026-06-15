from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from database import db

def get_main_keyboard(user_id: int = None) -> InlineKeyboardMarkup:
    token = None
    if user_id:
        token = db.get_user_token(user_id)
    
    if token:
        btn_connect = InlineKeyboardButton(
            text="Подключить VPN",
            web_app=WebAppInfo(url=f"https://sub-streamnet.bothost.tech/{token}"),
            icon_custom_emoji_id="5323761960829862762"
        )
    else:
        btn_connect = InlineKeyboardButton(
            text="Подключить VPN",
            callback_data="connect_vpn",
            icon_custom_emoji_id="5323761960829862762"
        )
    
    btn_pay = InlineKeyboardButton(
        text="Оплатить подписку",
        callback_data="pay_subscription",
        style="success",
        icon_custom_emoji_id="5258258882022612173"
    )
    
    btn_help = InlineKeyboardButton(
        text="Помощь",
        callback_data="help",
        icon_custom_emoji_id="5260535596941582167"
    )
    
    btn_proxy = InlineKeyboardButton(
        text="Прокси",
        url="https://t.me/proxy?server=proxy.streamnetvpn.top&port=443&secret=ee6d61696c2e7275523ddbee245fd5ee",
        icon_custom_emoji_id="5258073068852485953"
    )
    
    btn_profile = InlineKeyboardButton(
        text="Профиль",
        callback_data="profile",
        icon_custom_emoji_id="5260399854500191689"
    )
    
    btn_about = InlineKeyboardButton(
        text="О сервисе",
        callback_data="about"
    )
    
    return InlineKeyboardMarkup(inline_keyboard=[
        [btn_connect],
        [btn_pay],
        [btn_help, btn_proxy],
        [btn_profile],
        [btn_about]
    ])
