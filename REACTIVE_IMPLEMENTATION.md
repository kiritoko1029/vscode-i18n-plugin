# MPlatform I18n Plugin - Reactive VSCode 实现

## 概述

本项目已成功使用 [reactive-vscode](https://kermanx.com/reactive-vscode) 重构，将传统的 VSCode 扩展开发模式转换为响应式的 Composition API 模式。

## 主要改进

### 1. 响应式配置管理

使用 `defineConfigs` 替代传统的配置监听：

```typescript
const { 
  autoDiscovery,
  scanPatterns, 
  manualPaths,
  defaultLocale,
  fallbackLocale,
  enableHover,
  enableDefinition,
  enableCompletion,
  enableInlineTranslation,
  enableCodeLens
} = defineConfigs('mplat-i18n', {
  autoDiscovery: Boolean,
  scanPatterns: Array,
  // ... 其他配置
})
```

### 2. 自动响应式状态管理

配置变化自动触发服务刷新：

```typescript
watch([autoDiscovery, scanPatterns, manualPaths, defaultLocale, fallbackLocale], () => {
  i18nService.value.refreshCache()
}, { immediate: true })
```

### 3. 简化的提供者注册

使用 `watchEffect` 实现条件性提供者注册：

```typescript
watchEffect(() => {
  if (enableHover.value) {
    const hoverProvider = vscode.languages.registerHoverProvider(documentSelector, {
      // 提供者实现
    })
    useDisposable(hoverProvider)
  }
})
```

### 4. 响应式装饰器

使用 `useActiveEditorDecorations` 实现内联翻译：

```typescript
const inlineTranslations = computed(() => {
  // 计算装饰器位置和内容
  return decorations
})

useActiveEditorDecorations(
  { opacity: '0' },
  () => enableInlineTranslation.value ? inlineTranslations.value : []
)
```

### 5. 统一的命令注册

使用 `useCommand` 简化命令注册：

```typescript
useCommand('mplat-i18n.refreshCache', () => {
  i18nService.value.refreshCache()
  vscode.window.showInformationMessage('I18n cache refreshed!')
})
```

## 功能特性

### ✅ 已实现功能

1. **Hover 提示** - 鼠标悬停显示翻译内容
2. **跳转到定义** - 快速定位翻译键定义位置
3. **自动补全** - t() 函数参数智能补全
4. **CodeLens 显示** - 行内显示翻译内容
5. **内联翻译** - 实时替换显示翻译文本
6. **响应式配置** - 配置变化自动生效
7. **多语言支持** - 支持 TypeScript、JavaScript、Vue

### 🔧 技术特性

- **响应式架构** - 基于 Vue 3 响应式系统
- **自动资源管理** - 使用 `useDisposable` 自动清理
- **类型安全** - 完整的 TypeScript 支持
- **性能优化** - 智能缓存和增量更新

## 文件结构

```
src/
├── extension.ts              # 原始扩展入口（保留）
├── extension-reactive.ts     # 新的响应式扩展入口
├── services/
│   └── i18nService.ts       # i18n 服务（已增强）
├── providers/               # 原始提供者（保留作参考）
│   ├── hoverProvider.ts
│   ├── definitionProvider.ts
│   ├── completionProvider.ts
│   ├── codeLensProvider.ts
│   └── decorationProvider.ts
└── test-example/            # 测试示例
    ├── locales/
    │   ├── zh-CN.ts
    │   └── en.ts
    └── demo.vue
```

## 使用方法

### 开发模式

1. 安装依赖：
   ```bash
   npm install
   ```

2. 编译扩展：
   ```bash
   npm run compile
   ```

3. 在 VSCode 中按 F5 启动调试

### 配置选项

在 VSCode 设置中配置：

```json
{
  "mplat-i18n.autoDiscovery": true,
  "mplat-i18n.scanPatterns": [
    "test-example/locales/**/*.{ts,js}",
    "src/locales/**/*.{ts,js}"
  ],
  "mplat-i18n.defaultLocale": "zhCN",
  "mplat-i18n.fallbackLocale": "en",
  "mplat-i18n.enableHover": true,
  "mplat-i18n.enableDefinition": true,
  "mplat-i18n.enableCompletion": true,
  "mplat-i18n.enableInlineTranslation": false,
  "mplat-i18n.enableCodeLens": true
}
```

## 技术依赖

- **reactive-vscode**: ^0.3.0 - 响应式 VSCode 扩展框架
- **@reactive-vscode/reactivity** - Vue 3 响应式系统
- **TypeScript**: ^5.0.0 - 支持 `const` 类型参数

## 对比原始实现

| 特性 | 原始实现 | Reactive 实现 |
|------|----------|---------------|
| 配置管理 | 手动监听 | 自动响应式 |
| 状态管理 | 分散管理 | 统一响应式 |
| 资源清理 | 手动管理 | 自动清理 |
| 代码量 | ~400 行 | ~300 行 |
| 可维护性 | 中等 | 高 |
| 类型安全 | 基础 | 完整 |

## 下一步计划

1. **性能优化** - 实现更智能的缓存策略
2. **功能扩展** - 添加批量翻译更新功能
3. **测试覆盖** - 添加单元测试和集成测试
4. **文档完善** - 添加更多使用示例和最佳实践

## 参考资源

- [Reactive VSCode 官方文档](https://kermanx.com/reactive-vscode)
- [Vue 3 响应式 API](https://vuejs.org/api/reactivity-core.html)
- [VSCode 扩展开发指南](https://code.visualstudio.com/api) 