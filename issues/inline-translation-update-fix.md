# 内联翻译实时更新修复

## 问题描述
内联显示功能在文本更新后没有对应地更新，需要手动刷新或重新加载才能看到最新的翻译内容。

## 根本原因
`translationItems` 计算属性只依赖于以下响应式数据：
- `enableInlineTranslation.value`
- `isCurrentEditorSupported.value` 
- `activeEditor.value`

但是当用户编辑文档时，`activeEditor.value` 本身不会变化，只是其 `document` 的内容发生了变化。由于 Vue 的响应性系统无法自动检测到 `document.getText()` 的变化，所以 `translationItems` 不会重新计算。

## 解决方案
添加文档变化监听器和响应式触发器：

### 1. 文档版本计数器
```typescript
// 文档版本计数器，用于触发内联翻译重新计算
const documentVersion = ref(0)
```

### 2. 文档变化监听
```typescript
// 监听文档内容变化
useDisposable(vscode.workspace.onDidChangeTextDocument((e) => {
  if (activeEditor.value && e.document === activeEditor.value.document) {
    documentVersion.value += 1
  }
}))

// 监听编辑器切换，也需要触发更新
watch(activeEditor, () => {
  documentVersion.value += 1
})
```

### 3. 修改 translationItems 计算属性
```typescript
const translationItems = computed(() => {
  // 依赖文档版本以响应内容变化
  documentVersion.value; // 触发响应式依赖
  
  // ... 原有逻辑保持不变
})
```

## 测试方案

### 步骤1：准备测试环境
1. 确保 VSCode 扩展已安装并激活
2. 打开一个包含 i18n 翻译调用的文件（TypeScript/JavaScript/Vue）
3. 确保内联翻译功能已启用（配置项 `mplat-i18n.enableInlineTranslation`）

### 步骤2：测试场景

**场景1：添加新的翻译调用**
1. 在文件中添加一行新的翻译调用，如：`t('new.key')`
2. 观察是否立即显示内联翻译（如果该 key 存在翻译）

**场景2：修改现有翻译 key**
1. 将现有的 `t('existing.key')` 修改为 `t('another.key')`
2. 观察内联翻译是否立即更新为新 key 对应的翻译

**场景3：删除翻译调用**
1. 删除一行包含翻译调用的代码
2. 观察对应的内联翻译是否立即消失

**场景4：编辑器切换**
1. 在多个包含翻译调用的文件间切换
2. 确认切换后内联翻译正确显示

### 预期结果
- 所有文本变化应该立即反映在内联翻译显示上
- 不需要手动刷新或重新加载
- 性能表现良好，无明显延迟

## 修复文件
- `src/extension-reactive.ts` (第 64-72 行，第 299-301 行)

## 相关技术
- reactive-vscode 响应式框架
- VSCode workspace API
- Vue 3 响应式系统 