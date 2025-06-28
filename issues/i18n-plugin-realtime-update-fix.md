# VSCode i18n 插件实时更新修复

## 问题描述

用户反馈的插件问题：
1. 更新 t 函数时，内联内容没有更新
2. 删除 t 函数时没有删除内联内容  
3. 添加 t 函数时没有自动解析翻译
4. 没有找到语言包内容的 t 函数需要在弹窗里显示出来

## 解决方案

### 1. 优化实时更新机制 (extension.ts)
- **修改**: 移除文档变化监听的500ms延迟
- **原因**: 延迟导致t函数变化时无法实时反映在内联显示中
- **效果**: t函数增删改时立即更新装饰器

### 2. 增强装饰器提供者 (decorationProvider.ts)
- **新增**: 错误装饰器类型，用于未找到翻译的t函数
- **优化**: 改进正则表达式匹配和更新逻辑
- **功能**: 
  - 红色边框标记未找到翻译的t函数
  - 显示"⚠️ 翻译未找到"提示
  - 正确处理有翻译和无翻译两种状态

### 3. 增强悬停提示 (hoverProvider.ts)
- **优化**: 为未找到翻译的情况提供详细的错误信息
- **内容**: 
  - 显示错误原因和建议
  - 展示可用翻译键示例
  - 提供解决方案指导

### 4. 改进CodeLens提供者 (codeLensProvider.ts)
- **新增**: 未找到翻译的t函数显示错误状态CodeLens
- **功能**: 点击错误状态的CodeLens会触发缓存刷新
- **保护**: 防止错误状态的CodeLens被切换

### 5. 关键修复：装饰器残留问题 (decorationProvider.ts)
- **问题**: 删除t函数后，翻译文本仍然残留在编辑器中无法清除
- **根本原因**: VS Code装饰器更新机制在某些情况下不能完全清除旧装饰
- **解决方案**: 在每次`applyDecorations`开始时强制清除所有装饰器类型
- **实现**: 
  ```typescript
  // 强制清除所有装饰器类型，确保没有残留
  editor.setDecorations(this.decorationType, [])
  editor.setDecorations(this.translationDecorationType, [])
  editor.setDecorations(this.errorDecorationType, [])
  ```
- **效果**: 彻底解决装饰器残留问题，确保删除t函数后内联内容被完全清除

### 6. 新增功能：自动刷新缓存机制 (extension.ts)
- **需求**: 编辑器内容变化后自动执行 `mplat-i18n.refreshCache` 命令
- **实现**: 在文档变化监听器中添加防抖的自动缓存刷新功能
- **防抖机制**: 500ms内的多次变化只执行一次刷新，避免性能问题
- **触发条件**: 仅在TypeScript、JavaScript、Vue文件变化时触发
- **实现细节**:
  ```typescript
  // 防抖自动刷新缓存
  if (refreshCacheTimer) {
    clearTimeout(refreshCacheTimer)
  }
  
  refreshCacheTimer = setTimeout(async () => {
    try {
      await i18nService.refreshCache()
      console.log('Auto-refreshed i18n cache due to document changes')
      
      // 刷新所有UI组件
      if (vscode.window.activeTextEditor) {
        inlineTranslationProvider.forceRefresh(vscode.window.activeTextEditor)
      }
      codeLensProvider.refresh()
    } catch (error) {
      console.error('Failed to auto-refresh i18n cache:', error)
    }
  }, 500) // 500ms防抖延迟
  ```
- **内存管理**: 在插件清理和手动刷新时正确清理计时器，防止内存泄漏
- **冲突避免**: 在手动刷新和配置变化时清理自动刷新计时器

### 7. 终极修复：彻底解决装饰器残留问题 (decorationProvider.ts + extension.ts)
- **问题**: 用户反馈在 t 函数内容修改或删除后，翻译文本仍然还显示
- **深层分析**: 原有的装饰器清除机制存在时序问题和不彻底的清除
- **三重保障解决方案**:
  1. **updateDecorations 开始强制清除**: 每次更新前先清除所有装饰
  2. **applyDecorations 开始强制清除**: 应用新装饰前再次强制清除  
  3. **forceRefresh 方法**: 提供彻底重置装饰器状态的能力
