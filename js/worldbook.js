// ==========================================
// World Book Logic
// ==========================================
let worldBooks = [];
let wbGroups = [];
let editingBookId = null;
let activeEntryId = null;
let tempEntries = [];

// Load data on init
document.addEventListener('DOMContentLoaded', () => {
    if (window.StorageManager) {
        worldBooks = StorageManager.load('u2_worldBooks', []);
        wbGroups = StorageManager.load('u2_wbGroups', []);
    }
});

function saveWorldBooksData() {
    if (window.StorageManager) {
        StorageManager.save('u2_worldBooks', worldBooks);
        StorageManager.save('u2_wbGroups', wbGroups);
    }
}

// Map the old UI to the new UI property manually just in case
if (typeof UI !== 'undefined' && !UI.views.worldBook) {
    UI.views.worldBook = document.getElementById('world-book-view');
}
if (typeof UI !== 'undefined' && !UI.overlays.addGroup) {
    UI.overlays.addGroup = document.getElementById('add-group-overlay');
}
if (typeof UI !== 'undefined' && !UI.overlays.addBook) {
    UI.overlays.addBook = document.getElementById('add-book-overlay');
}
if (typeof UI !== 'undefined' && !UI.overlays.bookGroupPicker) {
    UI.overlays.bookGroupPicker = document.getElementById('book-group-picker-sheet');
}

const wbBackBtn = document.getElementById('world-book-back-btn');
if (wbBackBtn) {
    wbBackBtn.addEventListener('click', () => {
        closeView(UI.views.worldBook);
    });
}

// Tabs logic
const wbSegmentBtns = document.querySelectorAll('.wb-segment-btn');
const wbTabContents = document.querySelectorAll('.wb-tab-content');

wbSegmentBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Remove active from all
        wbSegmentBtns.forEach(b => b.classList.remove('active'));
        wbTabContents.forEach(c => c.style.display = 'none');
        
        // Add active to clicked
        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-tab');
        const targetContent = document.getElementById(`wb-tab-${targetTab}`);
        if (targetContent) {
            targetContent.style.display = 'block';
        }
    });
});

// Add Menu Logic
const wbAddBtn = document.getElementById('world-book-add-btn');
const wbAddMenu = document.getElementById('wb-add-menu');

if (wbAddBtn && wbAddMenu) {
    wbAddBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        wbAddMenu.style.display = wbAddMenu.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
        if (wbAddMenu.style.display === 'block' && !wbAddMenu.contains(e.target) && e.target !== wbAddBtn) {
            wbAddMenu.style.display = 'none';
        }
    });
}

// Add Group
const btnAddGroup = document.getElementById('wb-add-group-btn');
if (btnAddGroup) {
    btnAddGroup.addEventListener('click', () => {
        wbAddMenu.style.display = 'none';
        document.getElementById('add-group-name-input').value = '';
        openView(UI.overlays.addGroup);
    });
}

const confirmAddGroupBtn = document.getElementById('confirm-add-group-btn');
if (confirmAddGroupBtn) {
    confirmAddGroupBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('add-group-name-input');
        const name = nameInput.value.trim();
        if (name) {
            if (!wbGroups.includes(name)) {
                wbGroups.push(name);
                renderWorldBooks(); // This will refresh the 'All' list
                showToast('分组已添加');
            } else {
                showToast('分组已存在');
            }
            nameInput.value = ''; // Clear input
        }
        closeView(UI.overlays.addGroup);
    });
}

// Add / Edit Book Logic
const btnAddBook = document.getElementById('wb-add-book-btn');
const addEntryBtn = document.getElementById('add-book-entry-btn');

// New Buttons
const wbEditActions = document.getElementById('wb-edit-actions');
const deleteWorldBookBtn = document.getElementById('delete-world-book-btn');

// 导入导出按钮已被移除，不再获取其DOM节点

if (btnAddBook) {
    btnAddBook.addEventListener('click', () => {
        wbAddMenu.style.display = 'none';
        openBookModal(); // Open in create mode
    });
}

