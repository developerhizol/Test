require('dotenv').config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 2789;
const WEB_APP_URL = 'https://supportai.bothost.ru';
const HOSTING_URL = 'https://bothost.ru';
const CHANNEL_URL = 'https://t.me/bothostru';

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
    res.json({
        webAppUrl: WEB_APP_URL,
        hostingUrl: HOSTING_URL,
        channelUrl: CHANNEL_URL,
        botName: 'BotHost AI Support'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            telegram: TELEGRAM_TOKEN ? 'CONFIGURED' : 'MISSING',
            server: 'RUNNING'
        }
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public_html', 'index.html'));
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'Пользователь';

    const welcomeMessage = `👋 <b>Здравствуйте, ${userName}!</b>

━━━━━━━━━━━━━━━━━━━━━━

<b>Добро пожаловать в BotHost AI Support!</b>

<b>Чем я могу помочь:</b>

   Анализ логов и ошибок серверов
   Готовые примеры кода на Python, Node.js, Go
   Решение проблем с развёртыванием на BotHost
   Создание Telegram ботов и Mini Apps
   Настройка интеграций и API

━━━━━━━━━━━━━━━━━━━━━━

<b>Выберите действие ниже</b> 👇`;

    bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{
                    text: '🚀 Открыть AI-ассистента',
                    web_app: { url: WEB_APP_URL }
                }],
                [
                    {
                        text: '🎁 Бесплатный хостинг',
                        url: HOSTING_URL
                    },
                    {
                        text: '📢 Наш канал',
                        url: CHANNEL_URL
                    }
                ]
            ]
        }
    });
});

app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
});

bot.on('polling_error', (error) => {
    console.error('❌ Ошибка бота:', error.message);
});
