# I18n Inline Translation

🌍 **智能国际化翻译内联显示插件** - 让翻译键值在代码中实时显示对应的翻译内容

[![VSCode Extension](https://img.shields.io/badge/VSCode-Extension-blue.svg)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Languages**: [English](README_EN.md) | [中文](README.md)

## ✨ 核心特性

### 🎯 **内联翻译显示**
- **实时预览**：直接在代码中显示翻译内容，无需切换文件
- **智能编辑**：点击翻译内容时自动切换到编辑模式显示原键值
- **无缝体验**：光标离开时自动恢复翻译显示
- **多语言支持**：自动识别项目语言配置

```typescript
// 编辑状态：显示原键值
t('user.profile.name')

// 预览状态：显示翻译内容  
t('user.profile.name') → 用户姓名
```

### 🔍 **智能代码助手**
- **悬停提示**：鼠标悬停显示完整翻译信息和参数详情
- **跳转定义**：一键跳转到语言包文件的具体位置
- **智能补全**：输入时提供翻译键值的智能建议
- **参数提示**：支持插值参数的智能补全和预览

### 🚀 **高级功能**
- **多框架支持**：Vue、React、Angular、原生 JavaScript
- **灵活配置**：支持自定义语言包路径和扫描规则
- **性能优化**：基于 reactive-vscode 的响应式架构
- **实时更新**：语言包文件变更时自动刷新

## 📦 安装

### 方式一：手动安装 (推荐)
1. 下载最新的 `.vsix` 文件
2. 打开 VSCode，按 `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`)
3. 输入 `Extensions: Install from VSIX...`
4. 选择下载的 `.vsix` 文件
5. 重启 VSCode

### 方式二：命令行安装
```bash
code --install-extension i18n-inline-translation-0.1.3.vsix
```

## ⚙️ 配置

### 基础配置
在 VSCode 设置中搜索 `mplat-i18n` 或编辑 `settings.json`：

```json
{
  "mplat-i18n.autoDiscovery": true,
  "mplat-i18n.defaultLocale": "zh-CN",
  "mplat-i18n.fallbackLocale": "en",
  "mplat-i18n.enableInlineTranslation": true,
  "mplat-i18n.enableHover": true,
  "mplat-i18n.enableDefinition": true,
  "mplat-i18n.enableCompletion": true
}
```

### 高级配置
```json
{
  "mplat-i18n.scanPatterns": [
    "src/locales/**/*.{ts,js,json}",
    "src/i18n/**/*.{ts,js,json}",
    "locales/**/*.{ts,js,json}",
    "lang/**/*.{ts,js,json}"
  ],
  "mplat-i18n.manualPaths": [
    "src/assets/i18n",
    "public/locales"
  ]
}
```

### 配置项详解

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `autoDiscovery` | boolean | `true` | 自动发现项目中的语言包文件 |
| `scanPatterns` | string[] | `["src/locales/**/*.{ts,js}"]` | 语言包文件扫描规则 |
| `manualPaths` | string[] | `[]` | 手动指定的语言包目录路径 |
| `defaultLocale` | string | `"zhCN"` | 默认显示语言 |
| `fallbackLocale` | string | `"en"` | 备用语言 |
| `enableInlineTranslation` | boolean | `false` | 启用内联翻译显示 |
| `enableHover` | boolean | `true` | 启用悬停提示 |
| `enableDefinition` | boolean | `true` | 启用跳转定义 |
| `enableCompletion` | boolean | `true` | 启用智能补全 |

## 🎮 使用方法

### 支持的文件类型
- TypeScript (`.ts`)
- JavaScript (`.js`)  
- Vue (`.vue`)
- JSX/TSX (`.jsx`, `.tsx`)

### 支持的函数格式

#### Vue 项目
```vue
<template>
  <!-- Vue 模板语法 -->
  <div>{{ $t('welcome.message') }}</div>
  <button>{{ $t('button.submit') }}</button>
</template>

<script setup>
// Composition API
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const message = t('user.profile.title')
const greeting = t('welcome.greeting', { name: 'John' })
</script>
```

#### React 项目
```typescript
import { useTranslation } from 'react-i18next'

function Component() {
  const { t } = useTranslation()
  
  return (
    <div>
      <h1>{t('page.title')}</h1>
      <p>{t('user.description', { count: 5 })}</p>
    </div>
  )
}
```

#### 原生 JavaScript
```javascript
// 各种调用方式
i18n.t('menu.home')
this.t('error.network')
translate('success.saved')
$t('loading.please_wait')
```

### 语言包文件格式

#### TypeScript/JavaScript 格式
```typescript
// src/locales/zh-CN.ts
export default {
  welcome: {
    message: '欢迎使用我们的应用',
    greeting: '你好，{name}！'
  },
  user: {
    profile: {
      title: '用户资料',
      name: '姓名',
      email: '邮箱地址'
    }
  },
  button: {
    submit: '提交',
    cancel: '取消',
    save: '保存'
  }
}
```

#### JSON 格式
```json
{
  "welcome": {
    "message": "Welcome to our application",
    "greeting": "Hello, {name}!"
  },
  "user": {
    "profile": {
      "title": "User Profile",
      "name": "Name",
      "email": "Email Address"
    }
  }
}
```

## 🔧 功能演示

### 1. 内联翻译显示
当光标不在翻译键值上时，显示翻译内容：
```typescript
const title = t('user.profile.title') → 用户资料
```

当点击或编辑翻译键值时，自动切换到编辑模式：
```typescript
const title = t('user.profile.title')  // 显示原键值供编辑
```

### 2. 智能补全
输入 `t('user.` 时会显示：
- `user.profile.title` → 用户资料
- `user.profile.name` → 姓名  
- `user.profile.email` → 邮箱地址

### 3. 悬停提示
悬停在 `t('welcome.greeting', { name: 'John' })` 上显示：

```
🌍 Translation
📝 你好，John！

📋 Details  
🔑 Key: welcome.greeting
🌍 Locale: zh-CN
🔧 Parameters: name

💡 Usage Example
t('welcome.greeting', { name: 'value' })
```

### 4. 跳转定义
`Ctrl+Click` (macOS: `Cmd+Click`) 或按 `F12` 跳转到语言包文件的对应位置。

## 🏗️ 项目结构支持

插件支持多种常见的项目结构：

```
项目根目录/
├── src/
│   ├── locales/           # 推荐结构
│   │   ├── zh-CN.ts
│   │   ├── en.ts
│   │   └── index.ts
│   ├── i18n/              # 备选结构
│   │   └── lang/
│   └── assets/
│       └── i18n/          # 静态资源结构
├── locales/               # 根目录结构
├── lang/                  # 简化结构
└── public/
    └── locales/           # 公共资源结构
```

## 🎨 自定义配置示例

### Vue 项目配置
```json
{
  "mplat-i18n.scanPatterns": [
    "src/locales/**/*.{ts,js}",
    "src/i18n/lang/**/*.{ts,js}"
  ],
  "mplat-i18n.defaultLocale": "zh-CN",
  "mplat-i18n.enableInlineTranslation": true
}
```

### React 项目配置  
```json
{
  "mplat-i18n.scanPatterns": [
    "src/locales/**/*.{ts,js,json}",
    "public/locales/**/*.json"
  ],
  "mplat-i18n.defaultLocale": "en",
  "mplat-i18n.fallbackLocale": "en"
}
```

### 多包项目配置
```json
{
  "mplat-i18n.scanPatterns": [
    "packages/*/src/locales/**/*.{ts,js}",
    "packages/*/src/i18n/**/*.{ts,js}",
    "apps/*/src/locales/**/*.{ts,js}"
  ]
}
```

## 🔍 故障排除

### 常见问题

**Q: 为什么看不到翻译内容？**
A: 请检查：
1. 是否启用了内联翻译：`"mplat-i18n.enableInlineTranslation": true`
2. 语言包路径是否正确配置
3. 语言包文件格式是否支持

**Q: 智能补全不工作？**
A: 请确认：
1. 文件类型是否受支持 (`.ts`, `.js`, `.vue`)
2. 是否在正确的函数调用位置 (`t('`, `$t('`)
3. 语言包是否被正确扫描

**Q: 跳转定义失败？**
A: 请检查：
1. 语言包文件是否存在
2. 键值是否在语言包中定义
3. 文件路径是否可访问

### 调试模式
打开 VSCode 开发者工具 (`Help > Toggle Developer Tools`) 查看控制台输出：
```
MPLAT I18n Plugin (Reactive) is now active!
I18n service created successfully
```

## 🚀 性能优化

- **响应式架构**：基于 reactive-vscode，只在需要时重新计算
- **智能缓存**：语言包内容缓存，减少文件读取
- **增量更新**：文件变更时仅更新相关部分
- **限制结果**：智能补全限制为 50 项，提升性能

## 🛠️ 开发

### 本地开发
```bash
# 克隆项目
git clone <repository-url>
cd i18n-inline-translation

# 安装依赖
npm install

# 编译
npm run compile

# 监听模式
npm run watch

# 打包
npx vsce package
```

### 技术栈
- **TypeScript** - 类型安全的开发体验
- **reactive-vscode** - 响应式 VSCode 扩展框架
- **Babel** - 代码解析和 AST 处理

## 📝 更新日志

### v0.1.3
- 🎯 **重大更新**：实现基于光标位置的智能内联编辑
- ✨ **新功能**：参照 PNPM Catalog Lens 的交互逻辑
- 🔧 **优化**：移除点击切换，改为自动检测编辑状态
- 🚀 **性能**：简化状态管理，提升响应速度
- 🐛 **修复**：解决插件重启无响应问题

### v0.1.2  
- 🎨 **增强补全**：支持模糊搜索和层级匹配
- 📝 **丰富文档**：添加使用示例和参数提示
- 🔧 **扩展支持**：支持更多翻译函数格式
- ⚡ **性能优化**：限制补全结果数量

### v0.1.1
- ✅ 修复语言包识别问题
- ✅ 优化内联显示布局
- ✅ 改进显示效果和颜色
- ✅ 增强语言包扫描

### v0.1.0
- 🎉 初始版本发布
- 🔍 悬停提示功能
- 🎯 跳转到定义功能  
- ✨ 内联翻译显示功能
- 🎨 智能补全功能

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 🙏 致谢

- [reactive-vscode](https://github.com/KermanX/reactive-vscode) - 响应式 VSCode 扩展框架
- [PNPM Catalog Lens](https://github.com/antfu/vscode-pnpm-catalog-lens) - 内联编辑交互设计灵感

---

**享受智能的国际化开发体验！** 🌍✨