function showCenteredConfirm({
    title = '确认操作',
    message = '确定继续吗？',
    confirmText = '确认',
    cancelText = '取消',
    isDestructive = false,
    onConfirm
} = {}) {
    if (window.showCustomModal) {
        window.showCustomModal({
            title,
            message,
            isDestructive,
            confirmText,
            cancelText,
            onConfirm
        });
        return;
    }

    const existingModal = document.getElementById('wb-inline-confirm-overlay');
    if (existingModal) existingModal.remove();

    const overlay = document.createElement('div');
    overlay.id = 'wb-inline-confirm-overlay';
    overlay.className = 'bottom-sheet-overlay wb-centered-modal-overlay active';
    overlay.innerHTML = `
        <div class="wb-centered-modal-card wb-group-modal-card wb-inline-confirm-card">
            <div class="wb-centered-modal-header">
                <div class="wb-centered-modal-title">${title}</div>
            </div>
            <div class="wb-centered-modal-body wb-inline-confirm-body">
                <div class="wb-inline-confirm-message">${message}</div>
                <div class="wb-inline-confirm-actions">
                    <button type="button" class="wb-inline-confirm-btn wb-inline-confirm-cancel">${cancelText}</button>
                    <button type="button" class="wb-inline-confirm-btn ${isDestructive ? 'wb-inline-confirm-danger' : 'wb-inline-confirm-confirm'}">${confirmText}</button>
                </div>
            </div>
        </div>
    `;

    const cleanup = () => overlay.remove();
    const cancelBtn = overlay.querySelector('.wb-inline-confirm-cancel');
    const confirmBtn = overlay.querySelector(isDestructive ? '.wb-inline-confirm-danger' : '.wb-inline-confirm-confirm');

    cancelBtn.addEventListener('click', cleanup);
    confirmBtn.addEventListener('click', () => {
        cleanup();
        if (typeof onConfirm === 'function') onConfirm();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup();
    });

    document.body.appendChild(overlay);
}

function normalizeEntryForEditor(entry = {}, idx = 0) {
    const baseEntry = (window.normalizeWorldBookEntry ? window.normalizeWorldBookEntry(entry) : {
        id: entry.id || `wb-entry-${Date.now()}-${idx}`,
        title: entry.title || entry.name || entry.keyword || `词条${idx + 1}`,
        keyword: entry.title ? (entry.keyword || '') : '',
        content: entry.content || '',
        triggerMode: entry.triggerMode === 'keyword' ? 'keyword' : 'permanent',
        injectionPosition: ['before_role', 'after_role', 'system_depth'].includes(entry.injectionPosition)
            ? entry.injectionPosition
            : 'before_role',
        systemDepth: Number.isFinite(Number(entry.systemDepth)) ? Number(entry.systemDepth) : 4,
        order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : 100,
        recursive: false,
        enabled: entry.enabled !== false
    });

    return {
        ...baseEntry,
        id: Date.now() + idx,
        title: baseEntry.title || entry.keyword || `词条${idx + 1}`,
        keyword: entry.title ? (baseEntry.keyword || '') : (entry.triggerMode === 'keyword' ? (baseEntry.keyword || '') : ''),
        content: baseEntry.content || '',
        triggerMode: baseEntry.triggerMode || 'permanent',
        injectionPosition: baseEntry.injectionPosition || 'before_role',
        systemDepth: Number.isFinite(Number(baseEntry.systemDepth)) ? Number(baseEntry.systemDepth) : 4,
        order: Number.isFinite(Number(baseEntry.order)) ? Number(baseEntry.order) : 100,
        recursive: false,
        enabled: baseEntry.enabled !== false
    };
}

function createDefaultEntry(index = 0) {
    return normalizeEntryForEditor({
        title: `词条${index + 1}`,
        keyword: '',
        content: '',
        triggerMode: 'permanent',
        injectionPosition: 'before_role',
        systemDepth: 4,
        order: 100,
        recursive: false,
        enabled: true
    }, index);
}

