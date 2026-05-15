# WallHaven Go - Electron Edition

基于 Electron + React 18 + TypeScript 重构的 WallHaven 壁纸下载器，采用液态玻璃视觉效果，支持多平台运行。

## 技术栈

- **框架**: Electron 28 + React 18 + TypeScript 5
- **3D 渲染**: Three.js + @react-three/fiber + postprocessing
- **动画**: Framer Motion
- **状态管理**: Zustand
- **构建工具**: Vite 5
- **UI 风格**: Fluent Design + 液态玻璃效果

## 功能特性

### 核心功能（继承自原项目）
- 支持多种下载方式：最新壁纸、分类下载、搜索下载
- 多类别支持：General、Anime、People
- 多纯度支持：SFW、Sketchy、NSFW
- 壁纸比例筛选：横向、纵向、正方形、自定义
- 并发下载控制
- 断点续传支持
- 实时预览已下载图片
- 分页浏览已下载图片

### 新增特性
- 液态玻璃背景效果（Three.js + postprocessing）
- 流畅的页面过渡动画（Framer Motion）
- 响应式布局设计
- 深色/浅色主题切换
- 中英文双语支持
- 跨平台支持（Windows、macOS、Linux）

## 项目结构

```
wallhaven-electron/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── main.ts        # 主进程入口
│   │   ├── preload.ts     # 预加载脚本
│   │   ├── settings-manager.ts  # 设置管理
│   │   └── download-manager.ts  # 下载管理
│   ├── renderer/          # React 渲染进程
│   │   ├── components/    # 组件
│   │   │   ├── Layout/    # 布局组件
│   │   │   ├── LiquidGlass/  # 液态玻璃效果
│   │   │   └── UI/        # UI 组件
│   │   ├── pages/         # 页面
│   │   │   ├── Download/  # 下载设置页
│   │   │   ├── Preview/   # 预览页
│   │   │   └── Settings/  # 设置页
│   │   ├── stores/        # 状态管理
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── locales/       # 国际化
│   │   └── styles/        # 全局样式
│   └── shared/            # 共享类型
├── assets/                # 静态资源
├── dist/                  # 构建输出
└── package.json
```

## 开发环境

### 系统要求
- Node.js 18+
- npm 9+ 或 yarn 1.22+

### 安装依赖
```bash
cd wallhaven-electron
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建应用
```bash
# 构建主进程和渲染进程
npm run build

# 打包应用（需要配置 electron-builder）
npm run dist
```

## 多平台支持

### Windows
- 支持 Windows 10/11
- 支持 x64 和 ia32 架构
- 使用 NSIS 安装程序

### macOS
- 支持 macOS 10.14+
- 支持 Intel 和 Apple Silicon (M1/M2/M3)
- 使用 DMG 安装包

### Linux
- 支持 x64 架构
- 提供 AppImage 和 DEB 包

## 配置说明

### 下载设置
- **API Key**: Wallhaven API 密钥（可选，用于访问高级功能）
- **下载目录**: 壁纸保存路径
- **起始页数**: 从第几页开始下载
- **下载页数**: 总共下载多少页
- **并发下载数**: 同时下载的图片数量（1-50）
- **下载超时**: 单个下载请求的超时时间（秒）

### 界面设置
- **主题**: 浅色 / 深色 / 自动
- **语言**: 简体中文 / English
- **预览大小**: 小 / 中 / 大

## 液态玻璃效果

项目使用 Three.js 实现了独特的液态玻璃背景效果：
- 基于着色器的动态波浪动画
- 多层噪声生成的流动纹理
- Bloom 辉光效果
- 色差效果增强视觉层次
- 浮动粒子点缀

## 与原项目的对比

| 特性 | 原 Python/PyQt6 项目 | Electron 重构版 |
|------|---------------------|-----------------|
| 技术栈 | Python + PyQt6 | Electron + React + TS |
| UI 效果 | Fluent Design | Fluent Design + 液态玻璃 |
| 动画效果 | 有限 | Framer Motion 流畅动画 |
| 3D 效果 | 无 | Three.js 液态玻璃背景 |
| 跨平台 | Windows/macOS/Linux | Windows/macOS/Linux |
| 下载性能 | asyncio + aiohttp | Node.js + axios |
| 代码维护 | Python | TypeScript |

## 许可证

MIT License
