import type { I18nService } from '../services/i18nService'
import * as vscode from 'vscode'

export class I18nHoverProvider implements vscode.HoverProvider {
  constructor(private i18nService: I18nService) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    const line = document.lineAt(position)
    const text = line.text

    // 检查是否在 t 函数调用的位置
    const callInfo = this.i18nService.parseInterpolation(text)
    if (!callInfo) {
      return null
    }

    // 获取翻译结果
    const translation = this.i18nService.getTranslation(callInfo.key, callInfo.interpolation)
    if (!translation) {
      return new vscode.Hover(
        new vscode.MarkdownString(`**Translation not found**\n\nKey: \`${callInfo.key}\``),
      )
    }

    // 构建 hover 内容
    const content = new vscode.MarkdownString()
    content.isTrusted = true

    content.appendMarkdown(`**Translation**\n\n`)
    content.appendMarkdown(`📝 \`${translation.value}\`\n\n`)

    content.appendMarkdown(`**Details**\n\n`)
    content.appendMarkdown(`🔑 **Key**: \`${callInfo.key}\`\n\n`)
    content.appendMarkdown(`🌍 **Locale**: \`${translation.locale}\`\n\n`)

    // 显示插值信息
    if (translation.interpolationKeys.length > 0) {
      content.appendMarkdown(`🔧 **Interpolation Keys**: \`${translation.interpolationKeys.join(', ')}\`\n\n`)

      if (callInfo.interpolation) {
        content.appendMarkdown(`📊 **Current Values**:\n`)
        if (callInfo.interpolationType === 'object') {
          for (const [key, value] of Object.entries(callInfo.interpolation)) {
            content.appendMarkdown(`- \`${key}\`: \`${value}\`\n`)
          }
        }
        else if (callInfo.interpolationType === 'array') {
          callInfo.interpolation.forEach((value: any, index: number) => {
            content.appendMarkdown(`- \`${index}\`: \`${value}\`\n`)
          })
        }
        else if (callInfo.interpolationType === 'rest') {
          callInfo.interpolation.forEach((value: any, index: number) => {
            content.appendMarkdown(`- \`${index}\`: \`${value}\`\n`)
          })
        }
        content.appendMarkdown('\n')
      }
    }

    // 添加文件路径信息
    if (translation.filePath) {
      const relativePath = vscode.workspace.asRelativePath(translation.filePath)
      content.appendMarkdown(`📁 **Source**: \`${relativePath}\`\n\n`)
    }

    return new vscode.Hover(content)
  }
}
