import type { I18nService } from '../services/i18nService'
import * as vscode from 'vscode'

export class I18nDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private i18nService: I18nService) {}

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
    const line = document.lineAt(position)
    const text = line.text

    // 检查是否在 t 函数调用的位置
    const callInfo = this.i18nService.parseInterpolation(text)
    if (!callInfo) {
      return null
    }

    // 获取键的定义位置
    const definition = this.i18nService.getKeyLocation(callInfo.key)
    if (!definition) {
      return null
    }

    const targetUri = vscode.Uri.file(definition.filePath)
    const targetPosition = new vscode.Position(definition.line, 0)
    const targetLocation = new vscode.Location(targetUri, targetPosition)

    return [targetLocation]
  }
}
