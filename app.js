require('dotenv').config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 2789;
const WEB_APP_URL = 'https://supportai.bothost.ru';
const HOSTING_URL = 'https://bothost.ru';
const CHANNEL_URL = 'https://t.me/bothostru';

// ===== КЛЮЧИ И НАСТРОЙКИ ПРЯМО В КОДЕ =====
const OPENROUTER_API_KEY = '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';
const SELECTED_MODEL = 'qwen/qwen3-coder:free'; // Бесплатная модель

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
    if (req.query && Object.keys(req.query).length > 0) {
        console.log(`[${timestamp}] 🔍 Query:`, req.query);
    }
    if (req.params && Object.keys(req.params).length > 0) {
        console.log(`[${timestamp}] 🎯 Params:`, req.params);
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
            console.error(`[${timestamp}] 🔍 Stack:`, error.stack);
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

function logNetwork(type, url, status, duration = null) {
    const timestamp = new Date().toISOString();
    const durationStr = duration ? ` (${duration}ms)` : '';
    console.log(`[${timestamp}] 🌐 ${type} ${url} → ${status}${durationStr}`);
}

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// Логирование ВСЕХ запросов с таймингом
app.use((req, res, next) => {
    const start = Date.now();
    
    // Логируем запрос
    logRequest(req);
    
    // Перехватываем ответ для логирования
    const originalSend = res.json;
    res.json = function(data) {
        const duration = Date.now() - start;
        logNetwork(req.method, req.url, res.statusCode, duration);
        
        if (res.statusCode >= 400) {
            logError(`❌ Ошибка ответа ${res.statusCode}:`, data);
        } else {
            logSuccess(`✅ Ответ отправлен (${duration}ms)`);
        }
        
        originalSend.call(this, data);
    };
    
    next();
});

// Блокировка подозрительных запросов
app.use((req, res, next) => {
    if (req.url.includes('/.git') || 
        req.url.includes('/.env') || 
        req.url.includes('..') ||
        req.url.includes('.ssh')) {
        
        logWarning(`🚫 Заблокирован подозрительный запрос: ${req.url}`);
        return res.status(404).send('Not found');
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public_html')));

// ===== API ENDPOINTS =====
app.get('/api/config', (req, res) => {
    log('📡 Отправка конфига клиенту');
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
            openrouter: OPENROUTER_API_KEY ? 'CONFIGURED' : 'MISSING',
            server: 'RUNNING'
        }
    });
});

// Прокси для OpenRouter с подробным логированием
app.post('/api/ai', async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();
    
    log(`[${requestId}] 🤖 НОВЫЙ AI ЗАПРОС #${requestId}`);
    
    try {
        const { messages } = req.body;
        
        // Валидация
        if (!messages || !Array.isArray(messages)) {
            logError(`[${requestId}] ❌ Некорректный формат запроса: messages отсутствует или не массив`);
            return res.status(400).json({ error: 'Некорректный формат запроса' });
        }
        
        // Логируем сообщение пользователя
        const lastMessage = messages[messages.length - 1];
        const userMessage = lastMessage?.content || '';
        log(`[${requestId}] 👤 Сообщение пользователя: "${userMessage.substring(0, 200)}${userMessage.length > 200 ? '...' : ''}"`);
        log(`[${requestId}] 📊 Всего сообщений в истории: ${messages.length}`);
        
        // Проверка ключа
        if (!OPENROUTER_API_KEY) {
            logError(`[${requestId}] ❌ OPENROUTER_API_KEY не найден в коде`);
            return res.status(500).json({ error: 'API ключ не настроен на сервере' });
        }
        
        log(`[${requestId}] 🔑 Используется ключ: ${OPENROUTER_API_KEY.substring(0, 15)}...`);
        log(`[${requestId}] 🌐 Модель: ${SELECTED_MODEL}`);
        
        // Подготовка запроса к OpenRouter
        const requestBody = {
            model: SELECTED_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000
        };
        
        log(`[${requestId}] 📤 Отправка запроса к OpenRouter API...`);
        log(`[${requestId}] 📦 Тело запроса:`, JSON.stringify(requestBody, null, 2));
        
        const openRouterStart = Date.now();
        
        // Отправляем запрос к OpenRouter
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
        
        const openRouterDuration = Date.now() - openRouterStart;
        
        log(`[${requestId}] 📥 Статус ответа от OpenRouter: ${response.status} ${response.statusText} (${openRouterDuration}ms)`);
        
        // Логируем заголовки ответа для отладки
        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        log(`[${requestId}] 📋 Заголовки ответа:`, headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            logError(`[${requestId}] ❌ Ошибка OpenRouter API: ${response.status}`, errorText);
            
            let errorData;
            try {
                errorData = JSON.parse(errorText);
                logError(`[${requestId}] 📋 Детали ошибки:`, errorData);
            } catch {
                errorData = { error: errorText };
            }
            
            let errorMessage = 'Ошибка при обращении к AI';
            if (response.status === 401) errorMessage = 'Неверный API ключ OpenRouter';
            else if (response.status === 402) errorMessage = 'Недостаточно средств на счете OpenRouter';
            else if (response.status === 429) errorMessage = 'Слишком много запросов к API';
            else if (response.status === 404) errorMessage = `Модель ${SELECTED_MODEL} не найдена`;
            
            logError(`[${requestId}] ⚠️ Отправка ошибки клиенту: ${errorMessage}`);
            return res.status(response.status).json({ error: errorMessage });
        }
        
        const data = await response.json();
        
        // Логируем полученные данные
        log(`[${requestId}] ✅ Ответ от OpenRouter получен`);
        
        if (data.usage) {
            log(`[${requestId}] 📊 Использование токенов:`, {
                prompt: data.usage.prompt_tokens || 0,
                completion: data.usage.completion_tokens || 0,
                total: data.usage.total_tokens || 0
            });
        }
        
        const aiText = data.choices[0]?.message?.content;
        
        if (!aiText) {
            logError(`[${requestId}] ❌ Пустой ответ от OpenRouter`);
            logError(`[${requestId}] 📋 Полученные данные:`, data);
            return res.status(500).json({ error: 'Пустой ответ от AI' });
        }
        
        // Логируем часть ответа
        log(`[${requestId}] 🤖 Длина ответа: ${aiText.length} символов`);
        log(`[${requestId}] 🤖 Первые 200 символов ответа: "${aiText.substring(0, 200)}${aiText.length > 200 ? '...' : ''}"`);
        
        // Логируем наличие кода в ответе
        if (aiText.includes('```')) {
            const codeBlocks = (aiText.match(/```/g) || []).length / 2;
            log(`[${requestId}] 💻 В ответе найдено ${codeBlocks} блоков кода`);
        }
        
        const totalDuration = Date.now() - startTime;
        log(`[${requestId}] ✅ Запрос полностью обработан за ${totalDuration}ms`);
        
        res.json({ response: aiText });
        
    } catch (error) {
        const totalDuration = Date.now() - startTime;
        logError(`[${requestId}] ❌ Критическая ошибка в /api/ai (${totalDuration}ms):`, error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + error.message });
    }
});

// Логирование всех статических файлов
app.get('*', (req, res, next) => {
    // Пропускаем API запросы
    if (req.url.startsWith('/api/')) {
        return next();
    }
    
    log(`📄 Запрос статического файла: ${req.url}`);
    res.sendFile(path.join(__dirname, 'public_html', req.url), (err) => {
        if (err) {
            if (err.code === 'ENOENT') {
                logWarning(`⚠️ Файл не найден: ${req.url}, отправляем index.html`);
                res.sendFile(path.join(__dirname, 'public_html', 'index.html'));
            } else {
                logError(`❌ Ошибка при отправке файла ${req.url}:`, err);
            }
        }
    });
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
    console.log('\n' + '='.repeat(70));
    console.log(`🚀 СЕРВЕР ЗАПУЩЕН`);
    console.log('='.repeat(70));
    log(`🌐 Web App URL: ${WEB_APP_URL}`);
    log(`🔑 Telegram Bot: ${TELEGRAM_TOKEN ? '✅ Настроен' : '❌ Отсутствует'}`);
    log(`🔑 OpenRouter Key: ${OPENROUTER_API_KEY ? '✅ Настроен (в коде)' : '❌ Отсутствует'}`);
    log(`🤖 Модель AI: ${SELECTED_MODEL}`);
    log(`📁 Статика из папки: ${path.join(__dirname, 'public_html')}`);
    log(`🌍 Сервер доступен на порту ${PORT}`);
    console.log('='.repeat(70) + '\n');
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
