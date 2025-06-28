import type { I18nService } from '../services/i18nService'
import * as vscode from 'vscode'

export interface TranslationCodeLens extends vscode.CodeLens {
  translationData: {
    key: string
    translation: string
    isShowingTranslation: boolean
  }
}

export class I18nCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>()
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event
  private codeLensCache: Map<string, TranslationCodeLens[]> = new Map()

  constructor(private i18nService: I18nService) {}

  public refresh(): void {
    this.codeLensCache.clear()
    this._onDidChangeCodeLenses.fire()
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const uri = document.uri.toString()

    // 只处理TypeScript、JavaScript和Vue文件
    if (!['typescript', 'javascript', 'vue'].includes(document.languageId)) {
      return []
    }

    const codeLenses: TranslationCodeLens[] = []
    const text = document.getText()
    const lines = text.split('\n')

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]

      // 匹配t函数调用
      const tFunctionRegex = /(?:\$t|(?:^|[\s({,])t|\.t)\s*\(\s*['"`]([^'"`]+)['"`][^)]*\)/g
      let match

      // eslint-disable-next-line no-cond-assign
      while ((match = tFunctionRegex.exec(line)) !== null) {
        const key = match[1]

        // 获取翻译
        const translation = this.i18nService.getTranslation(key)
        if (translation) {
          const range = new vscode.Range(lineIndex, 0, lineIndex, 0)

          const codeLens: TranslationCodeLens = new vscode.CodeLens(range) as TranslationCodeLens
          codeLens.translationData = {
            key,
            translation: translation.value,
            isShowingTranslation: true,
          }

          codeLenses.push(codeLens)
        }
      }
    }

    // 缓存CodeLens
    this.codeLensCache.set(uri, codeLenses)
    return codeLenses
  }

  resolveCodeLens(codeLens: vscode.CodeLens): vscode.CodeLens | Thenable<vscode.CodeLens> {
    const translationCodeLens = codeLens as TranslationCodeLens
    const { key, translation, isShowingTranslation } = translationCodeLens.translationData

    if (isShowingTranslation) {
      codeLens.command = {
        title: `💬 ${translation}`,
        command: 'mplat-i18n.toggleCodeLensTranslation',
        arguments: [codeLens.range, key],
      }
    }
    else {
      codeLens.command = {
        title: `🔑 ${key}`,
        command: 'mplat-i18n.toggleCodeLensTranslation',
        arguments: [codeLens.range, key],
      }
    }

    return codeLens
  }

  public toggleTranslationAt(range: vscode.Range, key: string): void {
    // 查找对应的CodeLens并切换状态
    for (const [, codeLenses] of this.codeLensCache.entries()) {
      for (const codeLens of codeLenses) {
        if (codeLens.range.isEqual(range) && codeLens.translationData.key === key) {
          codeLens.translationData.isShowingTranslation = !codeLens.translationData.isShowingTranslation
          this._onDidChangeCodeLenses.fire()
          return
        }
      }
    }
  }
}
