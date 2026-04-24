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

    // ==========================================
    // API Configuration State
    // ==========================================
    let apiConfig = {
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
    let apiPresets = [];
    let fetchedModels = [];
    
    // 用于保存正在编辑的状态，避免未点保存就污染全局配置
    let tempApiConfig = { main: {}, sub: {} };
    let currentApiTab = 'main';

    // ==========================================
    // Theme Configuration State
    // ==========================================
    const DEFAULT_SYSTEM_THEME_FONT_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    const BUILTIN_THEME_FONTS = [
        {
            key: 'system-default',
            label: '默认',
            cssName: '',
            family: DEFAULT_SYSTEM_THEME_FONT_FAMILY,
            sources: { woff2: '', woff: '', ttf: '' }
        }
    ];

    let themeState = {
        bgUrl: null,
        apps: [
            { id: 'app-icon-1', name: 'Pay', icon: null },
            { id: 'app-icon-2', name: 'TikTok', icon: null },
            { id: 'app-icon-3', name: 'b.stage', icon: null },
            { id: 'app-icon-4', name: 'X', icon: null },
            { id: 'app-icon-5', name: 'Diary', icon: null },
            { id: 'app-icon-6', name: 'Maps', icon: null },
            { id: 'app-icon-7', name: 'AO3', icon: null },
            { id: 'app-icon-8', name: 'Loves', icon: null },
            { id: 'dock-icon-settings', name: '设置', icon: null },
            { id: 'dock-icon-imessage', name: '信息', icon: null },
            { id: 'dock-icon-youtube', name: 'YouTube', icon: null }
        ],
        fontMode: 'preset', // 'preset' or 'saved'
        fontPresetKey: 'system-default',
        fontFamily: DEFAULT_SYSTEM_THEME_FONT_FAMILY,
        fontCssName: '',
        fontSize: 16,
        fontSources: { woff2: '', woff: '', ttf: '' },
        savedFontPresets: []
    };
    
    document.addEventListener('DOMContentLoaded', () => {
        // ==========================================
        // Load Saved Data
        // ==========================================
        if (window.StorageManager) {
            apiConfig = StorageManager.load('u2_apiConfig', apiConfig);
            apiPresets = StorageManager.load('u2_apiPresets', []);
            fetchedModels = StorageManager.load('u2_fetchedModels', []);
            
            // Load Theme State
            const savedThemeState = StorageManager.load('u2_themeState', null);
            if (savedThemeState) {
                // Merge arrays smartly to retain new apps if added
                if (Array.isArray(savedThemeState.apps)) {
                    savedThemeState.apps.forEach(savedApp => {
                        const existingApp = themeState.apps.find(a => a.id === savedApp.id);
                        if (existingApp) {
                            existingApp.icon = savedApp.icon;
                            existingApp.name = savedApp.name || existingApp.name;
                        } else {
                            themeState.apps.push(savedApp);
                        }
                    });
                    delete savedThemeState.apps;
                }
                themeState = { ...themeState, ...savedThemeState };
            }
            
            // Apply loaded theme state immediately
            applySavedTheme();
        }
        
        // Expose globally for other modules if needed
        window.apiConfig = apiConfig;

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
            detailAvatarIcon: document.querySelector('#user-detail-avatar-wrapper .fa-user'),
            
            // API Config Inputs
            apiTabMain: document.getElementById('api-tab-main'),
            apiTabSub: document.getElementById('api-tab-sub'),
            mainApiControls: document.getElementById('main-api-controls'),
            subApiControls: document.getElementById('sub-api-controls'),
            apiEnableSubToggle: document.getElementById('api-enable-sub-toggle'),
            apiEndpoint: document.getElementById('api-endpoint-input'),
            apiKey: document.getElementById('api-key-input'),
            apiModel: document.getElementById('api-model-select'),
            apiTemp: document.getElementById('api-temp-input'),
            presetName: document.getElementById('preset-name-input')
        };

        UI.lists.presets = document.getElementById('preset-list');
        
        UI.overlays.apiConfig = document.getElementById('api-config-sheet');
        UI.overlays.savePreset = document.getElementById('save-preset-name-sheet');
        UI.overlays.loadPreset = document.getElementById('load-preset-list-sheet');

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

        // ==========================================
        // THEME CONFIGURATION LOGIC
        // ==========================================
        const themeConfigBtn = document.getElementById('theme-config-btn');
        const themeConfigSheet = document.getElementById('theme-config-sheet');
        
        function applySavedTheme() {
            applyThemeBackground(themeState);
            applyThemeFont(themeState);
            applyThemeAppIcons(themeState);
        }

        if (themeConfigBtn && themeConfigSheet) {
            themeConfigBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                ensureThemeFontStateShape();
                const themeBgUrlInput = document.getElementById('theme-bg-url-input');
                if (themeBgUrlInput) themeBgUrlInput.value = themeState.bgUrl || '';
                syncThemeFontInputsFromState();
                renderThemeFontPresetLists();
                renderThemeFontPreview();
                renderThemeAppList();
                openView(themeConfigSheet);
            });
        }
        
        // Theme Background
        const themeBgUploadBtn = document.getElementById('theme-bg-upload-btn');
        const themeBgResetBtn = document.getElementById('theme-bg-reset-btn');
        const themeBgFileInput = document.getElementById('theme-bg-file-input');
        
        if (themeBgUploadBtn) themeBgUploadBtn.addEventListener('click', () => themeBgFileInput?.click());
        if (themeBgResetBtn) {
            themeBgResetBtn.addEventListener('click', () => {
                themeState.bgUrl = null;
                commitThemeBackgroundChanges('背景已重置');
            });
        }
        
        if (themeBgFileInput) {
            themeBgFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        // Resize for background if compressImage is available
                        if (window.compressImage) {
                            window.compressImage(event.target.result, 1080, 1920, (compressedUrl) => {
                                themeState.bgUrl = compressedUrl;
                                commitThemeBackgroundChanges('背景已更新');
                            });
                        } else {
                            themeState.bgUrl = event.target.result;
                            commitThemeBackgroundChanges('背景已更新');
                        }
                    };
                    reader.readAsDataURL(file);
                }
                e.target.value = '';
            });
        }
        
        function applyThemeBackground(state) {
            const appEl = document.getElementById('app');
            if (!appEl) return;
            const bgUrl = typeof state.bgUrl === 'string' ? state.bgUrl.trim() : '';
            if (bgUrl) {
                appEl.style.backgroundImage = `url(${bgUrl})`;
                appEl.style.backgroundSize = 'cover';
                appEl.style.backgroundPosition = 'center';
                appEl.style.backgroundColor = 'transparent';
                document.body.style.backgroundImage = `url(${bgUrl})`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
            } else {
                appEl.style.backgroundImage = 'none';
                appEl.style.backgroundColor = '';
                document.body.style.backgroundImage = 'none';
            }
        }
        
        function commitThemeBackgroundChanges(toastMessage = '') {
            applyThemeBackground(themeState);
            saveGlobalData();
            if (toastMessage) showToast(toastMessage);
        }

        // Theme Apps Icons
        const themeAppListContainer = document.getElementById('theme-app-list');
        const themeAppFileInput = document.getElementById('theme-app-file-input');
        const resetAllIconsBtn = document.getElementById('theme-reset-all-icons-btn');
        let currentEditingAppIndex = -1;
        
        if (resetAllIconsBtn) {
            resetAllIconsBtn.addEventListener('click', () => {
                themeState.apps.forEach(app => { app.icon = null; });
                commitThemeAppIconChanges('应用图标已全部重置');
            });
        }
        
        if (themeAppFileInput) {
            themeAppFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && currentEditingAppIndex >= 0) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (window.compressImage) {
                            window.compressImage(event.target.result, 150, 150, (compressedUrl) => {
                                const appName = themeState.apps[currentEditingAppIndex]?.name || '应用';
                                themeState.apps[currentEditingAppIndex].icon = compressedUrl;
                                commitThemeAppIconChanges(`${appName} 图标已更新`);
                            });
                        } else {
                            const appName = themeState.apps[currentEditingAppIndex]?.name || '应用';
                            themeState.apps[currentEditingAppIndex].icon = event.target.result;
                            commitThemeAppIconChanges(`${appName} 图标已更新`);
                        }
                    };
                    reader.readAsDataURL(file);
                }
                e.target.value = '';
            });
        }
        
        function renderThemeAppList() {
            if (!themeAppListContainer) return;
            themeAppListContainer.innerHTML = '';
        
            themeState.apps.forEach((app, index) => {
                const item = document.createElement('div');
                item.className = 'form-item';
                item.style.padding = '8px 16px';
                item.style.height = '60px';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.borderBottom = '1px solid #f2f2f7';
                
                let iconHtml = '';
                if (app.icon) {
                    iconHtml = `<div style="width: 40px; height: 40px; border-radius: 10px; background-image: url('${app.icon}'); background-size: cover; background-position: center; border: 1px solid #e5e5ea; flex-shrink: 0;"></div>`;
                } else {
                    iconHtml = `<div style="width: 40px; height: 40px; border-radius: 10px; background-color: #f2f2f7; border: 1px solid #e5e5ea; display: flex; align-items: center; justify-content: center; color: #c7c7cc; flex-shrink: 0;"><i class="fas fa-image"></i></div>`;
                }
        
                item.innerHTML = `
                    <div style="display: flex; align-items: center; flex: 1;">
                        ${iconHtml}
                        <div style="margin-left: 12px; font-size: 16px; font-weight: 500; color: #000;">${app.name}</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <div class="reset-single-app-btn" style="width: 32px; height: 32px; border-radius: 50%; background: #ffebee; color: #ff3b30; display: flex; justify-content: center; align-items: center; cursor: pointer;">
                            <i class="fas fa-undo" style="font-size: 14px;"></i>
                        </div>
                        <div class="upload-single-app-btn" style="width: 32px; height: 32px; border-radius: 50%; background: #e8f5e9; color: #34c759; display: flex; justify-content: center; align-items: center; cursor: pointer;">
                            <i class="fas fa-upload" style="font-size: 14px;"></i>
                        </div>
                    </div>
                `;
                
                const resetBtn = item.querySelector('.reset-single-app-btn');
                resetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    themeState.apps[index].icon = null;
                    commitThemeAppIconChanges(`${app.name} 图标已重置`);
                });
        
                const uploadBtn = item.querySelector('.upload-single-app-btn');
                uploadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentEditingAppIndex = index;
                    themeAppFileInput?.click();
                });
        
                themeAppListContainer.appendChild(item);
            });
        }
        
        function applyThemeAppIcons(state) {
            if (!Array.isArray(state.apps)) return;
            state.apps.forEach(app => applyAppIconStyles(app));
        }
        
        function commitThemeAppIconChanges(toastMessage = '') {
            applyThemeAppIcons(themeState);
            renderThemeAppList();
            saveGlobalData();
            if (toastMessage) showToast(toastMessage);
        }
        
        function applyAppIconStyles(app) {
            const el = document.getElementById(app.id);
            if (!el) return;
        
            const appItem = el.classList.contains('app-item') ? el : el.closest('.app-item');
            const iconDiv = el.classList.contains('app-icon') ? el : (el.querySelector('.app-icon') || appItem?.querySelector('.app-icon'));
            const nameEl = appItem ? appItem.querySelector('.app-name') : el.querySelector('.app-name');
        
            if (nameEl && app.name) {
                nameEl.textContent = app.name;
            }
        
            if (!iconDiv) return;
        
            const ensureIconElement = (className, extraStyle = '') => {
                iconDiv.innerHTML = `<i class="${className}" style="${extraStyle}"></i>`;
                return iconDiv.querySelector('i');
            };
        
            if (app.icon) {
                iconDiv.innerHTML = '';
                iconDiv.style.backgroundImage = `url(${app.icon})`;
                iconDiv.style.backgroundSize = 'cover';
                iconDiv.style.backgroundPosition = 'center';
                iconDiv.style.backgroundColor = 'transparent';
                iconDiv.style.background = 'transparent';
                // Reset possible inner borders
                iconDiv.style.border = 'none';
            } else {
                iconDiv.style.backgroundImage = 'none';
                iconDiv.style.backgroundSize = '';
                iconDiv.style.backgroundPosition = '';
                iconDiv.style.backgroundColor = '';
                iconDiv.style.color = '';
                iconDiv.style.border = '1px solid #e5e5ea';
                iconDiv.style.display = 'flex';
                iconDiv.style.justifyContent = 'center';
                iconDiv.style.alignItems = 'center';
                iconDiv.innerHTML = '';
        
                if (app.id === 'dock-icon-settings') {
                    iconDiv.style.background = '#ffffff';
                    iconDiv.style.color = '#1c1c1e';
                    ensureIconElement('fas fa-cog');
                } else if (app.id === 'dock-icon-imessage') {
                    iconDiv.style.background = 'linear-gradient(180deg, #ffffff 0%, #f2f2f7 100%)';
                    iconDiv.style.color = '#1c1c1e';
                    ensureIconElement('fas fa-comment');
                } else if (app.id === 'dock-icon-youtube') {
                    iconDiv.style.background = '#ffffff';
                    iconDiv.style.color = '#1c1c1e';
                    iconDiv.style.fontSize = '38px';
                    ensureIconElement('fab fa-youtube');
                } else if (app.id === 'app-icon-1') {
                    iconDiv.style.background = '#ffffff';
                    iconDiv.style.color = '#1c1c1e';
                    ensureIconElement('fas fa-wallet');
                } else if (app.id === 'app-icon-2') {
                    iconDiv.style.background = '#ffffff';
                    iconDiv.style.color = '#1c1c1e';
                    ensureIconElement('fab fa-tiktok');
                } else if (app.id === 'app-icon-3') {
                    iconDiv.style.background = '#ffffff';
                    iconDiv.style.color = '#1c1c1e';
                    ensureIconElement('fas fa-layer-group', 'font-size: 26px;');
                } else if (app.id === 'app-icon-4') {
                    iconDiv.style.background = '#ffffff';
                    iconDiv.style.color = '#1c1c1e';
                    ensureIconElement('fa-brands fa-x-twitter', 'font-size: 26px;');
                } else if (app.id === 'app-icon-5') {
                    iconDiv.style.background = '#ffffff';
                    iconDiv.style.color = '#1c1c1e';
                    ensureIconElement('fas fa-book', 'color: #1c1c1e; font-size: 30px; filter: none;');
                } else if (app.id === 'app-icon-6') {
                    iconDiv.style.background = '#ffffff';
                    iconDiv.style.color = '#1c1c1e';
                    ensureIconElement('fas fa-map-location-dot', 'color: #1c1c1e; font-size: 28px; filter: none;');
                } else if (app.id === 'app-icon-7') {
                    iconDiv.style.background = '#ffffff';
                    iconDiv.style.color = '#111111';
                    iconDiv.style.border = '1px solid #d9d9d9';
                    ensureIconElement('fas fa-feather-pointed', 'color: #9d1d1d; font-size: 28px;');
                } else if (app.id === 'app-icon-8') {
                    iconDiv.style.background = '#ffffff';
                    iconDiv.style.color = '#1c1c1e';
                    ensureIconElement('fas fa-heart', 'color: #1c1c1e; font-size: 28px;');
                }
            }
        }

        // Theme Font Logic
        const themeFontBtn = document.getElementById('theme-font-btn');
        const themeFontModal = document.getElementById('theme-font-modal');
        const themeFontCloseBtn = document.getElementById('theme-font-close-btn');
        const themeFontResetBtn = document.getElementById('theme-font-reset-btn');
        const themeFontLinkFocusBtn = document.getElementById('theme-font-link-focus-btn');
        const themeFontApplyCustomBtn = document.getElementById('theme-font-apply-custom-btn');
        const themeFontSavePresetBtn = document.getElementById('theme-font-save-preset-btn');
        const themeFontCustomSection = document.getElementById('theme-font-custom-section');
        const themeFontModalPreview = document.getElementById('theme-font-modal-preview');
        const themeFontCurrentLabel = document.getElementById('theme-font-current-label');
        const themeFontModalPresetList = document.getElementById('theme-font-modal-preset-list');
        const themeFontModalUserPresetList = document.getElementById('theme-font-modal-user-preset-list');
        const themeFontNameInput = document.getElementById('theme-font-name-input');
        const themeFontUrlInput = document.getElementById('theme-font-url-input');
        const themeFontSizeSlider = document.getElementById('theme-font-size-slider');
        const themeFontSizeValue = document.getElementById('theme-font-size-value');
        const THEME_FONT_PREVIEW_TEXT = 'Aa 你好 Hello 123';
        
        function cloneThemeFontSources(sources = {}) {
            return {
                woff2: typeof sources.woff2 === 'string' ? sources.woff2.trim() : '',
                woff: typeof sources.woff === 'string' ? sources.woff.trim() : '',
                ttf: typeof sources.ttf === 'string' ? sources.ttf.trim() : ''
            };
        }

        function normalizeThemeFontSize(value) {
            const parsed = Number(value);
            if (!Number.isFinite(parsed)) return 16;
            return Math.min(24, Math.max(12, Math.round(parsed)));
        }

        function sanitizeThemeFontCssName(value) {
            const sanitized = String(value || '').trim().replace(/["']/g, '').replace(/[{}]/g, '').replace(/\s+/g, ' ');
            return sanitized || 'CustomThemeFont';
        }

        function buildThemeFontFamily(cssName) {
            return `"${cssName}", system-ui`;
        }

        function normalizeThemeFontPreset(preset = {}, fallbackIndex = 0) {
            const normalizedName = sanitizeThemeFontCssName(preset.name || preset.label || preset.cssName || `CustomFont${fallbackIndex + 1}`);
            return {
                id: typeof preset.id === 'string' && preset.id ? preset.id : `font_preset_${Date.now()}_${fallbackIndex}`,
                type: 'user',
                name: normalizedName,
                label: normalizedName,
                cssName: sanitizeThemeFontCssName(preset.cssName || normalizedName),
                family: buildThemeFontFamily(preset.cssName || normalizedName),
                sources: cloneThemeFontSources(preset.sources)
            };
        }

        function ensureThemeFontStateShape() {
            if (!themeState || typeof themeState !== 'object') return;
            if (!themeState.fontMode) themeState.fontMode = 'preset';
            if (!themeState.fontPresetKey) themeState.fontPresetKey = 'system-default';
            if (!themeState.fontFamily) themeState.fontFamily = DEFAULT_SYSTEM_THEME_FONT_FAMILY;
            if (typeof themeState.fontCssName !== 'string') themeState.fontCssName = '';
            themeState.fontSize = normalizeThemeFontSize(themeState.fontSize);

            const builtin = BUILTIN_THEME_FONTS.find(f => f.key === themeState.fontPresetKey) || BUILTIN_THEME_FONTS[0];
            if (themeState.fontMode !== 'saved') {
                themeState.fontPresetKey = builtin.key;
                themeState.fontFamily = builtin.family || DEFAULT_SYSTEM_THEME_FONT_FAMILY;
                themeState.fontCssName = builtin.cssName || '';
            }

            if (!themeState.fontSources || typeof themeState.fontSources !== 'object') {
                themeState.fontSources = cloneThemeFontSources(builtin.sources);
            } else {
                themeState.fontSources = cloneThemeFontSources(themeState.fontSources);
            }

            if (!Array.isArray(themeState.savedFontPresets)) {
                themeState.savedFontPresets = [];
            } else {
                themeState.savedFontPresets = themeState.savedFontPresets.map((preset, index) => normalizeThemeFontPreset(preset, index));
            }
        }

        function getActiveThemeFontDefinition(state = themeState) {
            ensureThemeFontStateShape();
            if (state.fontMode === 'saved') {
                const savedPreset = state.savedFontPresets.find(p => p.id === state.fontPresetKey);
                if (savedPreset) {
                    return { ...savedPreset, type: 'user' };
                }
            }
            const preset = BUILTIN_THEME_FONTS.find(f => f.key === state.fontPresetKey) || BUILTIN_THEME_FONTS[0];
            return { ...preset, type: 'builtin' };
        }

        function buildThemeFontFaceCss(cssName, sources = {}) {
            const safeCssName = sanitizeThemeFontCssName(cssName);
            const safeSources = cloneThemeFontSources(sources);
            const srcList = [];
            if (safeSources.woff2) srcList.push(`url("${safeSources.woff2}") format("woff2")`);
            if (safeSources.woff) srcList.push(`url("${safeSources.woff}") format("woff")`);
            if (safeSources.ttf) srcList.push(`url("${safeSources.ttf}") format("truetype")`);
            if (!safeCssName || srcList.length === 0) return '';
            return `
            @font-face {
                font-family: '${safeCssName}';
                src: ${srcList.join(',\n         ')};
                font-weight: normal;
                font-style: normal;
                font-display: swap;
            }`.trim();
        }

        function getThemeFontFaceStyleElement() {
            let styleEl = document.getElementById('theme-font-face-style');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'theme-font-face-style';
                document.head.appendChild(styleEl);
            }
            return styleEl;
        }

        function getThemeFontAppliedStyleElement() {
            let styleEl = document.getElementById('theme-font-applied-style');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'theme-font-applied-style';
                document.head.appendChild(styleEl);
            }
            return styleEl;
        }

        function applyThemeFont(state = themeState) {
            ensureThemeFontStateShape();
            const definition = getActiveThemeFontDefinition(state);
            const faceStyleEl = getThemeFontFaceStyleElement();
            faceStyleEl.textContent = buildThemeFontFaceCss(definition.cssName, definition.sources);
            
            const appliedStyleEl = getThemeFontAppliedStyleElement();
            const resolvedFamily = definition.family || 'system-ui';
            const resolvedSize = `${normalizeThemeFontSize(state.fontSize)}px`;

            appliedStyleEl.textContent = `
            :root {
                --theme-font-family: ${resolvedFamily};
                --theme-font-size: ${resolvedSize};
            }
            body, #app, input, textarea, button, select {
                font-family: var(--theme-font-family);
                font-size: var(--theme-font-size);
            }`.trim();
            
            document.documentElement.style.setProperty('--theme-font-family', resolvedFamily);
            document.documentElement.style.setProperty('--theme-font-size', resolvedSize);
            return definition;
        }

        function renderThemeFontPreview() {
            ensureThemeFontStateShape();
            const definition = getActiveThemeFontDefinition(themeState);
            const previewSize = `${normalizeThemeFontSize(themeState.fontSize)}px`;

            if (themeFontModalPreview) {
                themeFontModalPreview.textContent = THEME_FONT_PREVIEW_TEXT;
                themeFontModalPreview.style.fontFamily = definition.family || 'system-ui';
                themeFontModalPreview.style.fontSize = previewSize;
            }
            if (themeFontSizeValue) themeFontSizeValue.textContent = previewSize;
            if (themeFontSizeSlider) themeFontSizeSlider.value = String(normalizeThemeFontSize(themeState.fontSize));
            
            let labelText = definition.type === 'user' ? `我的预设 · ${definition.label}` : definition.label;
            if (themeFontCurrentLabel) themeFontCurrentLabel.textContent = `当前字体：${labelText}`;
        }
        
        function syncThemeFontInputsFromState() {
            ensureThemeFontStateShape();
            if (themeFontSizeSlider) themeFontSizeSlider.value = String(normalizeThemeFontSize(themeState.fontSize));
            if (themeFontSizeValue) themeFontSizeValue.textContent = `${normalizeThemeFontSize(themeState.fontSize)}px`;
            
            if (themeFontNameInput && themeFontUrlInput) {
                if (themeState.fontMode === 'saved') {
                    const preset = themeState.savedFontPresets.find(p => p.id === themeState.fontPresetKey);
                    if (preset) {
                        themeFontNameInput.value = preset.name || '';
                        themeFontUrlInput.value = preset.sources.woff2 || preset.sources.woff || preset.sources.ttf || '';
                        return;
                    }
                }
                themeFontNameInput.value = '';
                themeFontUrlInput.value = '';
            }
        }
        
        function commitThemeFontChanges(toastMessage = '') {
            renderThemeFontPresetLists();
            renderThemeFontPreview();
            applyThemeFont(themeState);
            saveGlobalData();
            if (toastMessage) showToast(toastMessage);
        }

        function createThemeFontPill({ label, family, isActive, onSelect, onDelete = null }) {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `theme-font-pill ${isActive ? 'active' : ''}`;
            pill.style.fontFamily = family || 'system-ui';
            pill.style.padding = '6px 16px';
            pill.style.borderRadius = '16px';
            pill.style.border = isActive ? '2px solid #007aff' : '1px solid #e5e5ea';
            pill.style.background = isActive ? '#e8f2ff' : '#fff';
            pill.style.color = isActive ? '#007aff' : '#000';
            pill.style.cursor = 'pointer';
            pill.style.display = 'flex';
            pill.style.alignItems = 'center';
            pill.style.gap = '6px';
            pill.style.fontSize = '14px';
        
            const pillLabel = document.createElement('span');
            pillLabel.textContent = label;
            pill.appendChild(pillLabel);
        
            pill.addEventListener('click', () => onSelect?.());
        
            if (typeof onDelete === 'function') {
                const deleteBtn = document.createElement('div');
                deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                deleteBtn.style.padding = '2px';
                deleteBtn.style.color = '#8e8e93';
                deleteBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    onDelete();
                });
                pill.appendChild(deleteBtn);
            }
            return pill;
        }
        
        function renderThemeFontPresetLists() {
            if (themeFontModalUserPresetList) {
                themeFontModalUserPresetList.innerHTML = '';
                
                // Add Built-in font (Default) to user preset list
                const builtin = BUILTIN_THEME_FONTS[0];
                const isBuiltinActive = themeState.fontMode === 'preset' && themeState.fontPresetKey === builtin.key;
                themeFontModalUserPresetList.appendChild(createThemeFontPill({
                    label: builtin.label,
                    family: builtin.family,
                    isActive: isBuiltinActive,
                    onSelect: () => {
                        themeState.fontMode = 'preset';
                        themeState.fontPresetKey = builtin.key;
                        themeState.fontCssName = builtin.cssName || '';
                        themeState.fontFamily = builtin.family || DEFAULT_SYSTEM_THEME_FONT_FAMILY;
                        themeState.fontSources = cloneThemeFontSources(builtin.sources);
                        syncThemeFontInputsFromState();
                        commitThemeFontChanges(`已切换到 ${builtin.label}`);
                    }
                    // No onDelete for builtin font
                }));
                
                // Add User Presets
                themeState.savedFontPresets.forEach((preset) => {
                    const isActive = themeState.fontMode === 'saved' && themeState.fontPresetKey === preset.id;
                    themeFontModalUserPresetList.appendChild(createThemeFontPill({
                        label: preset.label,
                        family: preset.family,
                        isActive,
                        onSelect: () => {
                            themeState.fontMode = 'saved';
                            themeState.fontPresetKey = preset.id;
                            themeState.fontCssName = preset.cssName;
                            themeState.fontFamily = preset.family;
                            themeState.fontSources = cloneThemeFontSources(preset.sources);
                            syncThemeFontInputsFromState();
                            commitThemeFontChanges(`已切换到 ${preset.label}`);
                        },
                        onDelete: () => {
                            themeState.savedFontPresets = themeState.savedFontPresets.filter(p => p.id !== preset.id);
                            if (themeState.fontMode === 'saved' && themeState.fontPresetKey === preset.id) {
                                const builtin = BUILTIN_THEME_FONTS[0];
                                themeState.fontMode = 'preset';
                                themeState.fontPresetKey = builtin.key;
                                themeState.fontCssName = builtin.cssName || '';
                                themeState.fontFamily = builtin.family || DEFAULT_SYSTEM_THEME_FONT_FAMILY;
                                themeState.fontSources = cloneThemeFontSources(builtin.sources);
                            }
                            syncThemeFontInputsFromState();
                            commitThemeFontChanges(`已删除预设 ${preset.label}`);
                        }
                    }));
                });
            }
        }
        
        function buildThemeFontDraftFromInputs() {
            const cssName = sanitizeThemeFontCssName(themeFontNameInput?.value || '');
            const rawUrl = String(themeFontUrlInput?.value || '').trim();
            let fontSources = { woff2: '', woff: '', ttf: '' };
            if (rawUrl) {
                const normalizedUrl = rawUrl.split('?')[0].split('#')[0].toLowerCase();
                if (normalizedUrl.endsWith('.woff2')) fontSources.woff2 = rawUrl;
                else if (normalizedUrl.endsWith('.woff')) fontSources.woff = rawUrl;
                else if (normalizedUrl.endsWith('.ttf')) fontSources.ttf = rawUrl;
                else fontSources.woff2 = rawUrl; // default fallback
            }
        
            if (!fontSources.woff2 && !fontSources.woff && !fontSources.ttf) {
                showToast('请至少填写一个字体完整链接');
                return null;
            }
            return {
                id: '', type: 'user', name: cssName, label: cssName, cssName,
                family: buildThemeFontFamily(cssName), sources: fontSources
            };
        }

        if (themeFontBtn) {
            themeFontBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (themeFontModal) {
                    syncThemeFontInputsFromState();
                    renderThemeFontPresetLists();
                    renderThemeFontPreview();
                    themeFontModal.style.display = 'flex';
                    // Trigger reflow
                    themeFontModal.offsetHeight;
                    themeFontModal.style.opacity = '1';
                }
            });
        }

        const closeThemeFontModal = () => {
            if (themeFontModal) {
                themeFontModal.style.opacity = '0';
                setTimeout(() => { themeFontModal.style.display = 'none'; }, 300);
            }
        };

        if (themeFontCloseBtn) themeFontCloseBtn.addEventListener('click', closeThemeFontModal);
        
        if (themeFontResetBtn) {
            themeFontResetBtn.addEventListener('click', () => {
                const builtin = BUILTIN_THEME_FONTS[0];
                themeState.fontMode = 'preset';
                themeState.fontPresetKey = builtin.key;
                themeState.fontFamily = builtin.family;
                themeState.fontCssName = builtin.cssName || '';
                themeState.fontSources = cloneThemeFontSources(builtin.sources);
                themeState.fontSize = 16;
                syncThemeFontInputsFromState();
                commitThemeFontChanges('字体已重置为默认字体');
            });
        }
        
        if (themeFontLinkFocusBtn) {
            themeFontLinkFocusBtn.addEventListener('click', () => {
                themeFontCustomSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                themeFontNameInput?.focus();
            });
        }
        
        if (themeFontApplyCustomBtn) {
            themeFontApplyCustomBtn.addEventListener('click', () => {
                const draftPreset = buildThemeFontDraftFromInputs();
                if (!draftPreset) return;
                themeState.fontMode = 'saved';
                themeState.fontPresetKey = '__draft__';
                themeState.fontCssName = draftPreset.cssName;
                themeState.fontFamily = draftPreset.family;
                themeState.fontSources = cloneThemeFontSources(draftPreset.sources);
                commitThemeFontChanges('链接字体已应用');
            });
        }
        
        if (themeFontSavePresetBtn) {
            themeFontSavePresetBtn.addEventListener('click', () => {
                ensureThemeFontStateShape();
                const draftPreset = buildThemeFontDraftFromInputs();
                if (!draftPreset) return;
        
                const existingIndex = themeState.savedFontPresets.findIndex((preset) => preset.name === draftPreset.name);
                const presetId = existingIndex >= 0 ? themeState.savedFontPresets[existingIndex].id : `font_preset_${Date.now()}`;
                const nextPreset = normalizeThemeFontPreset({ ...draftPreset, id: presetId });
        
                if (existingIndex >= 0) {
                    themeState.savedFontPresets[existingIndex] = nextPreset;
                } else {
                    themeState.savedFontPresets.push(nextPreset);
                }
                
                themeState.fontMode = 'saved';
                themeState.fontPresetKey = nextPreset.id;
                themeState.fontCssName = nextPreset.cssName;
                themeState.fontFamily = nextPreset.family;
                themeState.fontSources = cloneThemeFontSources(nextPreset.sources);
                
                syncThemeFontInputsFromState();
                commitThemeFontChanges(existingIndex >= 0 ? '字体预设已更新' : '字体预设已保存');
            });
        }
        
        if (themeFontSizeSlider) {
            themeFontSizeSlider.addEventListener('input', (event) => {
                themeState.fontSize = normalizeThemeFontSize(event.target.value);
                renderThemeFontPreview();
                applyThemeFont(themeState);
                saveGlobalData();
            });
            themeFontSizeSlider.addEventListener('change', (event) => {
                showToast(`字体大小已调整为 ${themeState.fontSize}px`);
            });
        }
        
        // ==========================================
        // API CONFIGURATION LOGIC
        // ==========================================
        function saveGlobalData() {
            if (window.StorageManager) {
                StorageManager.save('u2_apiConfig', apiConfig);
                StorageManager.save('u2_apiPresets', apiPresets);
                StorageManager.save('u2_fetchedModels', fetchedModels);
            }
        }

        function switchApiTab(tabName) {
            if (!UI.inputs.apiTabMain) return;
            
            // Save current input to temp
            if (currentApiTab === 'main') {
                tempApiConfig.main.endpoint = UI.inputs.apiEndpoint.value;
                tempApiConfig.main.apiKey = UI.inputs.apiKey.value;
                tempApiConfig.main.model = UI.inputs.apiModel.value;
                tempApiConfig.main.temperature = parseFloat(UI.inputs.apiTemp.value) || 0.7;
            } else {
                tempApiConfig.sub.endpoint = UI.inputs.apiEndpoint.value;
                tempApiConfig.sub.apiKey = UI.inputs.apiKey.value;
                tempApiConfig.sub.model = UI.inputs.apiModel.value;
                tempApiConfig.sub.temperature = parseFloat(UI.inputs.apiTemp.value) || 0.7;
            }

            currentApiTab = tabName;

            // Render UI
            if (tabName === 'main') {
                UI.inputs.apiTabMain.classList.add('active');
                UI.inputs.apiTabSub.classList.remove('active');
                
                UI.inputs.mainApiControls.style.display = 'block';
                UI.inputs.subApiControls.style.display = 'none';

                UI.inputs.apiEndpoint.value = tempApiConfig.main.endpoint || '';
                UI.inputs.apiKey.value = tempApiConfig.main.apiKey || '';
                syncSelectValue(UI.inputs.apiModel, tempApiConfig.main.model || '');
                UI.inputs.apiTemp.value = tempApiConfig.main.temperature ?? 0.7;
            } else {
                UI.inputs.apiTabMain.classList.remove('active');
                UI.inputs.apiTabSub.classList.add('active');

                UI.inputs.mainApiControls.style.display = 'none';
                UI.inputs.subApiControls.style.display = 'block';

                UI.inputs.apiEndpoint.value = tempApiConfig.sub.endpoint || '';
                UI.inputs.apiKey.value = tempApiConfig.sub.apiKey || '';
                syncSelectValue(UI.inputs.apiModel, tempApiConfig.sub.model || '');
                UI.inputs.apiTemp.value = tempApiConfig.sub.temperature ?? 0.7;
            }
        }

        if (UI.inputs.apiTabMain) {
            UI.inputs.apiTabMain.addEventListener('click', () => switchApiTab('main'));
        }
        if (UI.inputs.apiTabSub) {
            UI.inputs.apiTabSub.addEventListener('click', () => switchApiTab('sub'));
        }

        function renderNativeModelSelect() {
            if (!UI.inputs.apiModel) return;
            UI.inputs.apiModel.innerHTML = '<option value="" disabled selected>选择模型</option>';
            if (Array.isArray(fetchedModels)) {
                fetchedModels.forEach(model => {
                    const opt = document.createElement('option');
                    opt.value = model;
                    opt.textContent = model;
                    UI.inputs.apiModel.appendChild(opt);
                });
            }
        }

        function syncSelectValue(selectEl, value) {
            if (!selectEl) return;
            let exists = Array.from(selectEl.options).some(opt => opt.value === value);
            if (value && !exists) {
                const opt = document.createElement('option');
                opt.value = value;
                opt.textContent = value;
                selectEl.appendChild(opt);
            }
            selectEl.value = value;
        }

        const apiConfigBtn = document.getElementById('api-config-btn');
        if (apiConfigBtn && UI.overlays.apiConfig) {
            apiConfigBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                renderNativeModelSelect();

                tempApiConfig.main = {
                    endpoint: apiConfig.endpoint || '',
                    apiKey: apiConfig.apiKey || '',
                    model: apiConfig.model || '',
                    temperature: apiConfig.temperature ?? 0.7
                };
                tempApiConfig.sub = {
                    endpoint: apiConfig.subEndpoint || '',
                    apiKey: apiConfig.subApiKey || '',
                    model: apiConfig.subModel || '',
                    temperature: apiConfig.subTemperature ?? 0.7
                };
                
                if (UI.inputs.apiEnableSubToggle) {
                    UI.inputs.apiEnableSubToggle.checked = !!apiConfig.enableSubApi;
                }

                currentApiTab = 'main';
                switchApiTab('main');

                openView(UI.overlays.apiConfig);
            });
        }

        const confirmApiBtn = document.getElementById('confirm-api-btn');
        if (confirmApiBtn) {
            confirmApiBtn.addEventListener('click', () => {
                if (currentApiTab === 'main') {
                    tempApiConfig.main.endpoint = UI.inputs.apiEndpoint.value;
                    tempApiConfig.main.apiKey = UI.inputs.apiKey.value;
                    tempApiConfig.main.model = UI.inputs.apiModel.value;
                    tempApiConfig.main.temperature = parseFloat(UI.inputs.apiTemp.value) || 0.7;
                } else {
                    tempApiConfig.sub.endpoint = UI.inputs.apiEndpoint.value;
                    tempApiConfig.sub.apiKey = UI.inputs.apiKey.value;
                    tempApiConfig.sub.model = UI.inputs.apiModel.value;
                    tempApiConfig.sub.temperature = parseFloat(UI.inputs.apiTemp.value) || 0.7;
                }

                apiConfig.endpoint = tempApiConfig.main.endpoint;
                apiConfig.apiKey = tempApiConfig.main.apiKey;
                apiConfig.model = tempApiConfig.main.model;
                apiConfig.temperature = tempApiConfig.main.temperature;

                apiConfig.subEndpoint = tempApiConfig.sub.endpoint;
                apiConfig.subApiKey = tempApiConfig.sub.apiKey;
                apiConfig.subModel = tempApiConfig.sub.model;
                apiConfig.subTemperature = tempApiConfig.sub.temperature;
                
                if (UI.inputs.apiEnableSubToggle) {
                    apiConfig.enableSubApi = UI.inputs.apiEnableSubToggle.checked;
                }
                
                window.apiConfig = apiConfig;
                saveGlobalData();
                
                closeView(UI.overlays.apiConfig);
                showToast('API 设置已保存');
            });
        }

        const btnApiFetch = document.getElementById('fetch-models-btn');
        if (btnApiFetch) {
            btnApiFetch.addEventListener('click', async () => {
                const endpoint = UI.inputs.apiEndpoint.value.trim();
                const key = UI.inputs.apiKey.value.trim();
                
                if (!endpoint) {
                    showToast('请填写接口地址');
                    return;
                }

                const originalText = btnApiFetch.innerHTML;
                btnApiFetch.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching...';
                
                try {
                    let url = endpoint;
                    if (url.endsWith('/')) url = url.slice(0, -1);
                    if (!url.endsWith('/models')) {
                        url = url.endsWith('/v1') ? url + '/models' : url + '/v1/models';
                    }

                    const headers = { 'Content-Type': 'application/json' };
                    if (key) {
                        headers['Authorization'] = `Bearer ${key}`;
                    }

                    const res = await fetch(url, { method: 'GET', headers });
                    if (!res.ok) throw new Error('网络请求失败');
                    
                    const data = await res.json();
                    
                    if (data && data.data && Array.isArray(data.data)) {
                        fetchedModels = data.data.map(m => m.id);
                        saveGlobalData();
                        renderNativeModelSelect();
                        // 重新应用当前的选中状态
                        const currentModelVal = currentApiTab === 'main' ? tempApiConfig.main.model : tempApiConfig.sub.model;
                        syncSelectValue(UI.inputs.apiModel, currentModelVal);
                        showToast(`成功获取 ${fetchedModels.length} 个模型`);
                    } else {
                        throw new Error('格式无效');
                    }
                } catch (error) {
                    console.error('Fetch Models Error:', error);
                    showToast('获取模型失败');
                } finally {
                    btnApiFetch.innerHTML = originalText;
                }
            });
        }

        if (UI.inputs.apiModel) {
            UI.inputs.apiModel.addEventListener('change', (e) => {
                if (currentApiTab === 'main') {
                    tempApiConfig.main.model = e.target.value;
                } else {
                    tempApiConfig.sub.model = e.target.value;
                }
            });
        }

        // -- Presets --
        const savePresetBtn = document.getElementById('save-preset-btn');
        const loadPresetBtn = document.getElementById('load-preset-btn');
        const confirmSavePresetBtn = document.getElementById('confirm-save-preset-btn');

        if (savePresetBtn && UI.overlays.savePreset) {
            savePresetBtn.addEventListener('click', () => {
                if (UI.inputs.presetName) UI.inputs.presetName.value = '';
                openView(UI.overlays.savePreset);
            });
        }

        if (confirmSavePresetBtn) {
            confirmSavePresetBtn.addEventListener('click', () => {
                const endpoint = UI.inputs.apiEndpoint ? UI.inputs.apiEndpoint.value.trim() : '';
                const apiKey = UI.inputs.apiKey ? UI.inputs.apiKey.value.trim() : '';
                const model = UI.inputs.apiModel ? UI.inputs.apiModel.value.trim() : '';
                const temp = UI.inputs.apiTemp ? parseFloat(UI.inputs.apiTemp.value) || 0.7 : 0.7;
                const presetName = UI.inputs.presetName ? UI.inputs.presetName.value.trim() : '';

                apiPresets.push({
                    id: Date.now(),
                    name: presetName || '未命名预设',
                    endpoint,
                    apiKey,
                    model,
                    temp
                });

                saveGlobalData();
                closeView(UI.overlays.savePreset);
                showToast('预设已保存');
            });
        }

        if (loadPresetBtn && UI.overlays.loadPreset) {
            loadPresetBtn.addEventListener('click', () => {
                openView(UI.overlays.loadPreset);
                setTimeout(() => {
                    renderPresetList();
                }, 150);
            });
        }

        function renderPresetList() {
            if (!UI.lists.presets) return;
            UI.lists.presets.innerHTML = '';

            if (!Array.isArray(apiPresets) || apiPresets.length === 0) {
                UI.lists.presets.innerHTML = `
                    <div style="padding: 40px 20px; text-align: center; color: #8e8e93; font-size: 15px;">
                        暂无预设
                    </div>
                `;
                return;
            }

            const fragment = document.createDocumentFragment();

            apiPresets.forEach(preset => {
                const item = document.createElement('div');
                item.className = 'account-card';
                item.innerHTML = `
                    <div class="account-content" style="cursor: pointer;">
                        <div class="account-avatar" style="background-color: var(--blue-color); color: white;"><i class="fas fa-server"></i></div>
                        <div class="account-info">
                            <div class="account-name">${preset.name || '未命名预设'}</div>
                            <div class="account-detail" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">${preset.endpoint || '未填写接口地址'}</div>
                        </div>
                        <i class="fas fa-times delete-icon"></i>
                    </div>
                `;

                const content = item.querySelector('.account-content');
                const deleteIcon = item.querySelector('.delete-icon');

                if (content) {
                    content.addEventListener('click', (e) => {
                        if (e.target.classList.contains('delete-icon') || e.target.closest('.delete-icon')) return;

                        if (UI.inputs.apiEndpoint) UI.inputs.apiEndpoint.value = preset.endpoint || '';
                        if (UI.inputs.apiKey) UI.inputs.apiKey.value = preset.apiKey || '';
                        if (UI.inputs.apiModel) {
                            syncSelectValue(UI.inputs.apiModel, preset.model || '');
                            if (currentApiTab === 'main') {
                                tempApiConfig.main.model = preset.model || '';
                            } else {
                                tempApiConfig.sub.model = preset.model || '';
                            }
                        }
                        if (UI.inputs.apiTemp) UI.inputs.apiTemp.value = preset.temp ?? 0.7;

                        closeView(UI.overlays.loadPreset);
                        showToast('预设已加载');
                    });
                }

                if (deleteIcon) {
                    deleteIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (confirm(`删除预设“${preset.name || '未命名预设'}”？`)) {
                            apiPresets = apiPresets.filter(p => p.id !== preset.id);
                            saveGlobalData();
                            renderPresetList();
                            showToast('预设已删除');
                        }
                    });
                }

                fragment.appendChild(item);
            });

            UI.lists.presets.appendChild(fragment);
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
    });

})();
