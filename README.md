# MPlatform I18n Support

VSCode扩展，为MPlatform I18n库提供智能代码支持。

## 功能特性

### 🔍 智能悬停提示
- 悬停在`t()`、`$t()`或`.t()`函数上显示翻译内容
- 显示插值参数信息
- 显示语言包文件路径

### 🎯 跳转到定义
- 点击跳转到语言包定义位置
- 支持Vue模板和JavaScript/TypeScript代码
- 精确定位到语言包文件中的具体行

### ✨ 内联翻译显示
- **NEW!** 直接在代码中显示翻译内容
- `$t('mRole.roleType')` → `$t('mRole.roleType') → 角色类型`
- 高亮显示翻译文本，美观易读
- 点击翻译文本可切换显示原key

### 🎨 智能补全
- 自动补全翻译key
- 支持嵌套key提示
- 上下文相关的智能建议

### 🌐 多语言支持
- 自动检测项目语言设置
- 支持中文、英文等多种语言
- 灵活的语言包目录扫描

## 支持的文件类型

- TypeScript (.ts)
- JavaScript (.js)
- Vue (.vue)

## 支持的函数格式

- `$t('key')` - Vue模板中的全局函数
- `t('key')` - 组合式API中的函数
- `.t('key')` - 实例方法调用
- 支持所有插值格式：对象、数组、剩余参数

## 配置选项

```json
{
  "mplat-i18n.autoDiscovery": true,
  "mplat-i18n.defaultLocale": "zhCN",
  "mplat-i18n.fallbackLocale": "en",
  "mplat-i18n.enableHover": true,
  "mplat-i18n.enableDefinition": true,
  "mplat-i18n.enableCompletion": true,
  "mplat-i18n.enableInlineTranslation": true
}
```

## 使用指南

1. **安装插件**：直接安装生成的`.vsix`文件
2. **自动扫描**：插件会自动扫描项目中的语言包文件
3. **享受功能**：在代码中使用`t()`函数时即可体验所有功能

## 更新日志

### v0.1.1
- ✅ 修复语言包识别问题，正确读取项目配置语言
- ✅ 优化内联显示布局，消除右侧空白
- ✅ 改进显示效果，使用高亮颜色替代灰色文本
- ✅ 增强语言包扫描，支持嵌套目录结构

### v0.1.0
- 🎉 初始版本发布
- 🔍 悬停提示功能
- 🎯 跳转到定义功能
- ✨ 内联翻译显示功能
- 🎨 智能补全功能

## 安装

1. 将插件文件放在 VSCode 扩展目录
2. 重启 VSCode
3. 插件会自动激活

## 配置

在 VSCode 设置中搜索 `mplat-i18n` 可以配置：

```json
{
  "mplat-i18n.localesPath": "packages/shared/src/i18n/locales/lang",
  "mplat-i18n.defaultLocale": "zhCN",
  "mplat-i18n.fallbackLocale": "en",
  "mplat-i18n.enableHover": true,
  "mplat-i18n.enableDefinition": true,
  "mplat-i18n.enableCompletion": true
}
```

### 配置项说明

- `localesPath`: 语言包文件夹相对于工作区根目录的路径
- `defaultLocale`: 默认显示的语言
- `fallbackLocale`: 备用语言（当默认语言没有找到翻译时使用）
- `enableHover`: 启用悬停提示
- `enableDefinition`: 启用跳转到定义
- `enableCompletion`: 启用自动补全

## 使用示例

### Hover 提示
```typescript
// 悬停在 t() 函数上查看翻译
const message = i18n.t('mplat.logout')
// 显示: 退出登录

// 插值示例
const welcome = i18n.t('welcome', { name: 'John' })
// 显示插值预览和参数信息
```

### 自动补全
```typescript
// 在字符串中输入时触发补全
i18n.t('mpl...') // 自动提示 mplat.logout 等
```

### 跳转定义
```typescript
// Ctrl+Click 或 F12 跳转到语言包定义
i18n.t('mplat.logout') // 跳转到 zhCN.ts 或 en.ts 文件
```

## 开发

### 构建
```bash
npm install
npm run compile
```

### 监听模式
```bash
npm run watch
```

## 版本历史

### 0.1.0
- 初始版本
- Hover 提示功能
- Go to Definition 功能
- 智能补全功能
- 多种插值支持

## 许可证

MIT
