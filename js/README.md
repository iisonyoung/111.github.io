# u2phone JS 核心功能逻辑索引

本文档专门用于记录 `u2phone` 项目中的前端 JavaScript 功能模块的分布及核心函数。如果后续需要修改特定功能，请先查阅本索引。

## 1. 全局配置与状态存储 (`u2phone/storage.js`)
此文件管理 localStorage 的包装与提取，用来进行 PWA 应用的数据持久化。

- `StorageManager.save(key, value)`：保存数据到本地存储
- `StorageManager.load(key, default)`：从本地存储读取数据

---

## 2. 界面与视图控制 (`u2phone/js/ui.js`)
主要处理各个 App 视口（View）、底部弹出模态框（Bottom Sheet）、长按晃动（Jiggle Mode）等全局 UI 交互。

- `UI.views` / `UI.overlays` / `UI.inputs`：对 DOM 元素的统一映射与管理
- `openView(element)`：打开/滑入一个新的视图层或抽屉
- `closeView(element)`：关闭/收起视图层或抽屉
- `syncUIs()`：在打开某些视图之前，将缓存或状态同步更新到对应的 UI 元素上
- `showToast(msg)`：屏幕下方弹出气泡提示
- *（内置拖拽与 Jiggle 逻辑）*：主界面的拖拽布局等交互机制

---

## 3. 设置模块逻辑 (`u2phone/js/settings.js`)
集成了 `u2phone` 大部分核心系统设置、API对接及**主题美化**功能。这部分逻辑被包裹在一个自执行函数 `(function() { ... })()` 内。

### 3.1 核心状态定义
- `apiConfig` / `apiPresets` / `fetchedModels`：保存 API 密钥、端点及模型预设等配置信息。
- `themeState`：保存当前应用的主题背景 `bgUrl`、各应用的自定义图标配置 `apps` 数组，以及自定义字体偏好设定 `fontMode`, `fontFamily` 等。
- `userState`：模拟个人信息/账号设定。

### 3.2 数据加载初始化
- `document.addEventListener('DOMContentLoaded', ...)`：在入口处调用 `StorageManager.load()` 读取 `u2_apiConfig`, `u2_themeState` 等数据，并调用 `applySavedTheme()` 自动还原之前的视觉设置。

### 3.3 主题美化：背景与应用图标
- **壁纸功能**：
  - `applyThemeBackground(state)`：通过向 `#app` 和 `body` 注入 `style.backgroundImage` 应用壁纸。
  - `commitThemeBackgroundChanges()`：保存并刷新壁纸。
- **App 自定义图标**：
  - `applyThemeAppIcons(state)` 和 `applyAppIconStyles(app)`：读取 `themeState.apps`，查找并用对应上传的图像替换 `.app-icon` 元素的内联背景图。如果没找到，则还原系统默认占位。
  - `commitThemeAppIconChanges()`：保存自定义应用图标更改。

### 3.4 主题美化：字体选择与全局替换
这部分将 `iiso` 中字体选择与自定义链接字体逻辑迁移过来，去除了原有的 `iOS台简` 选项，只保留默认字体与添加用户字体功能。
- `ensureThemeFontStateShape()`：保证字体相关数据结构完整兼容。
- `buildThemeFontFaceCss(cssName, sources)`：生成动态 `@font-face` CSS 字符串。
- `applyThemeFont(state)`：向页面 `<style id="theme-font-face-style">` 和 `<style id="theme-font-applied-style">` 注入样式，实现全局字体的动态替换（通过修改 `:root` 中的 `--theme-font-family`）。
- `renderThemeFontPreview()`：处理“Aa 你好” 等字体的样式预览逻辑与大小滑块联动。
- `buildThemeFontDraftFromInputs()`：从用户的自定义表单中提取 `.woff/.ttf` 链接构造自定义字体预设。
- `createThemeFontPill()`：渲染“我的预设”列表中供点击切换的胶囊按钮。

### 3.5 API 配置逻辑 (API Config)
控制用户修改大语言模型的参数、密钥与 API 测速。
- `switchApiTab(tabName)`：在“主 API” 和 “副 API” 面板之间切换及状态缓存。
- `renderNativeModelSelect()` / `syncSelectValue()`：将 `fetchedModels` 模型列表写入原生的 `<select>` 组件。
- `btnApiFetch` (获取模型列表)：连接服务器使用 `/v1/models` 获取可用模型。
- `renderPresetList()`：生成右侧抽屉里的 API 配置历史预设列表并支持切换。

---

## 4. 世界书功能模块 (`u2phone/js/builtin_worldbook.js` & `u2phone/js/worldbook.js`)
管理全局或特定场景下的设定、人设补充及背景信息（World Book），包含分组和词条管理，并将数据存入 localStorage。

### 4.1 内置世界书数据 (`builtin_worldbook.js`)
- `getBuiltInWorldBooks()`：返回项目默认包含的基础世界书及对应词条设定（例如“全局规则”、“预设人设”等）。

### 4.2 世界书主逻辑 (`worldbook.js`)
这部分管理世界书列表的数据增删改查、列表渲染以及相关的 UI 弹窗操作。

- **核心状态**：
  - `worldBooks`：存储所有世界书对象（包含 id, 名字, 分组 id, 词条数组及开启状态等）。
  - `wbGroups`：存储世界书的分组。
  - `currentWbTab`：当前在弹窗中浏览的标签页（全部、全局、局部）。

- **数据持久化与初始化**：
  - `loadWorldBooks()`：从 StorageManager 中读取 `worldBooks`，若不存在则导入内置的默认世界书。
  - `loadWbGroups()` / `saveWbGroups()` / `saveWorldBooks()`：分组及世界书信息的存储写入。

- **UI 渲染与交互**：
  - `renderWorldBooks()` / `renderWbList(container, filterType)`：负责渲染世界书面板内的所有书籍和折叠分组（以文件夹/胶囊形态展示）。
  - `renderWbGroups()`：渲染“添加新书”等操作时的分组选择列表。
  - `renderWbEntries(entries)`：渲染每本书内包含的详细词条列表（规则关键词、系统提示深度、内容）。

- **核心操作动作**：
  - `toggleWbGlobal(id)` / `toggleWbLocal(id)`：切换世界书的全局与局部作用状态。
  - `deleteWorldBook(id)` / `deleteWbGroup(id)`：删除指定的书本或分组，并带有安全确认。
- `exportWorldBook(book)` / `importWorldBook(file)`：将单本世界书导出为 JSON 文件，或从本地加载解析 JSON 导入。

---

## 5. iMessage 模块 (`u2phone/js/imessage/`)
管理 iMessage 应用的所有核心逻辑和界面交互。

### 5.1 联系人与添加好友 (`3_contacts.js`)
- `renderFriendsList()`: 渲染好友列表。
- 处理“添加朋友”弹窗逻辑（`resetAddFriendForm`, `setFriendAvatar`），现已移除对旧版 `UI.inputs` 的依赖，改为纯原生 DOM 操作以解决报错导致点击无效的问题。

### 5.2 聊天界面与上下文菜单 (`4_chat_main.js` 等)
- 长按消息显示气泡菜单，支持复制、删除、编辑、翻译等功能。

### 5.3 聊天与角色设置 (`5_settings.js`)
- 管理单聊背景、气泡样式、角色人设编辑等。
- 统一了“角色设定”、“记忆总览”等所有弹窗中多行文本域的全局输入框样式（`.tall-input` 与 `.tall-item`），去除了内联的宽高和边框设定，以保持 UI 风格整体一致。