function openBookModal(book = null) {
    const modalTitle = document.querySelector('#add-book-overlay .wb-centered-modal-title, #add-book-overlay .sheet-title');
    // Reset state
    if (book) {
        editingBookId = book.id;
        if (modalTitle) modalTitle.textContent = '编辑世界书';
        document.getElementById('add-book-name-input').value = book.name;
        document.getElementById('add-book-group-input').value = book.group;
        
        // Show Edit Actions
        if(wbEditActions) wbEditActions.style.display = 'flex';
        if(deleteWorldBookBtn) deleteWorldBookBtn.style.display = 'flex';

        // Clone entries deeply to avoid reference issues
        tempEntries = (Array.isArray(book.entries) ? book.entries : []).map((e, idx) => normalizeEntryForEditor(e, idx));
        
        if (tempEntries.length > 0) {
            activeEntryId = tempEntries[0].id;
            renderEntries();
        } else {
            addEntry();
        }
    } else {
        editingBookId = null;
        if (modalTitle) modalTitle.textContent = '添加新书';
        document.getElementById('add-book-name-input').value = '';
        document.getElementById('add-book-group-input').value = '未分组';
        
        // Hide Edit Actions
        if(wbEditActions) wbEditActions.style.display = 'none';
        if(deleteWorldBookBtn) deleteWorldBookBtn.style.display = 'none';

        tempEntries = [];
        // Add initial empty entry
        addEntry();
    }
    
    openView(UI.overlays.addBook);
}

// Delete Logic
if (deleteWorldBookBtn) {
    deleteWorldBookBtn.addEventListener('click', () => {
        if (!editingBookId) return;
        showCenteredConfirm({
            title: '删除世界书',
            message: '确定要删除这本世界书吗？此操作不可恢复。',
            isDestructive: true,
            confirmText: '删除',
            onConfirm: () => {
                worldBooks = worldBooks.filter(b => b.id !== editingBookId);
                renderWorldBooks();
                closeView(UI.overlays.addBook);
                showToast('世界书已删除');
            }
        });
    });
}

function addEntry() {
    const newEntry = createDefaultEntry(tempEntries.length);
    tempEntries.push(newEntry);
    activeEntryId = newEntry.id;
    renderEntries();
}

function deleteEntry(id, e) {
    e.stopPropagation();
    showCenteredConfirm({
        title: '删除词条',
        message: '确定要删除这个词条吗？此操作不可恢复。',
        isDestructive: true,
        confirmText: '删除',
        onConfirm: () => {
            tempEntries = tempEntries.filter(ent => ent.id !== id);
            if (activeEntryId === id) {
                activeEntryId = null;
            }
            renderEntries();
        }
    });
}

