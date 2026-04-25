// ==========================================
// APP STORAGE LAYER
// Unified IndexedDB repository for the whole project
// Mobile-first, no legacy migration retention
// ==========================================

(function() {
    const DB_NAME = 'iiso_app_storage';
    const DB_VERSION = 1;
    const STORAGE_SCHEMA_VERSION = 3;
    const PERSISTENT_LOCALSTORAGE_EXCLUDE_PREFIXES = ['iiso_auth_'];

    const STORES = {
        meta: 'meta',
        settings: 'settings',
        accounts: 'accounts',
        appState: 'app_state',
        theme: 'theme',
        worldbooks: 'worldbooks',
        assets: 'assets',
        imFriends: 'im_friends',
        imMessages: 'im_messages',
        imMoments: 'im_moments',
        imMomentMessages: 'im_moment_messages',
        imStickers: 'im_stickers'
    };

    const META_KEYS = {
        schemaVersion: 'schema_version',
        appVersion: 'app_version',
        imMomentsCoverAssetId: 'im_moments_cover_asset_id'
    };

    const runtimeBlobUrls = new Map();
    const runtimeBlobUrlAccess = new Map();
    const MAX_RUNTIME_BLOB_URLS = 120;
    let dbPromise = null;

    function cloneDeep(value) {
        if (typeof structuredClone === 'function') {
            return structuredClone(value);
        }
        return JSON.parse(JSON.stringify(value));
    }

    function touchRuntimeBlobUrl(assetId) {
        if (!assetId) return;
        runtimeBlobUrlAccess.set(assetId, Date.now());
    }

    function revokeRuntimeBlobUrl(assetId) {
        const existing = runtimeBlobUrls.get(assetId);
        if (existing) {
            try {
                URL.revokeObjectURL(existing);
            } catch (e) {}
            runtimeBlobUrls.delete(assetId);
        }
        runtimeBlobUrlAccess.delete(assetId);
    }

    function clearRuntimeAssetCache() {
        try {
            Array.from(runtimeBlobUrls.keys()).forEach((assetId) => revokeRuntimeBlobUrl(assetId));
        } catch (e) {}
        runtimeBlobUrls.clear();
        runtimeBlobUrlAccess.clear();
        return true;
    }

    async function measureRuntimeCacheUsage() {
        const assetIds = Array.from(runtimeBlobUrls.keys());
        if (assetIds.length === 0) return 0;

        let total = 0;
        for (const assetId of assetIds) {
            const blob = await getAssetBlob(assetId);
            total += Number(blob?.size) || 0;
        }
        return total;
    }

    function pruneRuntimeAssetCache(maxEntries = MAX_RUNTIME_BLOB_URLS) {
        const limit = Math.max(0, Number(maxEntries) || 0);
        if (limit === 0) {
            clearRuntimeAssetCache();
            return 0;
        }

        if (runtimeBlobUrls.size <= limit) {
            return runtimeBlobUrls.size;
        }

        const removableIds = Array.from(runtimeBlobUrls.keys())
            .sort((a, b) => (runtimeBlobUrlAccess.get(a) || 0) - (runtimeBlobUrlAccess.get(b) || 0))
            .slice(0, Math.max(0, runtimeBlobUrls.size - limit));

        removableIds.forEach((assetId) => revokeRuntimeBlobUrl(assetId));
        return runtimeBlobUrls.size;
    }

    function isDataUrl(value) {
        return typeof value === 'string' && value.startsWith('data:');
    }

    function isBlobUrl(value) {
        return typeof value === 'string' && value.startsWith('blob:');
    }

    function hasStoreIndex(store, indexName) {
        if (!store || !store.indexNames) return false;
        if (typeof store.indexNames.contains === 'function') {
            return store.indexNames.contains(indexName);
        }
        return Array.from(store.indexNames).includes(indexName);
    }

    function dataUrlToBlob(dataUrl) {
        const parts = String(dataUrl || '').split(',');
        const header = parts[0] || '';
        const data = parts[1] || '';
        const mimeMatch = header.match(/data:(.*?);base64/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const binary = atob(data);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new Blob([bytes], { type: mimeType });
    }

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    function requestToPromise(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function deleteDatabaseSafe(name) {
        return new Promise((resolve) => {
            if (!window.indexedDB || !name) {
                resolve({ name, deleted: false, reason: 'indexeddb_unavailable' });
                return;
            }

            let settled = false;
            const request = window.indexedDB.deleteDatabase(name);

            request.onsuccess = () => {
                if (settled) return;
                settled = true;
                resolve({ name, deleted: true, reason: 'deleted' });
            };

            request.onerror = () => {
                if (settled) return;
                settled = true;
                resolve({
                    name,
                    deleted: false,
                    reason: request.error?.message || request.error?.name || 'delete_error'
                });
            };

            request.onblocked = () => {
                if (settled) return;
                settled = true;
                resolve({ name, deleted: false, reason: 'blocked' });
            };
        });
    }

    async function clearBrowserCaches() {
        if (!window.caches || typeof window.caches.keys !== 'function') {
            return [];
        }

        try {
            const cacheNames = await window.caches.keys();
            const results = [];

            for (const cacheName of cacheNames) {
                const deleted = await window.caches.delete(cacheName);
                results.push({ name: cacheName, deleted: !!deleted });
            }

            return results;
        } catch (error) {
            return [{ name: '*', deleted: false, reason: error?.message || 'cache_clear_failed' }];
        }
    }

    async function unregisterServiceWorkers() {
        if (!navigator.serviceWorker || typeof navigator.serviceWorker.getRegistrations !== 'function') {
            return [];
        }

        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            const results = [];

            for (const registration of registrations) {
                const scope = registration?.scope || 'unknown';
                const unregistered = await registration.unregister();
                results.push({ scope, unregistered: !!unregistered });
            }

            return results;
        } catch (error) {
            return [{ scope: '*', unregistered: false, reason: error?.message || 'sw_unregister_failed' }];
        }
    }

    function createDbConnection() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB is not supported in this browser.'));
                return;
            }

            const request = window.indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                dbPromise = null;
                reject(request.error);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORES.meta)) {
                    db.createObjectStore(STORES.meta, { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains(STORES.settings)) {
                    db.createObjectStore(STORES.settings, { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains(STORES.accounts)) {
                    db.createObjectStore(STORES.accounts, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.appState)) {
                    db.createObjectStore(STORES.appState, { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains(STORES.theme)) {
                    db.createObjectStore(STORES.theme, { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains(STORES.worldbooks)) {
                    db.createObjectStore(STORES.worldbooks, { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains(STORES.assets)) {
                    db.createObjectStore(STORES.assets, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.imFriends)) {
                    db.createObjectStore(STORES.imFriends, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.imMessages)) {
                    const messageStore = db.createObjectStore(STORES.imMessages, { keyPath: 'id' });
                    messageStore.createIndex('friendId', 'friendId', { unique: false });
                    messageStore.createIndex('friendId_timestamp', ['friendId', 'timestamp'], { unique: false });
                    messageStore.createIndex('friendId_order', ['friendId', 'order'], { unique: false });
                } else {
                    const upgradeTransaction = event.target.transaction;
                    if (upgradeTransaction) {
                        const messageStore = upgradeTransaction.objectStore(STORES.imMessages);
                        if (!hasStoreIndex(messageStore, 'friendId')) {
                            messageStore.createIndex('friendId', 'friendId', { unique: false });
                        }
                        if (!hasStoreIndex(messageStore, 'friendId_timestamp')) {
                            messageStore.createIndex('friendId_timestamp', ['friendId', 'timestamp'], { unique: false });
                        }
                        if (!hasStoreIndex(messageStore, 'friendId_order')) {
                            messageStore.createIndex('friendId_order', ['friendId', 'order'], { unique: false });
                        }
                    }
                }

                if (!db.objectStoreNames.contains(STORES.imMoments)) {
                    const momentsStore = db.createObjectStore(STORES.imMoments, { keyPath: 'id' });
                    momentsStore.createIndex('userId', 'userId', { unique: false });
                    momentsStore.createIndex('time', 'time', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.imMomentMessages)) {
                    const momentMsgStore = db.createObjectStore(STORES.imMomentMessages, { keyPath: 'id' });
                    momentMsgStore.createIndex('time', 'time', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.imStickers)) {
                    db.createObjectStore(STORES.imStickers, { keyPath: 'categoryName' });
                }
            };

            request.onsuccess = () => {
                const db = request.result;

                db.onversionchange = () => {
                    try {
                        db.close();
                    } catch (e) {}
                    dbPromise = null;
                };

                resolve(db);
            };
        });
    }

    function openDb() {
        if (!dbPromise) {
            dbPromise = createDbConnection().catch((error) => {
                dbPromise = null;
                throw error;
            });
        }
        return dbPromise;
    }

    async function withStore(storeNames, mode, callback) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeNames, mode);
            const stores = {};
            storeNames.forEach((name) => {
                stores[name] = transaction.objectStore(name);
            });

            let callbackResult;
            try {
                callbackResult = callback(stores, transaction);
            } catch (error) {
                reject(error);
                return;
            }

            transaction.oncomplete = async () => {
                try {
                    const resolved = await Promise.resolve(callbackResult);
                    resolve(resolved);
                } catch (error) {
                    reject(error);
                }
            };

            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
        });
    }

    async function getRecord(storeName, key) {
        return withStore([storeName], 'readonly', async (stores) => {
            const row = await requestToPromise(stores[storeName].get(key));
            return row || null;
        });
    }

    async function putRecord(storeName, record) {
        return withStore([storeName], 'readwrite', (stores) => {
            stores[storeName].put(record);
        });
    }

    async function deleteRecord(storeName, key) {
        return withStore([storeName], 'readwrite', (stores) => {
            stores[storeName].delete(key);
        });
    }

    async function getAllRecords(storeName) {
        return withStore([storeName], 'readonly', async (stores) => {
            const rows = await requestToPromise(stores[storeName].getAll());
            return Array.isArray(rows) ? rows : [];
        });
    }

    async function getMeta(key) {
        const record = await getRecord(STORES.meta, key);
        return record ? record.value : null;
    }

    async function setMeta(key, value) {
        return putRecord(STORES.meta, { key, value });
    }

    async function getSetting(key, fallbackValue = null) {
        const record = await getRecord(STORES.settings, key);
        return record ? cloneDeep(record.value) : fallbackValue;
    }

    async function setSetting(key, value) {
        return putRecord(STORES.settings, { key, value: cloneDeep(value) });
    }

    async function saveAssetFromDataUrl(assetId, dataUrl, extra = {}) {
        if (!assetId || !isDataUrl(dataUrl)) return null;
        revokeRuntimeBlobUrl(assetId);
        const blob = dataUrlToBlob(dataUrl);
        return withStore([STORES.assets], 'readwrite', (stores) => {
            stores[STORES.assets].put({
                id: assetId,
                blob,
                mimeType: blob.type || extra.mimeType || 'application/octet-stream',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                ...extra
            });
        }).then(() => assetId);
    }

    async function getAssetBlob(assetId) {
        if (!assetId) return null;
        const record = await getRecord(STORES.assets, assetId);
        return record && record.blob ? record.blob : null;
    }

    async function getAssetUrl(assetId) {
        if (!assetId) return null;
        const existing = runtimeBlobUrls.get(assetId);
        if (existing) {
            touchRuntimeBlobUrl(assetId);
            return existing;
        }

        const blob = await getAssetBlob(assetId);
        if (!blob) return null;

        const url = URL.createObjectURL(blob);
        runtimeBlobUrls.set(assetId, url);
        touchRuntimeBlobUrl(assetId);
        pruneRuntimeAssetCache();
        return url;
    }

    async function deleteAsset(assetId) {
        if (!assetId) return;
        revokeRuntimeBlobUrl(assetId);
        return deleteRecord(STORES.assets, assetId);
    }

    function resolveMessageOrder(message, fallbackIndex = 0) {
        if (message && Number.isFinite(Number(message.__messageOrder))) {
            return Number(message.__messageOrder);
        }
        return Number.isFinite(Number(fallbackIndex)) ? Number(fallbackIndex) : 0;
    }

    function normalizeMessageRecord(friendId, msg, index) {
        const safe = msg || {};
        const resolvedOrder = resolveMessageOrder(safe, index);
        return {
            id: safe.id || `${String(friendId)}_msg_${safe.timestamp || Date.now()}_${resolvedOrder}`,
            friendId: String(friendId),
            order: resolvedOrder,
            role: safe.role || 'assistant',
            type: safe.type || 'text',
            content: typeof safe.content === 'string' ? safe.content : '',
            text: typeof safe.text === 'string' ? safe.text : '',
            translation: typeof safe.translation === 'string' ? safe.translation : '',
            showTranslation: !!safe.showTranslation,
            replyTo: safe.replyTo || null,
            timestamp: Number(safe.timestamp) || Date.now(),
            amount: safe.amount,
            description: safe.description,
            targetName: safe.targetName,
            payKind: safe.payKind,
            speaker: safe.speaker,
            senderName: safe.senderName,
            senderAvatarUrl: safe.senderAvatarUrl,
            packetMsg: safe.packetMsg,
            claims: safe.claims,
            packetCount: safe.packetCount,
            packetType: safe.packetType,
            allocations: safe.allocations,
            status: safe.status,
            duration: safe.duration,
            callMessages: safe.callMessages,
            isSelf: safe.isSelf,
            statusText: safe.statusText,
            senderId: safe.senderId,
            payload: safe.payload || null
        };
    }

    function denormalizeMessageRecord(row) {
        return {
            id: row.id,
            role: row.role,
            type: row.type,
            content: row.content,
            text: row.text,
            translation: row.translation,
            showTranslation: row.showTranslation,
            replyTo: row.replyTo,
            timestamp: row.timestamp,
            amount: row.amount,
            description: row.description,
            targetName: row.targetName,
            payKind: row.payKind,
            speaker: row.speaker,
            senderName: row.senderName,
            senderAvatarUrl: row.senderAvatarUrl,
            packetMsg: row.packetMsg,
            claims: row.claims,
            packetCount: row.packetCount,
            packetType: row.packetType,
            allocations: row.allocations,
            status: row.status,
            duration: row.duration,
            callMessages: row.callMessages,
            isSelf: row.isSelf,
            statusText: row.statusText,
            senderId: row.senderId,
            payload: row.payload,
            __messageOrder: Number(row.order) || 0
        };
    }

    function buildAssetId(prefix, ownerId, fieldName) {
        return `${prefix}_${String(ownerId)}_${String(fieldName)}`;
    }

    const FRIEND_ASSET_FIELDS = [
        ['avatarUrl', 'avatarAssetId'],
        ['chatBg', 'chatBgAssetId'],
        ['momentsCover', 'momentsCoverAssetId']
    ];

    async function persistFriendAssets(friend) {
        if (!friend) return friend;
        const result = { ...friend };

        for (const [urlField, assetField] of FRIEND_ASSET_FIELDS) {
            const currentValue = result[urlField];
            if (isDataUrl(currentValue)) {
                const assetId = result[assetField] || buildAssetId('friend', result.id, urlField);
                await saveAssetFromDataUrl(assetId, currentValue, {
                    ownerType: 'im_friend',
                    ownerId: String(result.id),
                    field: urlField
                });
                result[assetField] = assetId;
                result[urlField] = null;
                continue;
            }

            if (result[assetField] && isBlobUrl(currentValue)) {
                result[urlField] = null;
            }
        }

        return result;
    }

    async function hydrateFriendAssets(friend) {
        if (!friend) return friend;
        const result = { ...friend };
        const mappings = [
            ['avatarAssetId', 'avatarUrl'],
            ['chatBgAssetId', 'chatBg'],
            ['momentsCoverAssetId', 'momentsCover']
        ];

        for (const [assetField, urlField] of mappings) {
            if (result[assetField] && (!result[urlField] || isBlobUrl(result[urlField]))) {
                result[urlField] = await getAssetUrl(result[assetField]);
            }
        }

        return result;
    }

    function collectFriendAssetIds(friend) {
        if (!friend) return [];
        return Array.from(new Set(
            FRIEND_ASSET_FIELDS
                .map(([, assetField]) => friend[assetField] ? String(friend[assetField]) : null)
                .filter(Boolean)
        ));
    }

    function getExpectedFriendAssetIds(friend) {
        if (!friend || friend.id == null) return [];
        return Array.from(new Set(
            FRIEND_ASSET_FIELDS
                .map(([urlField, assetField]) => {
                    if (friend[assetField]) return String(friend[assetField]);
                    if (isDataUrl(friend[urlField])) return buildAssetId('friend', friend.id, urlField);
                    return null;
                })
                .filter(Boolean)
        ));
    }

    async function getFriendMetaById(friendId) {
        if (friendId == null) return null;
        return getRecord(STORES.imFriends, String(friendId));
    }

    async function deleteFriendMetaById(friendId) {
        return deleteRecord(STORES.imFriends, String(friendId));
    }

    async function cleanupRemovedFriendAssets(previousFriend, nextFriend, retainedAssetIds = new Set()) {
        if (!previousFriend) return;
        const nextIds = new Set(getExpectedFriendAssetIds(nextFriend));
        for (const assetId of collectFriendAssetIds(previousFriend)) {
            if (nextIds.has(assetId) || retainedAssetIds.has(assetId)) continue;
            await deleteAsset(assetId);
        }
    }

    async function buildFriendMessageSummary(messages) {
        const list = Array.isArray(messages) ? messages : [];
        const lastMessage = list.length > 0 ? list[list.length - 1] : null;

        let previewText = '';
        if (lastMessage) {
            if (lastMessage.type === 'image') {
                previewText = lastMessage.text || '[图片]';
            } else if (lastMessage.type === 'moment_forward') {
                previewText = '[朋友圈]';
            } else if (lastMessage.type === 'pay_transfer') {
                previewText = `[转账] ${lastMessage.description || ''}`.trim();
            } else if (lastMessage.type === 'group_red_packet') {
                previewText = `[群红包] ${lastMessage.description || ''}`.trim();
            } else {
                previewText = lastMessage.content || lastMessage.text || '';
            }
        }

        return {
            lastMessagePreview: previewText || '',
            lastMessageTimestamp: Number(lastMessage?.timestamp) || 0,
            messageCount: list.length
        };
    }

    function resolveFriendMessageSummary(friend, previousMeta = null) {
        if (!friend || friend.messagesLoaded !== false) {
            return buildFriendMessageSummary(friend ? friend.messages : []);
        }

        const preview = typeof friend.lastMessagePreview === 'string'
            ? friend.lastMessagePreview
            : typeof previousMeta?.lastMessagePreview === 'string'
                ? previousMeta.lastMessagePreview
                : '';

        const timestampSource = friend.lastMessageTimestamp != null
            ? friend.lastMessageTimestamp
            : previousMeta?.lastMessageTimestamp;

        const countSource = friend.messageCount != null
            ? friend.messageCount
            : previousMeta?.messageCount;

        return {
            lastMessagePreview: preview,
            lastMessageTimestamp: Number(timestampSource) || 0,
            messageCount: Number(countSource) || 0
        };
    }

    async function saveFriendMeta(friend, options = {}) {
        if (!friend || friend.id == null) return false;

        const previousMeta = Object.prototype.hasOwnProperty.call(options, 'previousMeta')
            ? options.previousMeta
            : await getFriendMetaById(friend.id);

        const prepared = await persistFriendAssets(friend);
        const meta = { ...prepared };
        const messageSummary = await resolveFriendMessageSummary(prepared, previousMeta);

        delete meta.messages;

        meta.id = String(meta.id);
        meta.updatedAt = Date.now();
        meta.lastMessagePreview = messageSummary.lastMessagePreview;
        meta.lastMessageTimestamp = messageSummary.lastMessageTimestamp;
        meta.messageCount = messageSummary.messageCount;

        return putRecord(STORES.imFriends, meta);
    }

    async function saveFriendMessage(friendId, message, order = 0) {
        const safeFriendId = String(friendId);
        const normalized = normalizeMessageRecord(safeFriendId, {
            ...(message || {}),
            __messageOrder: resolveMessageOrder(message, order)
        }, order);

        await putRecord(STORES.imMessages, normalized);
        return normalized;
    }

    async function deleteFriendMessage(messageId) {
        if (!messageId) return false;
        await deleteRecord(STORES.imMessages, messageId);
        return true;
    }

    async function deleteFriendMessages(messageIds) {
        const safeIds = Array.isArray(messageIds) ? messageIds.map((id) => String(id)).filter(Boolean) : [];
        if (safeIds.length === 0) return true;

        await withStore([STORES.imMessages], 'readwrite', (stores) => {
            safeIds.forEach((messageId) => stores[STORES.imMessages].delete(messageId));
        });
        return true;
    }

    async function saveFriendMessages(friendId, messages) {
        const safeFriendId = String(friendId);
        const list = Array.isArray(messages) ? messages : [];
        const normalizedList = list.map((msg, idx) => normalizeMessageRecord(safeFriendId, msg, idx));
        const nextMessageIds = new Set(normalizedList.map((msg) => String(msg.id)));

        return withStore([STORES.imMessages], 'readwrite', async (stores) => {
            const index = stores[STORES.imMessages].index('friendId');
            const range = IDBKeyRange.only(safeFriendId);
            const existingKeys = await requestToPromise(index.getAllKeys(range));

            existingKeys.forEach((messageId) => {
                if (!nextMessageIds.has(String(messageId))) {
                    stores[STORES.imMessages].delete(messageId);
                }
            });

            normalizedList.forEach((msg) => stores[STORES.imMessages].put(msg));
        });
    }

    async function replaceFriendMessages(friendId, messages) {
        return saveFriendMessages(friendId, messages);
    }

    async function saveFriend(friend, options = {}) {
        if (!friend || friend.id == null) return false;
        const previousFriend = await getFriendMetaById(friend.id);
        const retainedAssetIds = new Set(getExpectedFriendAssetIds(friend));
        const shouldPersistMessages = options.skipMessages !== true && friend.messagesLoaded !== false;

        await saveFriendMeta(friend, { previousMeta: previousFriend });

        if (shouldPersistMessages) {
            await saveFriendMessages(friend.id, friend.messages || []);
        }

        await cleanupRemovedFriendAssets(previousFriend, friend, retainedAssetIds);
        return true;
    }

    async function saveFriendMetaOnly(friend) {
        return saveFriend(friend, { skipMessages: true });
    }

    async function deleteFriend(friendId) {
        if (friendId == null) return false;
        const previousFriend = await getFriendMetaById(friendId);
        await saveFriendMessages(friendId, []);
        await deleteFriendMetaById(friendId);
        await cleanupRemovedFriendAssets(previousFriend, null);
        return true;
    }

    async function loadMessagesByFriendId(friendId) {
        const safeFriendId = String(friendId);
        return withStore([STORES.imMessages], 'readonly', async (stores) => {
            const messageStore = stores[STORES.imMessages];

            if (hasStoreIndex(messageStore, 'friendId_order')) {
                const orderIndex = messageStore.index('friendId_order');
                const orderRange = IDBKeyRange.bound(
                    [safeFriendId, Number.MIN_SAFE_INTEGER],
                    [safeFriendId, Number.MAX_SAFE_INTEGER]
                );
                const orderedRows = await requestToPromise(orderIndex.getAll(orderRange));
                return orderedRows.map(denormalizeMessageRecord);
            }

            const timeIndex = messageStore.index('friendId_timestamp');
            const timeRange = IDBKeyRange.bound([safeFriendId, 0], [safeFriendId, Number.MAX_SAFE_INTEGER]);
            const rows = await requestToPromise(timeIndex.getAll(timeRange));
            return rows
                .sort((a, b) => {
                    if ((a.timestamp || 0) !== (b.timestamp || 0)) return (a.timestamp || 0) - (b.timestamp || 0);
                    return (a.order || 0) - (b.order || 0);
                })
                .map(denormalizeMessageRecord);
        });
    }

    async function saveFriends(friends) {
        const safeFriends = Array.isArray(friends) ? friends.filter((friend) => friend && friend.id != null) : [];
        const nextFriendIds = new Set(safeFriends.map((friend) => String(friend.id)));
        const retainedAssetIds = new Set();
        safeFriends.forEach((friend) => {
            getExpectedFriendAssetIds(friend).forEach((assetId) => retainedAssetIds.add(assetId));
        });

        const existingFriends = await getAllRecords(STORES.imFriends);
        const existingById = new Map(existingFriends.map((friend) => [String(friend.id), friend]));

        for (const existingFriend of existingFriends) {
            const friendId = String(existingFriend.id);
            if (!nextFriendIds.has(friendId)) {
                await deleteFriend(friendId);
            }
        }

        for (const friend of safeFriends) {
            const previousFriend = existingById.get(String(friend.id)) || null;
            await saveFriendMeta(friend, { previousMeta: previousFriend });
            if (friend.messagesLoaded !== false) {
                await saveFriendMessages(friend.id, friend.messages || []);
            }
            await cleanupRemovedFriendAssets(previousFriend, friend, retainedAssetIds);
        }

        return true;
    }

    async function loadFriends() {
        const allFriends = await getAllRecords(STORES.imFriends);
        const hydrated = await Promise.all(
            allFriends.map(async (friend) => {
                const next = await hydrateFriendAssets(friend);
                next.messages = [];
                next.messagesLoaded = false;
                next.lastMessagePreview = typeof next.lastMessagePreview === 'string' ? next.lastMessagePreview : '';
                next.lastMessageTimestamp = Number(next.lastMessageTimestamp) || 0;
                next.messageCount = Number(next.messageCount) || 0;
                return next;
            })
        );

        hydrated.sort((a, b) => {
            const aPinned = a.isPinned ? 1 : 0;
            const bPinned = b.isPinned ? 1 : 0;
            if (aPinned !== bPinned) return bPinned - aPinned;
            const aTime = Number(a.lastMessageTimestamp) || 0;
            const bTime = Number(b.lastMessageTimestamp) || 0;
            if (aTime !== bTime) return bTime - aTime;
            return String(a.id).localeCompare(String(b.id));
        });

        return hydrated;
    }

    async function persistMomentAssets(moment) {
        if (!moment) return moment;
        const result = { ...moment };

        if (isDataUrl(result.avatar)) {
            const assetId = result.avatarAssetId || buildAssetId('moment_avatar', result.id, 'avatar');
            await saveAssetFromDataUrl(assetId, result.avatar, {
                ownerType: 'im_moment',
                ownerId: String(result.id),
                field: 'avatar'
            });
            result.avatarAssetId = assetId;
            result.avatar = null;
        } else if (result.avatarAssetId && isBlobUrl(result.avatar)) {
            result.avatar = null;
        }

        if (Array.isArray(result.images)) {
            const nextImages = [];
            for (let i = 0; i < result.images.length; i += 1) {
                const item = result.images[i];
                if (typeof item === 'string' && isDataUrl(item)) {
                    const assetId = buildAssetId('moment_img', result.id, i);
                    await saveAssetFromDataUrl(assetId, item, {
                        ownerType: 'im_moment',
                        ownerId: String(result.id),
                        field: 'images',
                        index: i
                    });
                    nextImages.push({ assetId, desc: '' });
                } else if (item && typeof item === 'object' && isDataUrl(item.src)) {
                    const assetId = item.assetId || buildAssetId('moment_img', result.id, i);
                    await saveAssetFromDataUrl(assetId, item.src, {
                        ownerType: 'im_moment',
                        ownerId: String(result.id),
                        field: 'images',
                        index: i
                    });
                    nextImages.push({ ...item, assetId, src: null });
                } else if (item && typeof item === 'object' && item.assetId && isBlobUrl(item.src)) {
                    nextImages.push({ ...item, src: null });
                } else {
                    nextImages.push(item);
                }
            }
            result.images = nextImages;
        }

        return result;
    }

    async function hydrateMomentAssets(moment) {
        if (!moment) return moment;
        const result = { ...moment };

        if (result.avatarAssetId && (!result.avatar || isBlobUrl(result.avatar))) {
            result.avatar = await getAssetUrl(result.avatarAssetId);
        }

        if (Array.isArray(result.images)) {
            const nextImages = [];
            for (const item of result.images) {
                if (item && typeof item === 'object' && item.assetId && (!item.src || isBlobUrl(item.src))) {
                    nextImages.push({ ...item, src: await getAssetUrl(item.assetId) });
                } else {
                    nextImages.push(item);
                }
            }
            result.images = nextImages;
        }

        return result;
    }

    function collectMomentAssetIds(moment) {
        if (!moment) return [];
        const ids = [];
        if (moment.avatarAssetId) ids.push(String(moment.avatarAssetId));
        if (Array.isArray(moment.images)) {
            moment.images.forEach((item) => {
                if (item && typeof item === 'object' && item.assetId) {
                    ids.push(String(item.assetId));
                }
            });
        }
        return Array.from(new Set(ids));
    }

    function getExpectedMomentAssetIds(moment) {
        if (!moment || moment.id == null) return [];
        const ids = [];

        if (moment.avatarAssetId) {
            ids.push(String(moment.avatarAssetId));
        } else if (isDataUrl(moment.avatar)) {
            ids.push(buildAssetId('moment_avatar', moment.id, 'avatar'));
        }

        if (Array.isArray(moment.images)) {
            moment.images.forEach((item, index) => {
                if (item && typeof item === 'object' && item.assetId) {
                    ids.push(String(item.assetId));
                    return;
                }
                if (typeof item === 'string' && isDataUrl(item)) {
                    ids.push(buildAssetId('moment_img', moment.id, index));
                    return;
                }
                if (item && typeof item === 'object' && isDataUrl(item.src)) {
                    ids.push(String(item.assetId || buildAssetId('moment_img', moment.id, index)));
                }
            });
        }

        return Array.from(new Set(ids));
    }

    async function getMomentById(momentId) {
        if (momentId == null) return null;
        return getRecord(STORES.imMoments, momentId);
    }

    async function cleanupRemovedMomentAssets(previousMoment, nextMoment, retainedAssetIds = new Set()) {
        if (!previousMoment) return;
        const nextIds = new Set(getExpectedMomentAssetIds(nextMoment));
        for (const assetId of collectMomentAssetIds(previousMoment)) {
            if (nextIds.has(assetId) || retainedAssetIds.has(assetId)) continue;
            await deleteAsset(assetId);
        }
    }

    async function saveMoment(moment) {
        if (!moment || moment.id == null) return false;
        const previousMoment = await getMomentById(moment.id);
        const retainedAssetIds = new Set(getExpectedMomentAssetIds(moment));
        const prepared = await persistMomentAssets(moment);

        await putRecord(STORES.imMoments, {
            ...prepared,
            id: prepared.id,
            updatedAt: Date.now()
        });

        await cleanupRemovedMomentAssets(previousMoment, moment, retainedAssetIds);
        return true;
    }

    async function deleteMoment(momentId) {
        if (momentId == null) return false;
        const previousMoment = await getMomentById(momentId);
        await deleteRecord(STORES.imMoments, momentId);
        await cleanupRemovedMomentAssets(previousMoment, null);
        return true;
    }

    async function saveMoments(moments) {
        const safeMoments = Array.isArray(moments) ? moments : [];
        const existingMoments = await getAllRecords(STORES.imMoments);
        const nextMomentIds = new Set(safeMoments.map((moment) => String(moment.id)));
        const retainedAssetIds = new Set();

        safeMoments.forEach((moment) => {
            getExpectedMomentAssetIds(moment).forEach((assetId) => retainedAssetIds.add(assetId));
        });

        for (const existingMoment of existingMoments) {
            if (!nextMomentIds.has(String(existingMoment.id))) {
                await deleteMoment(existingMoment.id);
            }
        }

        for (const rawMoment of safeMoments) {
            await saveMoment(rawMoment);
        }

        return true;
    }

    async function loadMoments() {
        const allMoments = await getAllRecords(STORES.imMoments);
        const hydrated = await Promise.all(allMoments.map((moment) => hydrateMomentAssets(moment)));
        hydrated.sort((a, b) => (b.time || 0) - (a.time || 0));
        return hydrated;
    }

    async function saveMomentMessages(messages) {
        const safeMessages = Array.isArray(messages) ? messages : [];
        const normalizedMessages = safeMessages.map((msg) => ({
            ...msg,
            id: msg?.id || `moment_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        }));
        const nextIds = new Set(normalizedMessages.map((msg) => String(msg.id)));

        return withStore([STORES.imMomentMessages], 'readwrite', async (stores) => {
            const existing = await requestToPromise(stores[STORES.imMomentMessages].getAll());
            const existingById = new Map((Array.isArray(existing) ? existing : []).map((item) => [String(item.id), item]));

            existingById.forEach((item, itemId) => {
                if (!nextIds.has(itemId)) {
                    stores[STORES.imMomentMessages].delete(item.id);
                }
            });

            normalizedMessages.forEach((msg) => {
                stores[STORES.imMomentMessages].put(msg);
            });
        });
    }

    async function loadMomentMessages() {
        const rows = await getAllRecords(STORES.imMomentMessages);
        return Array.isArray(rows) ? rows.sort((a, b) => (b.time || 0) - (a.time || 0)) : [];
    }

    async function saveStickers(stickers) {
        const safeStickers = Array.isArray(stickers)
            ? stickers.filter((category) => category && category.categoryName != null)
            : [];
        const normalizedStickers = safeStickers.map((category) => ({
            ...category,
            categoryName: String(category.categoryName)
        }));
        const nextIds = new Set(normalizedStickers.map((category) => category.categoryName));

        return withStore([STORES.imStickers], 'readwrite', async (stores) => {
            const existing = await requestToPromise(stores[STORES.imStickers].getAll());
            const existingById = new Map((Array.isArray(existing) ? existing : []).map((item) => [String(item.categoryName), item]));

            existingById.forEach((item, categoryName) => {
                if (!nextIds.has(categoryName)) {
                    stores[STORES.imStickers].delete(item.categoryName);
                }
            });

            normalizedStickers.forEach((category) => stores[STORES.imStickers].put(category));
        });
    }

    async function loadStickers() {
        return getAllRecords(STORES.imStickers);
    }

    async function saveMomentsCover(dataUrlOrUrl) {
        if (!dataUrlOrUrl) {
            const oldAssetId = await getMeta(META_KEYS.imMomentsCoverAssetId);
            if (oldAssetId && typeof oldAssetId === 'string') await deleteAsset(oldAssetId);
            await setMeta(META_KEYS.imMomentsCoverAssetId, null);
            return null;
        }

        if (isDataUrl(dataUrlOrUrl)) {
            const assetId = 'im_moments_cover_me';
            await saveAssetFromDataUrl(assetId, dataUrlOrUrl, {
                ownerType: 'im_moments',
                ownerId: 'me',
                field: 'momentsCover'
            });
            await setMeta(META_KEYS.imMomentsCoverAssetId, assetId);
            return assetId;
        }

        await setMeta(META_KEYS.imMomentsCoverAssetId, { externalUrl: dataUrlOrUrl });
        return dataUrlOrUrl;
    }

    async function loadMomentsCoverUrl() {
        const assetMeta = await getMeta(META_KEYS.imMomentsCoverAssetId);
        if (!assetMeta) return null;
        if (typeof assetMeta === 'object' && assetMeta.externalUrl) return assetMeta.externalUrl;
        if (typeof assetMeta === 'string') return getAssetUrl(assetMeta);
        return null;
    }

    function createDefaultAppState() {
        return {
            youtube: {
                channelState: {
                    bannerUrl: null,
                    url: '',
                    boundWorldBookIds: [],
                    systemPrompt: '',
                    summaryPrompt: '',
                    groupChatPrompt: '',
                    vodPrompt: '',
                    postPrompt: '',
                    liveSummaryPrompt: '',
                    liveSummaries: [],
                    groupChatHistory: [],
                    cachedTrendingLive: null,
                    cachedTrendingSub: null,
                    pastVideos: []
                },
                subscriptions: [],
                userState: null
            },
            tiktok: {
                profile: {
                    name: 'User',
                    handle: 'user123',
                    avatar: null,
                    status: '思考中...',
                    bio: '点击添加个人简介',
                    persona: '',
                    following: 0,
                    followers: 0,
                    likes: 0,
                    posts: []
                },
                chars: [],
                videos: [
                    {
                        id: 'v_default_1',
                        authorId: 'user_default_1',
                        authorName: 'Mew',
                        desc: '周末的正确打开方式，当然是和猫猫一起虚度光阴啦 🐈 #猫咪日常 #周末vlog',
                        sceneText: '阳光穿过窗纱洒在木地板上，一只橘猫正四仰八叉地躺在阳光里打呼噜。镜头缓慢拉近，画面色调温暖治愈，配着慵懒的 lofi 音乐。',
                        likes: 12543,
                        commentsCount: 432,
                        shares: 128,
                        isLiked: false,
                        comments: [
                            { authorName: 'Cici', text: '好治愈的画面，想去你家偷猫！', likes: 231 },
                            { authorName: '鱼蛋', text: '这猫怎么长得跟人一样哈哈哈', likes: 89 }
                        ]
                    },
                    {
                        id: 'v_default_2',
                        authorId: 'user_default_2',
                        authorName: 'CityWalker',
                        desc: '下雨天的城市，也有别样的浪漫 🌧️ 📸 #扫街 #下雨天 #摄影',
                        sceneText: '镜头跟随着一把透明雨伞，穿梭在霓虹闪烁的积水街道。水面倒映着红蓝色的灯牌，雨滴砸在伞面上发出清脆的白噪音，氛围感拉满。',
                        likes: 8762,
                        commentsCount: 215,
                        shares: 342,
                        isLiked: false,
                        comments: [
                            { authorName: '光影', text: '色彩太棒了，求个滤镜参数', likes: 156 },
                            { authorName: 'Jay', text: '喜欢下雨天的人，内心都很温柔吧', likes: 44 }
                        ]
                    }
                ],
                dms: []
            },
            pay: {
                transactions: [],
                balance: 1000
            },
            spotify: {
                customName: '',
                avatarUrl: '',
                backgroundUrl: ''
            },
            diary: {
                notes: []
            },
            maps: {
                mapsStore: [],
                activeMapId: null,
                friendPositionsStore: {}
            },
            desktop: {},
            bstage: {},
            x: {
                xData: {
                    name: 'User',
                    handle: '@user',
                    bio: '点击编辑资料添加简介',
                    location: '',
                    following: '0',
                    followers: '0',
                    persona: '',
                    avatar: '',
                    banner: ''
                },
                xTopics: [],
                xHomeBannerUrl: '',
                xSearchBannerUrl: ''
            },
            imessage: {
                uiState: {
                    cssPresets: []
                }
            }
        };
    }

    function ensureAppStateShape(rawState = {}) {
        const defaults = createDefaultAppState();
        const safeState = rawState && typeof rawState === 'object' ? rawState : {};

        return {
            ...defaults,
            ...safeState,
            youtube: {
                ...defaults.youtube,
                ...(safeState.youtube && typeof safeState.youtube === 'object' ? safeState.youtube : {})
            },
            tiktok: {
                ...defaults.tiktok,
                ...(safeState.tiktok && typeof safeState.tiktok === 'object' ? safeState.tiktok : {})
            },
            pay: {
                ...defaults.pay,
                ...(safeState.pay && typeof safeState.pay === 'object' ? safeState.pay : {})
            },
            spotify: {
                ...defaults.spotify,
                ...(safeState.spotify && typeof safeState.spotify === 'object' ? safeState.spotify : {})
            },
            diary: {
                ...defaults.diary,
                ...(safeState.diary && typeof safeState.diary === 'object' ? safeState.diary : {})
            },
            maps: {
                ...defaults.maps,
                ...(safeState.maps && typeof safeState.maps === 'object' ? safeState.maps : {})
            },
            desktop: safeState.desktop && typeof safeState.desktop === 'object' ? safeState.desktop : defaults.desktop,
            bstage: safeState.bstage && typeof safeState.bstage === 'object' ? safeState.bstage : defaults.bstage,
            x: {
                ...defaults.x,
                ...(safeState.x && typeof safeState.x === 'object' ? safeState.x : {}),
                xData: {
                    ...defaults.x.xData,
                    ...(safeState.x && safeState.x.xData && typeof safeState.x.xData === 'object'
                        ? safeState.x.xData
                        : {})
                },
                xTopics: Array.isArray(safeState.x?.xTopics) ? safeState.x.xTopics : defaults.x.xTopics,
                xHomeBannerUrl: typeof safeState.x?.xHomeBannerUrl === 'string'
                    ? safeState.x.xHomeBannerUrl
                    : defaults.x.xHomeBannerUrl,
                xSearchBannerUrl: typeof safeState.x?.xSearchBannerUrl === 'string'
                    ? safeState.x.xSearchBannerUrl
                    : defaults.x.xSearchBannerUrl
            },
            imessage: {
                ...defaults.imessage,
                ...(safeState.imessage && typeof safeState.imessage === 'object' ? safeState.imessage : {}),
                uiState: {
                    ...defaults.imessage.uiState,
                    ...(safeState.imessage && safeState.imessage.uiState && typeof safeState.imessage.uiState === 'object'
                        ? safeState.imessage.uiState
                        : {})
                }
            }
        };
    }

    function normalizeGlobalPayload(payload = {}) {
        const safe = payload && typeof payload === 'object' ? payload : {};
        const themeState = safe.themeState && typeof safe.themeState === 'object' ? safe.themeState : null;

        return {
            storageSchemaVersion: STORAGE_SCHEMA_VERSION,
            userState: safe.userState && typeof safe.userState === 'object'
                ? {
                    name: safe.userState.name || '',
                    phone: safe.userState.phone || '',
                    persona: safe.userState.persona || '',
                    avatarUrl: safe.userState.avatarUrl || null
                }
                : {
                    name: '',
                    phone: '',
                    persona: '',
                    avatarUrl: null
                },
            accounts: Array.isArray(safe.accounts) ? safe.accounts : [],
            currentAccountId: safe.currentAccountId ?? null,
            apiConfig: safe.apiConfig && typeof safe.apiConfig === 'object'
                ? {
                    endpoint: typeof safe.apiConfig.endpoint === 'string' ? safe.apiConfig.endpoint : '',
                    apiKey: typeof safe.apiConfig.apiKey === 'string' ? safe.apiConfig.apiKey : '',
                    model: typeof safe.apiConfig.model === 'string' ? safe.apiConfig.model : '',
                    temperature: Number.isFinite(parseFloat(safe.apiConfig.temperature))
                        ? parseFloat(safe.apiConfig.temperature)
                        : 0.7
                }
                : { endpoint: '', apiKey: '', model: '', temperature: 0.7 },
            apiPresets: Array.isArray(safe.apiPresets) ? safe.apiPresets : [],
            fetchedModels: Array.isArray(safe.fetchedModels) ? safe.fetchedModels : [],
            themeState: themeState || {
                bgUrl: null,
                fontMode: 'preset',
                fontPresetKey: 'system-default',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
            fontCssName: '',
            fontSize: 16,
            fontSources: {
                    woff2: '',
                    woff: '',
                    ttf: ''
                },
                savedFontPresets: [],
                apps: [
                    { id: 'app-icon-1', name: 'Pay', icon: null },
                    { id: 'app-icon-2', name: 'TikTok', icon: null },
                    { id: 'app-icon-3', name: 'b.stage', icon: null },
                    { id: 'app-icon-4', name: 'X', icon: null },
                    { id: 'app-icon-5', name: 'Diary', icon: null },
                    { id: 'app-icon-6', name: 'Maps', icon: null },
                    { id: 'app-icon-7', name: 'AO3', icon: null },
                    { id: 'app-icon-8', name: 'Spotify', icon: null },
                    { id: 'dock-icon-settings', name: '设置', icon: null },
                    { id: 'dock-icon-imessage', name: '信息', icon: null },
                    { id: 'dock-icon-youtube', name: 'YouTube', icon: null }
                ]
            },
            wbGroups: Array.isArray(safe.wbGroups) ? safe.wbGroups : [],
            worldBooks: Array.isArray(safe.worldBooks) ? safe.worldBooks : [],
            appState: ensureAppStateShape(safe.appState)
        };
    }

    async function saveGlobalData(payload = {}) {
        const normalized = normalizeGlobalPayload(payload);

        await Promise.all([
            setSetting('userState', normalized.userState),
            setSetting('currentAccountId', normalized.currentAccountId),
            setSetting('apiConfig', normalized.apiConfig),
            setSetting('apiPresets', normalized.apiPresets),
            setSetting('fetchedModels', normalized.fetchedModels),
            setSetting('themeState', normalized.themeState),
            setSetting('wbGroups', normalized.wbGroups),
            setSetting('worldBooks', normalized.worldBooks),
            setSetting('appState', normalized.appState),
            putRecord(STORES.accounts, { id: '__all__', value: cloneDeep(normalized.accounts) }),
            setMeta(META_KEYS.schemaVersion, STORAGE_SCHEMA_VERSION)
        ]);

        return true;
    }

    async function loadGlobalData() {
        const [
            storedSchemaVersion,
            userState,
            currentAccountId,
            apiConfig,
            apiPresets,
            fetchedModels,
            themeState,
            wbGroups,
            worldBooks,
            appState,
            accountsRecord
        ] = await Promise.all([
            getMeta(META_KEYS.schemaVersion),
            getSetting('userState', null),
            getSetting('currentAccountId', null),
            getSetting('apiConfig', null),
            getSetting('apiPresets', []),
            getSetting('fetchedModels', []),
            getSetting('themeState', null),
            getSetting('wbGroups', []),
            getSetting('worldBooks', []),
            getSetting('appState', createDefaultAppState()),
            getRecord(STORES.accounts, '__all__')
        ]);

        return {
            ...normalizeGlobalPayload({
                userState,
                accounts: accountsRecord && Array.isArray(accountsRecord.value) ? accountsRecord.value : [],
                currentAccountId,
                apiConfig,
                apiPresets,
                fetchedModels,
                themeState,
                wbGroups,
                worldBooks,
                appState
            }),
            storageSchemaVersion: Number(storedSchemaVersion) || 0
        };
    }

    async function exportAllData() {
        const globalData = await loadGlobalData();
        const [friends, moments, momentMessages, stickers, momentsCoverUrl] = await Promise.all([
            loadFriends(),
            loadMoments(),
            loadMomentMessages(),
            loadStickers(),
            loadMomentsCoverUrl()
        ]);

        return {
            version: STORAGE_SCHEMA_VERSION,
            exportedAt: Date.now(),
            globalData,
            imessage: {
                friends,
                moments,
                momentMessages,
                stickers,
                momentsCoverUrl
            }
        };
    }

    async function importAllData(payload = {}) {
        const safe = payload && typeof payload === 'object' ? payload : {};
        await clearAllData();
        await saveGlobalData(safe.globalData || {});

        const imessage = safe.imessage && typeof safe.imessage === 'object' ? safe.imessage : {};
        await saveFriends(Array.isArray(imessage.friends) ? imessage.friends : []);
        await saveMoments(Array.isArray(imessage.moments) ? imessage.moments : []);
        await saveMomentMessages(Array.isArray(imessage.momentMessages) ? imessage.momentMessages : []);
        await saveStickers(Array.isArray(imessage.stickers) ? imessage.stickers : []);
        await saveMomentsCover(imessage.momentsCoverUrl || null);

        return true;
    }

    function formatBytes(bytes = 0) {
        const size = Math.max(0, Number(bytes) || 0);
        if (size < 1024) return `${size} B`;

        const units = ['KB', 'MB', 'GB', 'TB'];
        let value = size / 1024;
        let unitIndex = 0;

        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }

        const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
        return `${value.toFixed(precision)} ${units[unitIndex]}`;
    }

    async function measureApproximateUsage() {
        const payload = await exportAllData();
        return new Blob([JSON.stringify(payload)]).size;
    }

    async function getUsageSummary() {
        const [cacheBytes, totalBytes] = await Promise.all([
            measureRuntimeCacheUsage(),
            measureApproximateUsage()
        ]);

        return {
            cacheBytes,
            totalBytes,
            cacheFormatted: formatBytes(cacheBytes),
            totalFormatted: formatBytes(totalBytes),
            label: `${formatBytes(cacheBytes)} / ${formatBytes(totalBytes)}`
        };
    }

    async function clearAllData() {
        try {
            clearRuntimeAssetCache();
        } catch (e) {}

        try {
            const db = await dbPromise;
            if (db) db.close();
        } catch (e) {}
        dbPromise = null;

        const result = await deleteDatabaseSafe(DB_NAME);
        return !!result.deleted;
    }

    async function clearAllPersistentData() {
        try {
            clearRuntimeAssetCache();
        } catch (e) {}

        try {
            const db = await dbPromise;
            if (db) db.close();
        } catch (e) {}
        dbPromise = null;

        const localStorageRemovedKeys = [];
        let localStorageCleared = false;
        let sessionStorageCleared = false;

        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i += 1) {
                const key = localStorage.key(i);
                if (key != null) keys.push(key);
            }
            keys.forEach((key) => {
                const shouldKeep = PERSISTENT_LOCALSTORAGE_EXCLUDE_PREFIXES.some((prefix) => key.startsWith(prefix));
                if (shouldKeep) return;
                localStorageRemovedKeys.push(key);
                localStorage.removeItem(key);
            });
            localStorageCleared = true;
        } catch (error) {
            try {
                localStorage.removeItem('ios_emulator_global_data');
                localStorageRemovedKeys.push('ios_emulator_global_data');
            } catch (e) {}
        }

        try {
            sessionStorage.clear();
            sessionStorageCleared = true;
        } catch (e) {}

        const [currentDbResult, legacyDbResult, cacheResults, swResults] = await Promise.all([
            deleteDatabaseSafe(DB_NAME),
            deleteDatabaseSafe('iiso_imessage_storage'),
            clearBrowserCaches(),
            unregisterServiceWorkers()
        ]);

        return {
            runtimeCacheCleared: true,
            localStorageCleared,
            localStorageRemovedKeys,
            sessionStorageCleared,
            databases: [currentDbResult, legacyDbResult],
            caches: cacheResults,
            serviceWorkers: swResults
        };
    }

    window.appStorage = {
        DB_NAME,
        STORES,
        openDb,
        withStore,
        requestToPromise,
        cloneDeep,
        dataUrlToBlob,
        blobToDataUrl,
        clearRuntimeAssetCache,
        pruneRuntimeAssetCache,
        measureRuntimeCacheUsage,
        formatBytes,
        getUsageSummary,
        saveAssetFromDataUrl,
        getAssetUrl,
        deleteAsset,
        getMeta,
        setMeta,
        getSetting,
        setSetting,
        saveGlobalData,
        loadGlobalData,
        exportAllData,
        importAllData,
        clearAllData,
        clearAllPersistentData,
        clearBrowserCaches,
        unregisterServiceWorkers,
        measureApproximateUsage,
        saveFriends,
        saveFriend,
        saveFriendMetaOnly,
        saveFriendMeta,
        deleteFriend,
        loadFriends,
        saveFriendMessage,
        deleteFriendMessage,
        deleteFriendMessages,
        saveFriendMessages,
        replaceFriendMessages,
        loadMessagesByFriendId,
        saveMoments,
        saveMoment,
        deleteMoment,
        loadMoments,
        saveMomentMessages,
        loadMomentMessages,
        saveStickers,
        loadStickers,
        saveMomentsCover,
        loadMomentsCoverUrl
    };
})();
