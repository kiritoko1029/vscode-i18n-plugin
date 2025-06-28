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

  // 防抖刷新缓存的计时器
  let refreshCacheTimer: NodeJS.Timeout | undefined

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
        if (editor && ['typescript', 'javascript', 'vue'].includes(document.languageId)) {
          inlineTranslationProvider.forceRefresh(editor)
        }
      }),
    )

    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.visibleTextEditors.find(e => e.document === event.document)
        if (editor && ['typescript', 'javascript', 'vue'].includes(event.document.languageId)) {
          console.log(`Document changed: ${event.document.uri.toString()}, scheduling debounced refresh`)
          
          // 防抖自动刷新缓存和装饰器
          if (refreshCacheTimer) {
            clearTimeout(refreshCacheTimer)
          }
          
          refreshCacheTimer = setTimeout(async () => {
            try {
              console.log('Starting debounced refresh due to document changes')
              await i18nService.refreshCache()
              console.log('Successfully refreshed i18n cache')
              
              // 刷新所有UI组件
              if (vscode.window.activeTextEditor && ['typescript', 'javascript', 'vue'].includes(vscode.window.activeTextEditor.document.languageId)) {
                console.log('Refreshing inline translation decorations')
                inlineTranslationProvider.forceRefresh(vscode.window.activeTextEditor)
              }
              codeLensProvider.refresh()
              console.log('Completed debounced refresh')
            } catch (error) {
              console.error('Failed to auto-refresh i18n cache:', error)
            }
          }, 300) // 300ms防抖延迟，提高响应性
        }
      }),
    )

    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && ['typescript', 'javascript', 'vue'].includes(editor.document.languageId)) {
          console.log(`Active editor changed to: ${editor.document.uri.toString()}, force refreshing decorations`)
          // 切换编辑器时立即刷新是必要的，不与防抖冲突
          inlineTranslationProvider.forceRefresh(editor)
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
    if (vscode.window.activeTextEditor && ['typescript', 'javascript', 'vue'].includes(vscode.window.activeTextEditor.document.languageId)) {
      inlineTranslationProvider.forceRefresh(vscode.window.activeTextEditor)
    }
  }

  // 注册配置变化监听
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('mplat-i18n')) {
        console.log('Configuration changed, clearing debounce timer and refreshing')
        // 清理自动刷新计时器，避免冲突
        if (refreshCacheTimer) {
          clearTimeout(refreshCacheTimer)
          refreshCacheTimer = undefined
        }
        
        // 刷新缓存
        i18nService.refreshCache()

        // 更新内联翻译开关
        const newConfig = vscode.workspace.getConfiguration('mplat-i18n')
        const enableInlineTranslation = newConfig.get('enableInlineTranslation', false)
        console.log(`Inline translation enabled: ${enableInlineTranslation}`)
        inlineTranslationProvider.setEnabled(enableInlineTranslation)

        // 强制刷新所有装饰和CodeLens
        if (vscode.window.activeTextEditor && ['typescript', 'javascript', 'vue'].includes(vscode.window.activeTextEditor.document.languageId)) {
          console.log('Refreshing decorations due to configuration change')
          inlineTranslationProvider.forceRefresh(vscode.window.activeTextEditor)
        }
        codeLensProvider.refresh()
      }
    }),
  )

  // 注册手动刷新命令
  context.subscriptions.push(
    vscode.commands.registerCommand('mplat-i18n.refreshCache', async () => {
      console.log('Manual refresh command triggered')
      // 清理自动刷新计时器，避免冲突
      if (refreshCacheTimer) {
        clearTimeout(refreshCacheTimer)
        refreshCacheTimer = undefined
        console.log('Cleared pending debounce timer')
      }
      
      try {
        await i18nService.refreshCache()
        console.log('Manual cache refresh completed')
        vscode.window.showInformationMessage('I18n cache refreshed!')

        // 强制刷新装饰和CodeLens
        if (vscode.window.activeTextEditor && ['typescript', 'javascript', 'vue'].includes(vscode.window.activeTextEditor.document.languageId)) {
          console.log('Refreshing decorations after manual refresh')
          inlineTranslationProvider.forceRefresh(vscode.window.activeTextEditor)
        }
        codeLensProvider.refresh()
      } catch (error) {
        console.error('Manual refresh failed:', error)
        vscode.window.showErrorMessage('Failed to refresh I18n cache')
      }
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
  
  // 清理计时器
  context.subscriptions.push({
    dispose: () => {
      if (refreshCacheTimer) {
        clearTimeout(refreshCacheTimer)
        refreshCacheTimer = undefined
      }
    }
  })
}

export function deactivate() {
  console.warn('MPLAT I18n Plugin is now deactivated!')
}