function renderEntries() {
    const listContainer = document.getElementById('wb-entries-list-container');
    if(!listContainer) return;
    listContainer.innerHTML = '';
    
    tempEntries.forEach(entry => {
        const isExpanded = entry.id === activeEntryId;
        const item = document.createElement('div');
        item.className = `wb-entry-item ${isExpanded ? 'expanded' : ''}`;
        
        const showSystemDepthFields = entry.injectionPosition === 'system_depth';
        const showTriggerKeywordField = entry.triggerMode === 'keyword';
        
        item.innerHTML = `
            <div class="wb-entry-header">
                <span class="wb-entry-title">${entry.title || '未命名词条'}</span>
                <div class="wb-entry-actions">
                    <i class="fas fa-xmark wb-entry-delete-btn"></i>
                    <i class="fas fa-chevron-down wb-entry-toggle-icon"></i>
                </div>
            </div>
            <div class="wb-entry-body">
                <label class="wb-entry-field">
                    <span class="wb-entry-field-label">条目名字</span>
                    <input type="text" class="wb-entry-title-input wb-entry-bubble-input" placeholder="输入条目名字" value="${entry.title || ''}">
                </label>
                <div class="wb-entry-meta-grid" style="grid-template-columns: 1fr 1fr;">
                    <label class="wb-entry-field">
                        <span class="wb-entry-field-label">触发模式</span>
                        <select class="wb-entry-trigger-mode wb-entry-select">
                            <option value="permanent" ${entry.triggerMode === 'permanent' ? 'selected' : ''}>永久</option>
                            <option value="keyword" ${entry.triggerMode === 'keyword' ? 'selected' : ''}>关键词</option>
                        </select>
                    </label>
                    <label class="wb-entry-field">
                        <span class="wb-entry-field-label">注入位置</span>
                        <select class="wb-entry-injection-position wb-entry-select">
                            <option value="before_role" ${entry.injectionPosition === 'before_role' ? 'selected' : ''}>角色前</option>
                            <option value="after_role" ${entry.injectionPosition === 'after_role' ? 'selected' : ''}>角色后</option>
                            <option value="system_depth" ${entry.injectionPosition === 'system_depth' ? 'selected' : ''}>系统深度</option>
                        </select>
                    </label>
                </div>
                <div class="wb-entry-system-depth-fields" style="display: ${showSystemDepthFields ? 'block' : 'none'};">
                    <label class="wb-entry-field">
                        <span class="wb-entry-field-label">系统深度 (数字越小越靠后)</span>
                        <input type="number" class="wb-entry-system-depth-input wb-entry-number-input" min="0" value="${Number.isFinite(Number(entry.systemDepth)) ? Number(entry.systemDepth) : 4}">
                    </label>
                </div>
                <div class="wb-entry-trigger-keyword-field" style="display: ${showTriggerKeywordField ? 'block' : 'none'};">
                    <label class="wb-entry-field">
                        <span class="wb-entry-field-label">关键词 (多个用逗号分隔)</span>
                        <input type="text" class="wb-entry-keyword-input wb-entry-bubble-input" placeholder="输入关键词..." value="${entry.keyword || ''}">
                    </label>
                </div>
                <label class="wb-entry-field">
                    <span class="wb-entry-field-label">详细设定内容</span>
                    <textarea class="wb-entry-body-textarea" placeholder="输入详细设定内容...">${entry.content || ''}</textarea>
                </label>
            </div>
        `;
        
        const header = item.querySelector('.wb-entry-header');
        const deleteBtn = item.querySelector('.wb-entry-delete-btn');
        const titleInput = item.querySelector('.wb-entry-title-input');
        const triggerModeInput = item.querySelector('.wb-entry-trigger-mode');
        const injectionPositionInput = item.querySelector('.wb-entry-injection-position');
        const systemDepthInput = item.querySelector('.wb-entry-system-depth-input');
        const keywordInput = item.querySelector('.wb-entry-keyword-input');
        const contentInput = item.querySelector('.wb-entry-body-textarea');
        
        header.addEventListener('click', (e) => {
            if(e.target === deleteBtn || deleteBtn.contains(e.target)) return;
            if (activeEntryId === entry.id) {
                activeEntryId = null;
            } else {
                activeEntryId = entry.id;
            }
            renderEntries();
        });
        
        deleteBtn.addEventListener('click', (e) => {
            deleteEntry(entry.id, e);
        });
        
        titleInput.addEventListener('input', (e) => {
            entry.title = e.target.value;
            item.querySelector('.wb-entry-title').textContent = entry.title || '未命名词条';
        });
        
        triggerModeInput.addEventListener('change', (e) => {
            entry.triggerMode = e.target.value === 'keyword' ? 'keyword' : 'permanent';
            renderEntries();
        });
        
        injectionPositionInput.addEventListener('change', (e) => {
            entry.injectionPosition = e.target.value;
            renderEntries();
        });
        
        if (systemDepthInput) {
            systemDepthInput.addEventListener('input', (e) => {
                const value = parseInt(e.target.value, 10);
                entry.systemDepth = Number.isFinite(value) ? value : 4;
            });
        }
        
        if (keywordInput) {
            keywordInput.addEventListener('input', (e) => {
                entry.keyword = e.target.value;
            });
        }
        
        contentInput.addEventListener('input', (e) => {
            entry.content = e.target.value;
        });
        
        listContainer.appendChild(item);
    });
}

