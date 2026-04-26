// ==========================================
// U2: bootstrap_globals.js
// 在各应用模块注册 DOMContentLoaded 回调之前，提前准备全局配置对象。
// 这样 iMessage 等模块即使先加载，也不会在初始化时拿到 undefined。
// ==========================================
(function () {
    const defaultApiConfig = {
        endpoint: '',
        apiKey: '',
        model: '',
        temperature: 0.7,
        enableSubApi: false,
        subEndpoint: '',
        subApiKey: '',
        subModel: '',
        subTemperature: 0.7
    };

    const defaultUserState = {
        name: '',
        phone: '',
        persona: '',
        avatarUrl: null
    };

    function safeLoad(key, fallback) {
        try {
            if (window.StorageManager && typeof window.StorageManager.load === 'function') {
                return window.StorageManager.load(key, fallback);
            }

            const raw = window.localStorage ? window.localStorage.getItem(key) : null;
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.warn(`[bootstrap_globals] Failed to load ${key}:`, error);
            return fallback;
        }
    }

    function normalizeApiConfig(value) {
        return {
            ...defaultApiConfig,
            ...(value && typeof value === 'object' ? value : {})
        };
    }

    function resolveUserStateFromAccounts() {
        const accounts = safeLoad('u2_accounts', []);
        const currentAccountId = safeLoad('u2_currentAccountId', null);

        if (Array.isArray(accounts) && currentAccountId != null) {
            const account = accounts.find((item) => String(item.id) === String(currentAccountId));
            if (account) {
                return {
                    name: account.name || '',
                    phone: account.phone || '',
                    persona: account.persona || account.signature || '',
                    avatarUrl: account.avatarUrl || null
                };
            }
        }

        return { ...defaultUserState };
    }

    window.apiConfig = normalizeApiConfig(window.apiConfig || safeLoad('u2_apiConfig', defaultApiConfig));
    window.userState = {
        ...defaultUserState,
        ...(window.userState && typeof window.userState === 'object' ? window.userState : resolveUserStateFromAccounts())
    };

    window.getApiConfig = function getApiConfig() {
        window.apiConfig = normalizeApiConfig(window.apiConfig || safeLoad('u2_apiConfig', defaultApiConfig));
        return window.apiConfig;
    };

    window.getUserState = function getUserState() {
        if (!window.userState || typeof window.userState !== 'object') {
            window.userState = resolveUserStateFromAccounts();
        }
        return window.userState;
    };
})();
