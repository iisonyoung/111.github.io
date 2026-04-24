# u2phone

这是一个用于模拟 iOS 全屏 PWA 应用的 Web 项目。
它的目标是在支持 PWA 的移动设备（或浏览器环境）中提供类似原生操作系统的桌面及 App 体验。

## 当前进度与功能
1. **基础环境配置**
   - 通过 `manifest.json` 和 `index.html` 中的 meta 标签配置了 PWA 的全屏、状态栏和主题色支持。
2. **滑动桌面 UI (CSS/HTML)**
   - 使用 CSS Grid 搭建了 iOS 风格的桌面图标网格 (4x6)。
   - 支持多页面的横向滑动。
   - 带有小组件样式（如：情侣头像、宠物气泡、自定义音乐卡片）。
   - 底部悬浮 Dock 栏支持。
3. **设置 App (Settings)**
   - 模拟 iOS 设置的列表页。
   - 支持账号管理（添加、删除、切换账号）。
   - 支持头像上传与资料编辑。
   - 底部抽屉 (Bottom Sheet) 交互支持。
   - 全局提示 (Toast) 支持。
4. **JS 架构**
   - `storage.js`: 基于 IndexedDB (Dexie 风格实现) 的统一存储管理模块，支持数据导出和清空。
   - `js/ui.js`: 全局 UI 工具（底部弹窗开闭、Toast 提示）。
   - `js/settings.js`: 独立出来的设置应用业务逻辑。
   - `script.js`: 主屏幕相关的交互控制。
5. **CSS 架构**
   - `style.css`: 桌面及整体基础样式。
   - `css/settings.css`: 设置 App 及通用组件（列表、表单、底部弹窗等）样式。

## 文件结构说明
```text
u2phone/
├── css/
│   └── settings.css     # 设置页与基础组件样式
├── js/
│   ├── ui.js            # UI 工具类 (Modal, Toast 等)
│   └── settings.js      # 设置 App 逻辑
├── index.html           # 主页面及各 App DOM
├── manifest.json        # PWA 配置
├── script.js            # 主页面桌面逻辑
├── storage.js           # 存储模块
└── style.css            # 核心样式