if (addEntryBtn) {
    addEntryBtn.addEventListener('click', addEntry);
}

// Group Picker for Add Book
const groupSelector = document.getElementById('book-group-selector');
if (groupSelector) {
    groupSelector.addEventListener('click', () => {
        renderBookGroupPicker();
        openView(UI.overlays.bookGroupPicker);
    });
}

if(document.getElementById('close-book-group-picker-btn')) {
    document.getElementById('close-book-group-picker-btn').addEventListener('click', () => {
        closeView(UI.overlays.bookGroupPicker);
    });
}

function renderBookGroupPicker() {
    const list = document.getElementById('book-group-list');
    list.innerHTML = '';
    
    const allGroups = ['未分组', ...wbGroups];
    allGroups.forEach(g => {
        const item = document.createElement('div');
        item.className = 'account-card';
        item.innerHTML = `
            <div class="account-content" style="cursor: pointer; justify-content: center;">
                <div class="account-name">${g}</div>
            </div>
        `;
        item.addEventListener('click', () => {
            document.getElementById('add-book-group-input').value = g;
            closeView(UI.overlays.bookGroupPicker);
        });
        list.appendChild(item);
    });
}

// Confirm Add/Edit Book
const confirmAddBookBtn = document.getElementById('confirm-add-book-btn');
if (confirmAddBookBtn) {
    confirmAddBookBtn.addEventListener('click', () => {
        const name = document.getElementById('add-book-name-input').value.trim() || '未命名世界书';
        const group = document.getElementById('add-book-group-input').value;
        
        // Clean up entries (remove id used for UI)
        const finalEntries = tempEntries.map((e, idx) => ({
            ...normalizeEntryForEditor(e, idx),
            id: undefined,
            title: (e.title || '').trim() || `词条${idx + 1}`,
            keyword: (e.keyword || '').trim(),
            content: e.content || '',
            triggerMode: e.triggerMode === 'keyword' ? 'keyword' : 'permanent',
            injectionPosition: ['before_role', 'after_role', 'system_depth'].includes(e.injectionPosition)
                ? e.injectionPosition
                : 'before_role',
            systemDepth: Number.isFinite(Number(e.systemDepth)) ? Number(e.systemDepth) : 4,
            order: 100, // 后台统一保存为100，不再依赖界面输入框
            recursive: false,
            enabled: e.enabled !== false
        })).map(({ id, ...rest }) => rest);

        if (editingBookId) {
            // Update existing
            const book = worldBooks.find(b => b.id === editingBookId);
            if (book) {
                book.name = name;
                book.group = group;
                book.entries = finalEntries;
                showToast('世界书已更新');
            }
        } else {
            // Create new
            worldBooks.push({
                id: Date.now(),
                name,
                group: group === '未分组' ? '未分组' : group,
                entries: finalEntries,
                isGlobal: false,
                attachedRoles: []
            });
            showToast('世界书已添加');
        }

        saveWorldBooksData();
        renderWorldBooks();
        closeView(UI.overlays.addBook);
    });
}

// Render World Books Helper
function calculateTokens(entries) {
    // Very rough mock token calculation
    let text = entries.map(e => (e.title || '') + (e.keyword || '') + (e.content || '')).join('');
    return Math.ceil(text.length * 1.5) || 0;
}
window.calculateTokens = calculateTokens; // Export for imessage.js

