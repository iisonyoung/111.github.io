// u2phone Settings App Logic
// Adapted from iiso/emulator/4_settings.js

(function() {
    // Basic User/Account State Mock
    let accounts = [];
    let currentAccountId = null;
    let userState = {
        name: '',
        phone: '',
        persona: '',
        avatarUrl: null
    };

    document.addEventListener('DOMContentLoaded', () => {
        // ==========================================
        // UI DOM Elements Mapping
        // ==========================================
        UI.views.settings = document.getElementById('settings-view');
        UI.views.edit = document.getElementById('edit-view');
        UI.overlays.accountSwitcher = document.getElementById('account-sheet-overlay');
        UI.overlays.personaDetail = document.getElementById('persona-detail-sheet');
        UI.overlays.aboutDevice = document.getElementById('about-device-sheet');
        
        UI.lists.accounts = document.getElementById('account-list');

        // Detail Inputs Mapping
        UI.inputs = {
            detailName: document.getElementById('detail-name-input'),
            detailPhone: document.getElementById('detail-phone-input'),
            detailSignature: document.getElementById('detail-signature-input'),
            detailPersona: document.getElementById('detail-persona-input'),
            detailAvatarImg: document.getElementById('detail-avatar-img'),
            detailAvatarIcon: document.querySelector('#user-detail-avatar-wrapper .fa-user')
        };

        // ==========================================
        // NAVIGATION EVENT LISTENERS
        // ==========================================
        
        // Open Settings from Dock
        const settingsBtn = document.getElementById('dock-icon-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                if (window.isJiggleMode || window.preventAppClick) { e.preventDefault(); e.stopPropagation(); return; }
                syncUIs();
                openView(UI.views.settings);
            });
        }
        
        // Close Settings
        const settingsBackBtn = document.getElementById('settings-title-back-btn');
        if (settingsBackBtn) {
            settingsBackBtn.addEventListener('click', () => closeView(UI.views.settings));
        }

        // About Device
        const aboutDeviceBtn = document.getElementById('about-device-btn');
        const aboutDeviceSheet = document.getElementById('about-device-sheet');
        const aboutDeviceCloseBtn = document.getElementById('about-device-close-btn');
        
        if (aboutDeviceBtn && aboutDeviceSheet) {
            aboutDeviceBtn.addEventListener('click', () => {
                const appNameEl = document.getElementById('about-device-app-name');
                if (appNameEl) appNameEl.textContent = 'u2phone';
                openView(aboutDeviceSheet);
            });
        }
        if (aboutDeviceCloseBtn && aboutDeviceSheet) {
            aboutDeviceCloseBtn.addEventListener('click', () => closeView(aboutDeviceSheet));
        }

        // Data Management
        const dataManagementBtn = document.getElementById('data-management-btn');
        const dataManagementSheet = document.getElementById('data-management-sheet');
        const dataManagementCloseBtn = document.getElementById('data-management-close-btn');
        
        if (dataManagementBtn && dataManagementSheet) {
            dataManagementBtn.addEventListener('click', () => {
                openView(dataManagementSheet);
            });
        }
        if (dataManagementCloseBtn && dataManagementSheet) {
            dataManagementCloseBtn.addEventListener('click', () => closeView(dataManagementSheet));
        }

        // Apple ID / Profile View
        const appleIdTrigger = document.getElementById('apple-id-trigger');
        if (appleIdTrigger) {
            appleIdTrigger.addEventListener('click', (e) => {
                e.stopPropagation(); 
                syncUIs();
                openView(UI.views.edit);
            });
        }
        const editBackBtn = document.getElementById('edit-back-btn');
        if (editBackBtn) {
            editBackBtn.addEventListener('click', () => closeView(UI.views.edit));
        }

        // Account Switcher
        const switchAccountBtn = document.getElementById('switch-account-btn');
        if (switchAccountBtn) {
            switchAccountBtn.addEventListener('click', () => {
                // Mock rendering
                openView(UI.overlays.accountSwitcher);
            });
        }

        // Theme / UI Config dummy handlers (To avoid errors when testing)
        const themeConfigBtn = document.getElementById('theme-config-btn');
        const themeConfigSheet = document.getElementById('theme-config-sheet');
        if (themeConfigBtn && themeConfigSheet) {
            themeConfigBtn.addEventListener('click', () => openView(themeConfigSheet));
        }
        
        const apiConfigBtn = document.getElementById('api-config-btn');
        const apiConfigSheet = document.getElementById('api-config-sheet');
        if (apiConfigBtn && apiConfigSheet) {
            apiConfigBtn.addEventListener('click', () => openView(apiConfigSheet));
        }

        // Clear Data Dummy Listeners
        const clearDataBtn = document.getElementById('clear-data-btn');
        if(clearDataBtn) {
            clearDataBtn.addEventListener('click', async () => {
                if(confirm("确定要清空所有数据吗？此操作不可恢复。")) {
                    showToast('用户数据已清空');
                }
            });
        }

        const formatDataBtn = document.getElementById('format-all-data-btn');
        if(formatDataBtn) {
            formatDataBtn.addEventListener('click', () => {
                if(confirm("警告：此操作将彻底格式化系统！")) {
                    localStorage.clear();
                    showToast('系统已彻底格式化，即将重启');
                    setTimeout(() => location.reload(), 1500);
                }
            });
        }
    });

})();
