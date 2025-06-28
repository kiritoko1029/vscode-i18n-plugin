import type { I18nService } from '../services/i18nService'
import * as vscode from 'vscode'

export class I18nCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private i18nService: I18nService) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    context: vscode.CompletionContext,
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    const line = document.lineAt(position)
    const textBeforeCursor = line.text.substring(0, position.character)

    // 检查是否在 $t 或 t 函数的字符串参数中
    const tFunctionMatch = textBeforeCursor.match(/(?:\$t|\.t)\s*\(\s*['"`]([^'"`]*)$/)
    if (!tFunctionMatch) {
      return null
    }

    const partialKey = tFunctionMatch[1]
    const allKeys = this.i18nService.getAllKeys()

    // 过滤匹配的键
    const matchingKeys = allKeys.filter(key =>
      key.toLowerCase().includes(partialKey.toLowerCase()),
    )

    // 创建补全项
    const completionItems = matchingKeys.map((key) => {
      const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property)

      // 获取翻译预览
      const translation = this.i18nService.getTranslation(key)
      if (translation) {
        item.detail = translation.value
        item.documentation = new vscode.MarkdownString(
          `**Translation**: ${translation.value}\n\n`
          + `**Locale**: ${translation.locale}\n\n${
            translation.interpolationKeys.length > 0
              ? `**Interpolation**: ${translation.interpolationKeys.join(', ')}`
              : ''}`,
        )
      }

      // 设置排序权重，优先显示完全匹配的
      if (key.toLowerCase().startsWith(partialKey.toLowerCase())) {
        item.sortText = `0_${key}`
      }
      else {
        item.sortText = `1_${key}`
      }

      return item
    })

    return completionItems
  }
}