function createBookHtml(book, type) {
    let rightElementHtml = '';
    const tokens = calculateTokens(book.entries);

    if (type === 'all' || type === 'global') {
        rightElementHtml = `
            <div class="wb-book-meta">
                <span class="wb-token-count">+${tokens} Tokens</span>
                <label class="toggle-switch">
                    <input type="checkbox" class="wb-global-toggle" data-id="${book.id}" ${book.isGlobal ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        `;
    } else if (type === 'local') {
        const avatarSrc = book.attachedRoles[0]?.avatarUrl || '';
        const avatarInner = avatarSrc ? `<img src="${avatarSrc}">` : `<i class="fas fa-user"></i>`;
        rightElementHtml = `
            <div class="wb-book-meta">
                <span class="wb-token-count">+${tokens} Tokens</span>
                <div class="wb-char-avatar">${avatarInner}</div>
            </div>
        `;
    }

    return `
        <div class="wb-book-item" data-id="${book.id}">
            <div class="wb-book-info">
                <div class="wb-book-icon" style="background-color: #1c1c1e;"><i class="fas fa-book"></i></div>
                <div class="wb-book-name">${book.name}</div>
            </div>
            ${rightElementHtml}
        </div>
    `;
}

function renderWorldBooks() {
    // Render All Tab
    const allList = document.getElementById('wb-all-list');
    if (!allList) return;
    allList.innerHTML = '';
    
    // Render Groups
    wbGroups.forEach(groupName => {
        const booksInGroup = worldBooks.filter(b => b.group === groupName);
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'wb-group-container';
        
        const booksHtml = booksInGroup.map(b => createBookHtml(b, 'all')).join('');
        
        groupDiv.innerHTML = `
            <div class="wb-group-header">
                <i class="fas fa-folder wb-group-folder-icon"></i>
                <div class="wb-group-title">${groupName} <span class="wb-group-count">(${booksInGroup.length})</span></div>
                <i class="fas fa-chevron-down toggle-icon"></i>
            </div>
            <div class="wb-group-content">
                ${booksHtml}
            </div>
        `;
        
        // Toggle fold (Exclusive)
        const header = groupDiv.querySelector('.wb-group-header');
        const content = groupDiv.querySelector('.wb-group-content');
        header.addEventListener('click', () => {
            const isCurrentlyOpen = content.classList.contains('open');
            
            // Close all others first
            document.querySelectorAll('.wb-group-container').forEach(container => {
                container.classList.remove('is-open');
                const otherContent = container.querySelector('.wb-group-content');
                if(otherContent) otherContent.classList.remove('open');
            });

            // Toggle current
            if (!isCurrentlyOpen) {
                content.classList.add('open');
                groupDiv.classList.add('is-open');
            }
        });

        allList.appendChild(groupDiv);
    });

    // Render Ungrouped
    const unGroupedBooks = worldBooks.filter(b => b.group === '未分组');
    if (unGroupedBooks.length > 0) {
        const unGroupDiv = document.createElement('div');
        unGroupDiv.className = 'wb-group-container';
        const booksHtml = unGroupedBooks.map(b => createBookHtml(b, 'all')).join('');
        unGroupDiv.innerHTML = `
            <div class="wb-group-header">
                <i class="fas fa-folder wb-group-folder-icon"></i>
                <div class="wb-group-title">未分组 <span class="wb-group-count">(${unGroupedBooks.length})</span></div>
                <i class="fas fa-chevron-down toggle-icon"></i>
            </div>
            <div class="wb-group-content">
                ${booksHtml}
            </div>
        `;
        // Toggle fold (Exclusive)
        const header = unGroupDiv.querySelector('.wb-group-header');
        const content = unGroupDiv.querySelector('.wb-group-content');
        header.addEventListener('click', () => {
            const isCurrentlyOpen = content.classList.contains('open');
            
            // Close all others first
            document.querySelectorAll('.wb-group-container').forEach(container => {
                container.classList.remove('is-open');
                const otherContent = container.querySelector('.wb-group-content');
                if(otherContent) otherContent.classList.remove('open');
            });

            // Toggle current
            if (!isCurrentlyOpen) {
                content.classList.add('open');
                unGroupDiv.classList.add('is-open');
            }
        });

        allList.appendChild(unGroupDiv);
    }

    // Render Global Tab
    const globalList = document.getElementById('wb-global-list');
    if (globalList) {
        const globalBooks = worldBooks.filter(b => b.isGlobal);
        globalList.innerHTML = `<div style="padding: 10px 16px;">
            ${globalBooks.map(b => createBookHtml(b, 'global')).join('')}
        </div>`;
    }

    // Render Local Tab
    const localList = document.getElementById('wb-local-list');
    if (localList) {
        let localItemsHtml = '';
        
        // Get friends from imessage.js via global export if available
        const friends = window.getImFriends ? window.getImFriends() : [];
        
        worldBooks.forEach(book => {
            // Find all friends that have bound this book
            const boundFriends = friends.filter(f => f.boundBooks && f.boundBooks.includes(book.id));
            
            boundFriends.forEach(friend => {
                const tokens = window.calculateTokens(book.entries);
                const avatarSrc = friend.avatarUrl || '';
                const avatarInner = avatarSrc ? `<img src="${avatarSrc}">` : `<i class="fas fa-user"></i>`;
                
                const rightElementHtml = `
                    <div class="wb-book-meta">
                        <span class="wb-token-count">+${tokens} Tokens</span>
                        <div class="wb-char-avatar">${avatarInner}</div>
                    </div>
                `;
                
                localItemsHtml += `
                    <div class="wb-book-item" data-id="${book.id}">
                        <div class="wb-book-info">
                            <div class="wb-book-icon"><i class="fas fa-book"></i></div>
                            <div class="wb-book-name">${book.name}</div>
                        </div>
                        ${rightElementHtml}
                    </div>
                `;
            });
        });
        
        if (localItemsHtml === '') {
            localList.innerHTML = `<div style="padding: 40px 16px; text-align: center; color: #8e8e93; font-size: 15px;">暂无绑定</div>`;
        } else {
            localList.innerHTML = `<div style="padding: 10px 16px; display: flex; flex-direction: column; gap: 10px;">
                ${localItemsHtml}
            </div>`;
        }
    }

}
window.renderWorldBooks = renderWorldBooks; // Export for update
window.getWorldBooks = function() {
    return Array.isArray(worldBooks) ? worldBooks : [];
};

