require('dotenv').config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 8080;
const WEB_APP_URL = 'https://aisupport.bothost.ru';
const HOSTING_URL = 'https://bothost.ru';
const CHANNEL_URL = 'https://t.me/bothostru';

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ===== ФУНКЦИИ ДЛЯ ЛОГИРОВАНИЯ =====
function log(message, data = null) {
    const timestamp = new Date().toISOString();
    if (data) {
        console.log(`[${timestamp}] 📝 ${message}`, data);
    } else {
        console.log(`[${timestamp}] 📝 ${message}`);
    }
}

function logRequest(req, type = 'REQUEST') {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] 🔄 ${type}: ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`[${timestamp}] 📦 Body:`, JSON.stringify(req.body, null, 2));
    }
}

function logSuccess(message, data = null) {
    const timestamp = new Date().toISOString();
    if (data) {
        console.log(`[${timestamp}] ✅ ${message}`, data);
    } else {
        console.log(`[${timestamp}] ✅ ${message}`);
    }
}

function logError(message, error = null) {
    const timestamp = new Date().toISOString();
    if (error) {
        console.error(`[${timestamp}] ❌ ${message}`, error);
        if (error.stack) {
            console.error(`[${timestamp}] Stack:`, error.stack);
        }
    } else {
        console.error(`[${timestamp}] ❌ ${message}`);
    }
}

function logWarning(message, data = null) {
    const timestamp = new Date().toISOString();
    if (data) {
        console.warn(`[${timestamp}] ⚠️ ${message}`, data);
    } else {
        console.warn(`[${timestamp}] ⚠️ ${message}`);
    }
}

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// Логирование всех запросов
app.use((req, res, next) => {
    logRequest(req);
    next();
});

app.use(express.static(path.join(__dirname, 'public_html')));

// ===== API ENDPOINTS =====
app.get('/api/config', (req, res) => {
    logRequest(req, 'GET CONFIG');
    res.json({
        webAppUrl: WEB_APP_URL,
        hostingUrl: HOSTING_URL,
        channelUrl: CHANNEL_URL,
        botName: 'BotHost AI Support'
    });
    logSuccess('Конфиг отправлен');
});

app.get('/api/health', (req, res) => {
    logRequest(req, 'HEALTH CHECK');
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            telegram: TELEGRAM_TOKEN ? 'CONFIGURED' : 'MISSING',
            server: 'RUNNING'
        }
    });
    logSuccess('Health check ответ отправлен');
});

// Прокси для OpenRouter (чтобы ключ был на сервере)
app.post('/api/ai', async (req, res) => {
    logRequest(req, 'AI REQUEST');
    
    try {
        const { messages } = req.body;
        const lastMessage = messages[messages.length - 1];
        const userMessage = lastMessage?.content || '';
        
        log(`👤 Сообщение пользователя: "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}"`);
        log(`📊 Всего сообщений в истории: ${messages.length}`);
        
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        const SELECTED_MODEL = 'google/gemini-2.5-flash-preview-09-2025';
        
        if (!OPENROUTER_API_KEY) {
            logError('❌ OPENROUTER_API_KEY не найден в .env');
            return res.status(500).json({ error: 'API ключ не настроен на сервере' });
        }
        
        log('🔑 Ключ OpenRouter найден');
        log(`🌐 Модель: ${SELECTED_MODEL}`);
        
        const requestBody = {
            model: SELECTED_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000
        };
        
        log('📤 Отправка запроса к OpenRouter API...');
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://bothost.ru',
                'X-Title': 'BotHost AI Support'
            },
            body: JSON.stringify(requestBody)
        });
        
        log(`📥 Статус ответа от OpenRouter: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            logError(`❌ Ошибка OpenRouter API: ${response.status}`, errorText);
            
            let errorMessage = 'Ошибка при обращении к AI';
            if (response.status === 401) errorMessage = 'Неверный API ключ OpenRouter';
            else if (response.status === 402) errorMessage = 'Недостаточно средств на счете OpenRouter';
            else if (response.status === 429) errorMessage = 'Слишком много запросов к API';
            
            return res.status(response.status).json({ error: errorMessage });
        }
        
        const data = await response.json();
        const aiText = data.choices[0]?.message?.content;
        
        if (!aiText) {
            logError('❌ Пустой ответ от OpenRouter');
            return res.status(500).json({ error: 'Пустой ответ от AI' });
        }
        
        if (data.usage) {
            log('📊 Использование токенов:', data.usage);
        }
        
        logSuccess(`✅ Ответ получен от AI (${aiText.length} символов)`);
        log(`🤖 Первые 150 символов ответа: "${aiText.substring(0, 150)}..."`);
        
        res.json({ response: aiText });
        
    } catch (error) {
        logError('❌ Критическая ошибка в /api/ai:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.get('*', (req, res) => {
    logRequest(req, 'STATIC FILE');
    res.sendFile(path.join(__dirname, 'public_html', 'index.html'));
});

// ===== TELEGRAM BOT =====
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'Пользователь';
    
    log(`🤖 Telegram: /start от ${userName} (ID: ${chatId})`);

    const welcomeMessage = `👋 <b>Здравствуйте, ${userName}!</b>

━━━━━━━━━━━━━━━━━━━━━━

<b>Добро пожаловать в BotHost AI Support!</b>

<b>Чем я могу помочь:</b>

   • Анализ логов и ошибок серверов
   • Готовые примеры кода на Python, Node.js, Go
   • Решение проблем с развёртыванием на BotHost
   • Создание Telegram ботов и Mini Apps
   • Настройка интеграций и API

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
    }).then(() => {
        logSuccess(`✅ /start отправлен пользователю ${userName}`);
    }).catch((error) => {
        logError('❌ Ошибка отправки /start:', error);
    });
});

// Логирование ошибок бота
bot.on('polling_error', (error) => {
    logError('❌ Ошибка polling бота:', error.message);
});

bot.on('error', (error) => {
    logError('❌ Общая ошибка бота:', error);
});

// ===== ЗАПУСК СЕРВЕРА =====
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    logSuccess(`🚀 Сервер запущен на порту ${PORT}`);
    log(`🌐 Web App URL: ${WEB_APP_URL}`);
    log(`🔑 Telegram Bot: ${TELEGRAM_TOKEN ? '✅ Настроен' : '❌ Отсутствует'}`);
    log(`🔑 OpenRouter Key: ${process.env.OPENROUTER_API_KEY ? '✅ Настроен' : '❌ Отсутствует'}`);
    log(`📁 Статика из папки: ${path.join(__dirname, 'public_html')}`);
    console.log('='.repeat(60) + '\n');
});

// ===== ГРАЦИОЗНОЕ ЗАВЕРШЕНИЕ =====
process.on('SIGINT', () => {
    log('\n🛑 Получен SIGINT, остановка...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('\n🛑 Получен SIGTERM, остановка...');
    bot.stopPolling();
    process.exit(0);
});
