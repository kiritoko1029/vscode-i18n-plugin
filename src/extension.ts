import * as vscode from 'vscode'
import { I18nCodeLensProvider } from './providers/codeLensProvider'
import { I18nCompletionProvider } from './providers/completionProvider'
import { InlineTranslationProvider } from './providers/decorationProvider'
import { I18nDefinitionProvider } from './providers/definitionProvider'
import { I18nHoverProvider } from './providers/hoverProvider'
import { I18nService } from './services/i18nService'

let i18nService: I18nService
let hoverProvider: I18nHoverProvider
let definitionProvider: I18nDefinitionProvider
let completionProvider: I18nCompletionProvider
let inlineTranslationProvider: InlineTranslationProvider
let codeLensProvider: I18nCodeLensProvider

export function activate(context: vscode.ExtensionContext) {
  console.warn('MPLAT I18n Plugin is now active!')

  // 检查是否有相关文件类型打开，如果没有则延迟激活
  const hasRelevantFiles = vscode.window.visibleTextEditors.some(editor =>
    ['typescript', 'javascript', 'vue'].includes(editor.document.languageId),
  )

  if (!hasRelevantFiles) {
    // 监听文档打开事件，延迟激活
    const disposable = vscode.workspace.onDidOpenTextDocument((document) => {
      if (['typescript', 'javascript', 'vue'].includes(document.languageId)) {
        disposable.dispose()
        initializeProviders(context)
      }
    })
    context.subscriptions.push(disposable)
    return
  }

  // 立即激活
  initializeProviders(context)
}

function initializeProviders(context: vscode.ExtensionContext) {
  // 初始化服务
  i18nService = new I18nService()
  hoverProvider = new I18nHoverProvider(i18nService)
  definitionProvider = new I18nDefinitionProvider(i18nService)
  completionProvider = new I18nCompletionProvider(i18nService)
  inlineTranslationProvider = new InlineTranslationProvider(i18nService)
  codeLensProvider = new I18nCodeLensProvider(i18nService)

  // 支持的文件类型
  const documentSelector = [
    { scheme: 'file', language: 'typescript' },
    { scheme: 'file', language: 'javascript' },
    { scheme: 'file', language: 'vue' },
  ]

  // 注册hover提供者
  const config = vscode.workspace.getConfiguration('mplat-i18n')
  if (config.get('enableHover', true)) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(documentSelector, hoverProvider),
    )
  }

  // 注册定义提供者
  if (config.get('enableDefinition', true)) {
    context.subscriptions.push(
      vscode.languages.registerDefinitionProvider(documentSelector, definitionProvider),
    )
  }

  // 注册补全提供者
  if (config.get('enableCompletion', true)) {
    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        documentSelector,
        completionProvider,
        '\'',
        '"',
        '`',
      ),
    )
  }

  // 注册CodeLens提供者
  if (config.get('enableCodeLens', true)) {
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(documentSelector, codeLensProvider),
    )
  }

  // 注册内联翻译装饰器
  if (config.get('enableInlineTranslation', false)) {
    // 监听文档变化
    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((document) => {
        const editor = vscode.window.visibleTextEditors.find(e => e.document === document)
        if (editor) {
          inlineTranslationProvider.updateDecorations(editor)
        }
      }),
    )

    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.visibleTextEditors.find(e => e.document === event.document)
        if (editor) {
          // 延迟更新，避免频繁刷新
          setTimeout(() => {
            inlineTranslationProvider.updateDecorations(editor)
          }, 500)
        }
      }),
    )

    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          inlineTranslationProvider.updateDecorations(editor)
        }
      }),
    )

    // 注册点击切换命令
    context.subscriptions.push(
      vscode.commands.registerCommand('mplat-i18n.toggleTranslation', (uri: vscode.Uri, position: vscode.Position) => {
        const editor = vscode.window.activeTextEditor
        if (editor && editor.document.uri.toString() === uri.toString()) {
          inlineTranslationProvider.toggleDecorationAt(editor, position)
        }
      }),
    )

    // 监听编辑器点击事件
    context.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection((event) => {
        if (event.selections.length === 1 && event.selections[0].isEmpty) {
          const position = event.selections[0].start
          inlineTranslationProvider.toggleDecorationAt(event.textEditor, position)
        }
      }),
    )

    // 初始化当前编辑器
    if (vscode.window.activeTextEditor) {
      inlineTranslationProvider.updateDecorations(vscode.window.activeTextEditor)
    }
  }

  // 注册配置变化监听
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('mplat-i18n')) {
        // 刷新缓存
        i18nService.refreshCache()

        // 更新内联翻译开关
        const newConfig = vscode.workspace.getConfiguration('mplat-i18n')
        inlineTranslationProvider.setEnabled(newConfig.get('enableInlineTranslation', false))

        // 刷新所有装饰和CodeLens
        if (vscode.window.activeTextEditor) {
          inlineTranslationProvider.updateDecorations(vscode.window.activeTextEditor)
        }
        codeLensProvider.refresh()
      }
    }),
  )

  // 注册手动刷新命令
  context.subscriptions.push(
    vscode.commands.registerCommand('mplat-i18n.refreshCache', () => {
      i18nService.refreshCache()
      vscode.window.showInformationMessage('I18n cache refreshed!')

      // 刷新装饰和CodeLens
      if (vscode.window.activeTextEditor) {
        inlineTranslationProvider.updateDecorations(vscode.window.activeTextEditor)
      }
      codeLensProvider.refresh()
    }),
  )

  // 注册CodeLens切换命令
  context.subscriptions.push(
    vscode.commands.registerCommand('mplat-i18n.toggleCodeLensTranslation', (range: vscode.Range, key: string) => {
      codeLensProvider.toggleTranslationAt(range, key)
    }),
  )

  // 添加到清理列表
  context.subscriptions.push(inlineTranslationProvider)
}

export function deactivate() {
  console.warn('MPLAT I18n Plugin is now deactivated!')
}
