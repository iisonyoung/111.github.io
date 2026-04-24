# u2phone

这是一个全屏 PWA 应用，目标是创建一个类似 iOS 主屏幕的模拟器。
目前的静态 HTML 结构和 CSS 样式已经从 `iiso` 项目迁移完成，背景色已设置为纯白，并且具备了本地存储模块 `storage.js` 的基础支撑。

## 下一步开发规划 (JS 模块拆分与功能实现)

由于主屏幕交互复杂，涉及横向滑动翻页、Widget 数据编辑与存储、应用切换等。为了防止单个文件 (`script.js`) 过于臃肿，计划在后续开发中将 JS 代码模块化。

### 1. 核心 DOM 与事件管理 (`core.js` / `dom.js`)
- 负责处理全局滑动事件 (Swipe) 和页面容器 (`pages-container`) 的轮播逻辑。
- 处理页面指示器 (Dots) 的同步更新。
- 处理长按抖动进入编辑模式 (Jiggle Mode) 的动画与逻辑。
- 绑定基础的 App 图标点击事件。

### 2. 数据与状态存储 (`data.js` / `storage.js`)
- 目前 `storage.js` 已实现基础的存取方法。
- 后续需要在 `data.js` 中定义统一的数据结构，例如：
  - `homeScreenData`: 存储主屏幕应用和组件的位置信息。
  - `widgetData`: 存储各个小组件（如头像、名称、宠物、音乐）的用户自定义数据。
- 通过 `storage.js` 自动持久化这些状态到 `localStorage` 中。

### 3. Widget 与 App 视图渲染 (`widgets.js`)
- 处理主屏幕各个小组件的渲染与内容更新。
- 绑定编辑弹窗：点击小组件触发相应的编辑底页 (Bottom Sheet)，并把编辑结果实时反应到 UI 和 `localStorage` 数据中。
- 处理点击 Dock 栏图标时的交互与弹窗显示。

### 4. 样式管理与主题定制 (`theme.js` - 可选)
- 提供给用户更改背景壁纸、字体或图标颜色的接口。
- 修改并保存 CSS 变量以实现实时换肤功能。

### 当前完成状态
- [x] HTML 与 CSS 静态骨架搭建（从 iiso 迁移）
- [x] 引入 FontAwesome 图标
- [x] PWA 基础配置与 iOS 全屏适配 (`script.js` 头部)
- [x] 本地存储辅助模块 (`storage.js`)
- [x] 背景色修改为纯白 (`#ffffff`)
- [x] `script.js` 结构化注释分区
