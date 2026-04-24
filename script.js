(function() {
    // ==========================================
    // 1. 系统与全屏配置 (PWA / iOS 适配)
    // ==========================================
    
    /* 防止 iOS Safari 橡皮筋弹动 (仅限制 body 的 touchmove 以免影响应用内部滚动) */
    document.addEventListener('touchmove', function(e) {
        // 如果事件目标是 body 或 html，或者是我们最外层的容器，则阻止默认行为
        if (e.target === document.body || e.target === document.documentElement || e.target.id === 'app') {
            e.preventDefault();
        }
    }, { passive: false });

    /* 禁止双击缩放（旧版 iOS 兼容） */
    let lastTap = 0;
    document.addEventListener('touchend', function(e) {
        const now = Date.now();
        if (now - lastTap < 300) { 
            e.preventDefault(); 
        }
        lastTap = now;
    }, { passive: false });

    /* iOS 15+ 地址栏高度补偿 */
    function setRealVh() {
        // visualViewport 提供更精确的视口尺寸
        const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
        document.documentElement.style.setProperty('--real-vh', `${vh}px`);
    }
    
    // 初始化和监听窗口大小变化
    setRealVh();
    window.visualViewport?.addEventListener('resize', setRealVh);
    window.addEventListener('resize', setRealVh);

    /* 判断当前是否已经在全屏模式运行（用户已添加到主屏幕并从中打开）*/
    function isStandalone() {
        return ('standalone' in window.navigator && window.navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;
    }

    // ==========================================
    // 2. 状态管理 (待实现)
    // ==========================================
    // TODO: 实现应用状态、页面数据、Widget数据的统一管理
    // 可考虑结合 window.StorageManager 使用


    // ==========================================
    // 3. UI 交互与事件绑定 (待实现)
    // ==========================================
    // TODO: 实现主屏幕滑动 (Swipe) 功能
    // TODO: 实现 App 图标点击进入应用的动画及页面切换
    // TODO: 实现 Widget 组件的点击编辑、数据渲染
    

    // ==========================================
    // 4. 初始化加载
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        if (isStandalone()) {
            console.log("App is running in Standalone (Fullscreen) mode.");
            // 在全屏模式下，你可以根据需要做一些特殊的 UI 调整
        } else {
            console.log("App is running in Browser mode.");
            // 可以提示用户将其添加到主屏幕
        }

        // 初始化主屏幕 UI 等后续操作可在此执行
    });

})();