window.renderWorldBookSelector = function(selectedIds = [], onConfirm) {
    const selected = new Set((Array.isArray(selectedIds) ? selectedIds : []).map(String));
    let selectorSheet = document.getElementById('wb-selector-sheet');

    if (!selectorSheet) {
        selectorSheet = document.createElement('div');
        selectorSheet.id = 'wb-selector-sheet';
        selectorSheet.className = 'bottom-sheet-overlay detail-sheet-overlay';
        selectorSheet.style.zIndex = '650';
        selectorSheet.innerHTML = `
            <div class="bottom-sheet" style="height: 72%; display: flex; flex-direction: column;">
                <div class="sheet-handle"></div>
                <div class="sheet-title">选择世界书</div>
                <div id="wb-selector-list" class="account-list" style="flex: 1; overflow-y: auto; margin: 16px;"></div>
                <div style="display: flex; gap: 10px; padding: 0 16px 20px;">
                    <div class="sheet-action" id="wb-selector-cancel-btn" style="flex: 1; margin: 0;">取消</div>
                    <div class="sheet-action confirm-action" id="wb-selector-confirm-btn" style="flex: 1; margin: 0; background-color: #1c1c1e; color: #fff;">保存</div>
                </div>
            </div>
        `;
        const appRoot = document.getElementById('app') || document.body;
        appRoot.appendChild(selectorSheet);

        selectorSheet.addEventListener('click', (event) => {
            if (event.target === selectorSheet) closeView(selectorSheet);
        });
    }

    const listEl = selectorSheet.querySelector('#wb-selector-list');
    const confirmBtn = selectorSheet.querySelector('#wb-selector-confirm-btn');
    const cancelBtn = selectorSheet.querySelector('#wb-selector-cancel-btn');

    if (listEl) {
        if (!Array.isArray(worldBooks) || worldBooks.length === 0) {
            listEl.innerHTML = '<div style="padding: 40px 16px; text-align: center; color: #8e8e93; font-size: 15px;">暂无世界书</div>';
        } else {
            listEl.innerHTML = worldBooks.map((book) => {
                const id = String(book.id);
                const checked = selected.has(id) ? 'checked' : '';
                const name = book.name || '未命名世界书';
                return `
                    <label class="settings-item" style="cursor: pointer;">
                        <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                            <i class="fas fa-book" style="color: var(--blue-color);"></i>
                            <span style="font-size: 15px; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</span>
                        </div>
                        <input type="checkbox" class="wb-selector-checkbox" value="${id}" ${checked} style="width: 20px; height: 20px;">
                    </label>
                `;
            }).join('');
        }
    }

    if (cancelBtn) {
        cancelBtn.onclick = () => closeView(selectorSheet);
    }

    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const nextIds = Array.from(selectorSheet.querySelectorAll('.wb-selector-checkbox:checked'))
                .map((input) => input.value);
            closeView(selectorSheet);
            if (typeof onConfirm === 'function') onConfirm(nextIds);
        };
    }

    openView(selectorSheet);
};

