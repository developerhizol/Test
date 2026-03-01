class ChatStorage {
    constructor() {
        this.STORAGE_KEY = 'botHost_chats_v2';
        this.MAX_CHATS = 50;
    }

    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Ошибка чтения:', error);
            return {};
        }
    }

    save(id, data) {
        try {
            if (!id || !data) return false;
            
            const chats = this.getAll();
            chats[id] = {
                ...data,
                updated: Date.now()
            };
            
            const ids = Object.keys(chats);
            if (ids.length > this.MAX_CHATS) {
                const oldest = ids.reduce((a, b) => 
                    chats[a].updated < chats[b].updated ? a : b
                );
                delete chats[oldest];
            }
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(chats));
            return true;
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            return false;
        }
    }

    saveRaw(id, data) {
        return this.save(id, data);
    }

    get(id) {
        try {
            return this.getAll()[id] || null;
        } catch (error) {
            console.error('Ошибка получения:', error);
            return null;
        }
    }

    delete(id) {
        try {
            const chats = this.getAll();
            delete chats[id];
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(chats));
            return true;
        } catch (error) {
            console.error('Ошибка удаления:', error);
            return false;
        }
    }

    generateId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getSorted() {
        try {
            const chats = this.getAll();
            return Object.entries(chats)
                .filter(([, data]) => data && data.messages && data.messages.length > 0)
                .sort(([,a], [,b]) => (b.updated || 0) - (a.updated || 0))
                .map(([id, data]) => ({
                    id,
                    title: data.title || 'Новый чат',
                    messages: data.messages || [],
                    lastMessage: data.lastMessage || '',
                    updated: data.updated || Date.now(),
                    created: data.created || Date.now(),
                    titleSet: data.titleSet || false
                }));
        } catch (error) {
            console.error('Ошибка сортировки:', error);
            return [];
        }
    }
}

window.chatStorage = new ChatStorage();