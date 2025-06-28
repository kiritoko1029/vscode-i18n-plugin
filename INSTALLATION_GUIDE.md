# MPlatform I18n Support - 安装指南

## 插件文件

项目已成功打包为 VSCode 扩展文件：

- **mplat-i18n-support-reactive-0.1.3.vsix** - 推荐版本（使用 reactive-vscode）
- **mplat-i18n-support-0.1.3.vsix** - 标准版本

## 安装方法

### 方法 1: 通过 VSCode 界面安装

1. 打开 VSCode
2. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (macOS) 打开命令面板
3. 输入 `Extensions: Install from VSIX...`
4. 选择 `mplat-i18n-support-reactive-0.1.3.vsix` 文件
5. 点击安装并重启 VSCode

### 方法 2: 通过命令行安装

```bash
code --install-extension mplat-i18n-support-reactive-0.1.3.vsix
```

### 方法 3: 拖拽安装

1. 打开 VSCode
2. 直接将 `.vsix` 文件拖拽到 VSCode 窗口中
3. 确认安装并重启

## 验证安装

安装成功后，你应该能看到：

1. **扩展列表中显示** "MPlatform I18n Support"
2. **控制台输出** "MPLAT I18n Plugin (Reactive) is now active!"
3. **设置中出现** "Mplat-i18n" 配置选项

## 配置设置

在 VSCode 设置中添加以下配置：

```json
{
  "mplat-i18n.autoDiscovery": true,
  "mplat-i18n.scanPatterns": [
    "src/locales/**/*.{ts,js}",
    "packages/*/src/locales/**/*.{ts,js}",
    "packages/*/src/i18n/**/*.{ts,js}",
    "src/i18n/**/*.{ts,js}"
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

## 功能测试

### 1. 创建测试文件

创建语言包文件：

**src/locales/zh-CN.ts**
```typescript
export default {
  common: {
    save: '保存',
    cancel: '取消'
  },
  user: {
    name: '用户名'
  }
}
```

**src/locales/en.ts**
```typescript
export default {
  common: {
    save: 'Save',
    cancel: 'Cancel'
  },
  user: {
    name: 'Username'
  }
}
```

### 2. 测试功能

创建测试文件：

**test.vue**
```vue
<template>
  <div>
    <button>{{ $t('common.save') }}</button>
    <button>{{ $t('common.cancel') }}</button>
    <span>{{ $t('user.name') }}</span>
  </div>
</template>
```

### 3. 验证功能

- **Hover**: 鼠标悬停在 `$t('common.save')` 上应显示翻译内容
- **补全**: 输入 `$t('` 应显示可用的翻译键
- **跳转**: Ctrl+Click 翻译键应跳转到定义位置
- **CodeLens**: 翻译行上方应显示翻译内容

## 故障排除

### 插件未激活

1. 检查控制台是否有错误信息
2. 确认文件类型为 TypeScript/JavaScript/Vue
3. 重启 VSCode

### 找不到翻译

1. 检查 `scanPatterns` 配置是否正确
2. 确认语言包文件格式正确
3. 手动执行 "Refresh I18n Cache" 命令

### 功能不工作

1. 检查对应功能是否在设置中启用
2. 确认翻译键格式正确 (`$t('key')` 或 `t('key')`)
3. 查看开发者控制台的错误信息

## 卸载插件

1. 打开扩展面板
2. 找到 "MPlatform I18n Support"
3. 点击卸载按钮
4. 重启 VSCode

## 技术支持

如果遇到问题，请检查：

1. VSCode 版本 >= 1.74.0
2. Node.js 版本兼容性
3. 翻译文件语法正确性
4. 配置路径正确性

## 版本信息

- **插件版本**: 0.1.3
- **支持的 VSCode 版本**: ^1.74.0
- **支持的文件类型**: TypeScript, JavaScript, Vue
- **依赖**: reactive-vscode ^0.3.0 