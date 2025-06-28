import type { I18nService } from '../services/i18nService'
import * as vscode from 'vscode'

export interface InlineDecoration {
  range: vscode.Range
  originalText: string
  translatedText: string
  key: string
  isShowingTranslation: boolean
  hasTranslation: boolean
}

export class InlineTranslationProvider {
  private decorationType: vscode.TextEditorDecorationType
  private translationDecorationType: vscode.TextEditorDecorationType
  private errorDecorationType: vscode.TextEditorDecorationType
  private decorations: Map<string, InlineDecoration[]> = new Map()
  private isEnabled: boolean = true

  constructor(private i18nService: I18nService) {
    // 原文本装饰（彻底隐藏key部分）
    this.decorationType = vscode.window.createTextEditorDecorationType({
      opacity: '0', // 完全透明
      textDecoration: 'none',
    })

    // 翻译文本装饰（自然替换显示）
    this.translationDecorationType = vscode.window.createTextEditorDecorationType({
      before: {
        color: new vscode.ThemeColor('editorInfo.foreground'),
        backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
        fontWeight: 'bold',
        margin: '0',
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    })

    // 错误装饰器（未找到翻译）
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
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    })
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    if (!enabled) {
      this.clearAllDecorations()
    }
  }

  public async updateDecorations(editor: vscode.TextEditor) {
    if (!this.isEnabled) {
      return
    }

    const document = editor.document
    const uri = document.uri.toString()

    // 保险起见，先强制清除当前编辑器的所有装饰
    this.clearDecorations(editor)

    // 只处理TypeScript、JavaScript和Vue文件
    if (!['typescript', 'javascript', 'vue'].includes(document.languageId)) {
      // 如果文件类型不被支持，确保清除所有装饰
      this.clearDecorations(editor)
      this.decorations.delete(uri)
      console.log(`Cleared decorations for unsupported language: ${document.languageId}`)
      return
    }

    const decorations: InlineDecoration[] = []
    const text = document.getText()

    // 查找所有t函数调用
    const lines = text.split('\n')
    let foundMatches = 0
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]

      // 精确匹配t函数中的key部分，保留函数名和括号
      // 匹配模式：$t('key') 或 t('key') 或 .t('key')
      const tFunctionRegex = /(\$t|(?:^|[\s({,])t|\.t)\s*\(\s*(['"`])([^'"`]+)\2([^)]*)\)/g
      let match

      // eslint-disable-next-line no-cond-assign
      while ((match = tFunctionRegex.exec(line)) !== null) {
        foundMatches++
        const _functionPart = match[1] // $t, t, .t
        const quote = match[2] // ', ", `
        const key = match[3] // 翻译key
        const _restPart = match[4] // 剩余参数和括号

        // 计算key在整个匹配中的位置
        const fullMatch = match[0]
        const matchStart = match.index
        const keyStartInMatch = fullMatch.indexOf(quote + key + quote)
        const keyStart = matchStart + keyStartInMatch + 1 // +1 跳过引号
        const keyEnd = keyStart + key.length

        // 获取翻译
        const translation = this.i18nService.getTranslation(key)
        const range = new vscode.Range(
          lineIndex,
          keyStart,
          lineIndex,
          keyEnd,
        )

        if (translation) {
          decorations.push({
            range,
            originalText: key, // 只存储key部分
            translatedText: translation.value,
            key,
            isShowingTranslation: true, // 默认显示翻译
            hasTranslation: true,
          })
        } else {
          decorations.push({
            range,
            originalText: key, // 只存储key部分
            translatedText: '',
            key,
            isShowingTranslation: false, // 未找到翻译
            hasTranslation: false,
          })
        }
      }
    }

    console.log(`Found ${foundMatches} t function calls, created ${decorations.length} decorations for ${uri}`)

    // 保存装饰信息
    this.decorations.set(uri, decorations)

    // 应用装饰
    this.applyDecorations(editor, decorations)
  }

  private applyDecorations(editor: vscode.TextEditor, decorations: InlineDecoration[]) {
    // 强制清除所有装饰器类型，确保没有残留
    editor.setDecorations(this.decorationType, [])
    editor.setDecorations(this.translationDecorationType, [])
    editor.setDecorations(this.errorDecorationType, [])

    const originalTextDecorations: vscode.DecorationOptions[] = []
    const translationDecorations: vscode.DecorationOptions[] = []
    const errorDecorations: vscode.DecorationOptions[] = []

    decorations.forEach((decoration) => {
      if (decoration.hasTranslation && decoration.isShowingTranslation) {
        // 完全隐藏原文
        originalTextDecorations.push({
          range: decoration.range,
        })

        // 在前面显示翻译文本（完全替换）
        translationDecorations.push({
          range: decoration.range,
          renderOptions: {
            before: {
              contentText: decoration.translatedText,
            },
          },
        })
      } else if (!decoration.hasTranslation) {
        // 显示错误装饰
        errorDecorations.push({
          range: decoration.range,
        })
      }
    })

    // 重新设置装饰器
    editor.setDecorations(this.decorationType, originalTextDecorations)
    editor.setDecorations(this.translationDecorationType, translationDecorations)
    editor.setDecorations(this.errorDecorationType, errorDecorations)
    
    // 调试日志
    console.log(`Applied decorations: ${decorations.length} total, ${originalTextDecorations.length} hidden, ${translationDecorations.length} translated, ${errorDecorations.length} errors`)
  }

  public toggleDecorationAt(editor: vscode.TextEditor, position: vscode.Position) {
    const uri = editor.document.uri.toString()
    const decorations = this.decorations.get(uri)
    if (!decorations) {
      return
    }

    // 查找点击位置的装饰
    const clickedDecoration = decorations.find(decoration =>
      decoration.range.contains(position),
    )

    if (clickedDecoration && clickedDecoration.hasTranslation) {
      // 只有找到翻译的才能切换显示状态
      clickedDecoration.isShowingTranslation = !clickedDecoration.isShowingTranslation

      // 重新应用装饰
      this.applyDecorations(editor, decorations)
    }
  }

  public clearDecorations(editor: vscode.TextEditor) {
    editor.setDecorations(this.decorationType, [])
    editor.setDecorations(this.translationDecorationType, [])
    editor.setDecorations(this.errorDecorationType, [])
  }

  public clearAllDecorations() {
    vscode.window.visibleTextEditors.forEach((editor) => {
      this.clearDecorations(editor)
    })
    this.decorations.clear()
  }

  /**
   * 强制刷新指定编辑器的装饰器，完全重置状态
   */
  public forceRefresh(editor: vscode.TextEditor) {
    const uri = editor.document.uri.toString()
    console.log(`Force refreshing decorations for ${uri}`)
    
    // 彻底清除
    this.clearDecorations(editor)
    this.decorations.delete(uri)
    
    // 重新更新
    this.updateDecorations(editor)
  }

  public dispose() {
    this.decorationType.dispose()
    this.translationDecorationType.dispose()
    this.errorDecorationType.dispose()
    this.clearAllDecorations()
  }
}
