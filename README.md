# Pomo - 技术架构与开发文档

Pomo 是一款基于 **Tauri 2.0** 和 **Vue 3** 构建的高性能、本地优先的项目管理应用程序。本项目旨在提供一个轻量级、安全且功能丰富的桌面环境，用于管理本地代码项目、文档、Git 版本控制以及加密敏感数据。

---

## ✨ 系统功能特性

### 1. 项目与工作流管理
- **仪表盘**: 提供今日概览、快捷方式和最近项目/文档的快速访问入口。
- **项目管理**: 支持本地项目的导入、管理与快速切换。
- **快捷方式**: 自定义常用项目或外部工具的快捷入口。
- **系统集成**: 内置终端与文件资源管理器集成，一键打开项目所在位置。

### 2. 文档中心 (DocVault)
- **多格式支持**: 内置 Markdown 编辑器（支持实时预览）与 PDF 阅读器。
- **文件树导航**: 完整的目录树视图，支持文件的新建、重命名、移动与删除。
- **最近文档**: 自动记录并持久化最近访问的文档，支持跨项目跳转。

### 3. Git 版本控制
- **可视化操作**: 无需命令行即可查看仓库状态、提交历史与文件变更。
- **分支管理**: 支持本地分支的查看、切换与管理。
- **变更处理**: 提供直观的暂存 (Stage)、取消暂存 (Unstage) 与提交 (Commit) 界面。

### 4. 安全保险箱 (Vault)
- **高强度加密**: 使用 AES-256-GCM 算法对敏感文件进行本地加密存储。
- **隐私保护**: 文件名混淆与路径隐藏，确保数据落盘安全。
- **访问控制**: 基于 Argon2 的主密码验证机制。

### 5. 用户体验
- **卡通风格 UI**: 独具特色的现代化卡通界面设计，支持明暗主题切换。
- **紧凑模式**: 针对高密度信息展示场景优化的 UI 布局。
- **响应式设计**: 界面元素随窗口大小自适应调整。

---

## 📥 下载与安装

目前的发布版本托管在 GitHub Releases 页面。

1. 访问项目的 [Releases 页面](https://github.com/motoryang/pm-app/releases)。
2. 根据您的操作系统下载对应的安装包：
   - **Windows**: `.exe` 安装程序
   - **macOS**: `.dmg` 镜像文件
   - **Linux**: `.deb` 包
3. 运行安装程序完成安装。

---

## 🛠️ 从源码构建

如果您希望参与开发或自行构建最新版本，请遵循以下步骤。

### 1. 环境准备
确保您的开发环境已安装以下工具：
- **Node.js**: v16.0.0 或更高版本
- **Rust**: 1.70.0 或更高版本 (建议使用 `rustup` 安装)
- **包管理器**: npm, yarn 或 pnpm
- **构建工具**: Windows 需要安装 C++ 构建工具 (Visual Studio Build Tools)，macOS 需要 Xcode Command Line Tools。

### 2. 获取源码
```bash
git clone https://github.com/motoryang/pm-app.git
cd pm-app
```

### 3. 安装依赖
安装前端依赖：
```bash
npm install
```
*Rust 依赖会在首次构建时自动下载。*

### 4. 启动开发模式
该命令将同时启动 Vite 前端服务和 Tauri 后端窗口，支持热重载：
```bash
npm run tauri:dev
```

### 5. 构建生产版本
构建产物将输出至 `src-tauri/target/release/bundle/` 目录：
```bash
npm run tauri:build
```

---

## � 推荐 IDE 配置

为了获得最佳的开发体验，推荐使用 **VS Code** 并安装以下扩展：

1.  **Vue - Official (Volar)**: 提供 Vue 3 的语法高亮、智能提示与类型检查。
2.  **Rust-Analyzer**: 提供 Rust 语言的实时分析、自动补全与重构功能。
3.  **Tauri**: 提供 `tauri.conf.json` 的验证与命令补全。

*项目根目录下的 `.vscode/extensions.json` 已包含上述推荐配置，打开项目时 VS Code 会自动提示安装。*

---

## 🤝 贡献指南

我们非常欢迎社区贡献！如果您发现 Bug 或有新功能建议，请按以下流程操作：

1.  **Fork 项目**: 将仓库 Fork 到您的 GitHub 账户。
2.  **创建分支**: 基于 `main` 分支创建一个新的功能分支 (`git checkout -b feature/AmazingFeature`)。
3.  **提交更改**: 提交您的代码更改 (`git commit -m 'Add some AmazingFeature'`)。
4.  **推送到远程**: 将分支推送到您的 Fork 仓库 (`git push origin feature/AmazingFeature`)。
5.  **发起 PR**: 在原仓库发起 Pull Request，并详细描述您的更改内容。

### 提交规范
请尽量遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范编写提交信息，例如：
- `feat: 增加新的快捷键支持`
- `fix: 修复侧边栏折叠时的样式问题`
- `docs: 更新构建文档`

---

## � 技术栈概览 (Technical Stack)

### 前端 (Frontend)
- **框架**: [Vue 3](https://vuejs.org/) (Composition API)
- **构建工具**: [Vite](https://vitejs.dev/)
- **状态管理**: [Pinia](https://pinia.vuejs.org/)
- **编辑器/查看器**: CodeMirror 6, PDF.js, Marked
- **UI 组件**: 自研 "Cartoon" 风格组件库 (`src/components/ui`)

### 后端 (Backend)
- **核心框架**: [Tauri v2](https://tauri.app/)
- **语言**: Rust (Edition 2021)
- **数据库**: SQLite (`tauri-plugin-sql`)
- **Git 集成**: `git2` (libgit2 bindings)
- **加密安全**: AES-256-GCM, Argon2, Zeroize

---

## 🏗 系统架构 (Architecture)

Pomo 采用 Tauri 双层架构：

1.  **Webview 层 (渲染进程)**:
    - 负责 UI 渲染与交互。
    - 通过 `invoke` 调用后端能力。
    - 状态管理：Pinia (内存/LocalStorage) + SQLite (业务数据)。

2.  **Core 层 (主进程)**:
    - 负责文件系统、Git 操作、加密计算与数据库交互。
    - 管理应用生命周期与原生窗口。

---

## 📄 许可证
Private / Proprietary
