(function() {
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

    document.addEventListener('DOMContentLoaded', () => {
        if (isStandalone()) {
            console.log("App is running in Standalone (Fullscreen) mode.");
            // 在全屏模式下，你可以根据需要做一些特殊的 UI 调整
        } else {
            console.log("App is running in Browser mode.");
            // 可以提示用户将其添加到主屏幕
        }
    });

})();