// Auto-save summary to World Book globally
window.autoSaveSummaryToWorldBook = function(title, summaryText) {
    const newBook = {
        id: Date.now(),
        name: title || '自动总结',
        group: '未分组',
        entries: [{
            title: '总结内容',
            keyword: '',
            content: summaryText,
            triggerMode: 'permanent',
            injectionPosition: 'before_role',
            systemDepth: 4,
            order: 100,
            recursive: false,
            enabled: true
        }],
        isGlobal: true,
        attachedRoles: []
    };
    
    worldBooks.push(newBook);
    saveWorldBooksData();
    renderWorldBooks();
    showToast('已自动生成全局世界书');
};

// Global Click Listener for Edit Book (Event Delegation)
document.addEventListener('click', (e) => {
    // Handle Edit Book Click
    const bookItem = e.target.closest('.wb-book-item');
    if (bookItem) {
        // Ensure we didn't click the toggle switch
        if (!e.target.closest('.toggle-switch')) {
            const bookId = parseInt(bookItem.getAttribute('data-id'));
            const book = worldBooks.find(b => b.id === bookId);
            if (book) {
                if (window.wbAddMenu) window.wbAddMenu.style.display = 'none'; // Close menu if open
                openBookModal(book);
            }
        }
    }
});

// Global Change Listener for Toggles
document.addEventListener('change', (e) => {
    if (e.target && e.target.classList.contains('wb-global-toggle')) {
        const bookId = parseInt(e.target.getAttribute('data-id'));
        const book = worldBooks.find(b => b.id === bookId);
        if (book) {
            book.isGlobal = e.target.checked;
            
            // Sync UI: update all switches for this book
            document.querySelectorAll(`.wb-global-toggle[data-id="${bookId}"]`).forEach(s => {
                s.checked = book.isGlobal;
            });

            // If in Global tab and unchecking, remove item with animation
            if (!book.isGlobal) {
                const globalList = document.getElementById('wb-global-list');
                // Check if the event came from inside global list
                if (globalList && globalList.contains(e.target)) {
                    const row = e.target.closest('.wb-book-item');
                    if (row) {
                        row.classList.add('removing');
                        setTimeout(() => {
                            row.remove();
                        }, 300);
                    }
                } else {
                    // Unchecked from All tab, just refresh global list silently
                    if (globalList) {
                        const globalBooks = worldBooks.filter(b => b.isGlobal);
                        globalList.innerHTML = `<div style="padding: 10px 16px;">
                            ${globalBooks.map(b => createBookHtml(b, 'global')).join('')}
                        </div>`;
                    }
                }
            } else {
                // Checked from All tab, add to global list
                const globalList = document.getElementById('wb-global-list');
                if (globalList) {
                    const globalBooks = worldBooks.filter(b => b.isGlobal);
                    globalList.innerHTML = `<div style="padding: 10px 16px;">
                        ${globalBooks.map(b => createBookHtml(b, 'global')).join('')}
                    </div>`;
                }
            }
        }
    }
});