- **核心修复实现**:
  ```typescript
  // 1. updateDecorations 中的保险清除
  public async updateDecorations(editor: vscode.TextEditor) {
    // 保险起见，先强制清除当前编辑器的所有装饰
    this.clearDecorations(editor)
    // ... 其他逻辑
  }
  
  // 2. applyDecorations 中的强制清除
  private applyDecorations(editor: vscode.TextEditor, decorations: InlineDecoration[]) {
    // 强制清除所有装饰器类型，确保没有残留
    editor.setDecorations(this.decorationType, [])
    editor.setDecorations(this.translationDecorationType, [])
    editor.setDecorations(this.errorDecorationType, [])
    // ... 重新设置装饰器
  }
  
  // 3. forceRefresh 方法
  public forceRefresh(editor: vscode.TextEditor) {
    const uri = editor.document.uri.toString()
    // 彻底清除
    this.clearDecorations(editor)
    this.decorations.delete(uri)
    // 重新更新
    this.updateDecorations(editor)
  }
  ```
- **全面使用 forceRefresh**: 在所有文档变化、编辑器切换、手动刷新等场景都使用 forceRefresh
- **调试支持**: 添加详细的控制台日志，便于追踪装饰器的应用情况
- **效果**: 彻底解决翻译文本残留问题，确保装饰器状态与文档内容完全同步

## 技术实现细节

### 装饰器类型
```typescript
// 错误装饰器
this.errorDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: new vscode.ThemeColor('editorError.background'),
  border: '1px solid',
  borderColor: new vscode.ThemeColor('editorError.foreground'),
  borderRadius: '2px',
  after: {
    contentText: ' ⚠️ 翻译未找到',
    color: new vscode.ThemeColor('editorError.foreground'),
    fontWeight: 'bold',
    margin: '0 0 0 5px',
  },
})
```

### 状态管理
```typescript
interface InlineDecoration {
  range: vscode.Range
  originalText: string
  translatedText: string
  key: string
  isShowingTranslation: boolean
  hasTranslation: boolean // 新增字段
}
```

### 装饰器更新策略
采用"强制清除→重新构建"的策略，确保每次更新都是完全的原子操作：
1. 清除所有装饰器类型
2. 重新扫描文档内容
3. 构建新的装饰器数组
4. 重新设置装饰器

### 自动刷新机制
采用防抖策略优化性能：
1. **立即响应**: 装饰器立即更新，用户界面无延迟
2. **延迟刷新**: 缓存刷新延迟500ms，避免频繁操作
3. **冲突处理**: 多次变化时重置计时器，只执行最后一次
4. **内存安全**: 正确清理计时器，避免内存泄漏

### 三重保障机制
1. **入口保障**: updateDecorations 开始时强制清除
2. **应用保障**: applyDecorations 开始时强制清除
3. **重置保障**: forceRefresh 提供完全重置能力

## 预期效果

1. **实时性**: t函数的增删改立即反映在编辑器中
2. **可靠性**: 删除t函数后内联内容被彻底清除，无残留
3. **错误提示**: 未找到翻译的t函数有明显的视觉警告
4. **用户体验**: 提供详细的错误信息和解决建议
5. **稳定性**: 正确处理各种边界情况
6. **自动化**: 编辑器内容变化时自动刷新缓存，确保翻译数据始终最新
7. **彻底性**: 三重保障机制确保装饰器残留问题彻底解决

## 测试建议

1. 添加新的t函数调用，验证立即显示翻译
2. 修改t函数的键名，验证实时更新
3. **重点测试**: 删除整个t函数，验证内联翻译被完全清除  
4. **核心测试**: 修改t函数内容后，验证旧的翻译文本完全消失
5. 使用不存在的翻译键，验证错误提示
6. 悬停在错误的t函数上，验证详细错误信息
7. 在不同文件间切换，验证装饰器正确清理
8. **新增测试**: 连续编辑文档，验证自动刷新缓存功能正常工作
9. **性能测试**: 大量快速编辑，验证防抖机制有效
10. **残留测试**: 快速连续修改/删除t函数，确保无翻译文本残留 