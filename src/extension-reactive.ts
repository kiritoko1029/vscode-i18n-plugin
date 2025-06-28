import { 
  defineExtension, 
  defineConfigs,
  useActiveTextEditor,
  useCommand,
  useActiveEditorDecorations,
  useDisposable
} from 'reactive-vscode'
import { computed, ref, watch, watchEffect } from '@reactive-vscode/reactivity'
import { I18nService } from './services/i18nService'
import type { TranslationResult } from './services/i18nService'
import * as vscode from 'vscode'

// 定义配置
const { 
  autoDiscovery,
  scanPatterns, 
  manualPaths,
  defaultLocale,
  fallbackLocale,
  enableHover,
  enableDefinition,
  enableCompletion,
  enableInlineTranslation
} = defineConfigs('mplat-i18n', {
  autoDiscovery: Boolean,
  scanPatterns: Array,
  manualPaths: Array,
  defaultLocale: String,
  fallbackLocale: String,
  enableHover: Boolean,
  enableDefinition: Boolean,
  enableCompletion: Boolean,
  enableInlineTranslation: Boolean
})

export = defineExtension(() => {
  console.warn('MPLAT I18n Plugin (Reactive) is now active!')

  // 创建 i18n 服务实例
  const i18nService = ref(new I18nService())
  
  // 支持的文件类型
  const supportedLanguages = ['typescript', 'javascript', 'vue']
  const documentSelector = supportedLanguages.map(language => ({ scheme: 'file', language }))

  // 监听配置变化，自动刷新服务
  watch([autoDiscovery, scanPatterns, manualPaths, defaultLocale, fallbackLocale], () => {
    i18nService.value.refreshCache()
  }, { immediate: true })

  // 获取当前活动编辑器
  const activeEditor = useActiveTextEditor()
  
  // 检查当前编辑器是否支持
  const isCurrentEditorSupported = computed(() => {
    return activeEditor.value && supportedLanguages.includes(activeEditor.value.document.languageId)
  })

  // ========== Hover Provider ==========
  watchEffect(() => {
    if (enableHover.value) {
      const hoverProvider = vscode.languages.registerHoverProvider(documentSelector, {
        provideHover(document: vscode.TextDocument, position: vscode.Position) {
          const line = document.lineAt(position)
          const text = line.text

          // 检查是否在 t 函数调用的位置
          const callInfo = i18nService.value.parseInterpolation(text)
          if (!callInfo) {
            return null
          }

          // 获取翻译结果
          const translation = i18nService.value.getTranslation(callInfo.key, callInfo.interpolation)
          if (!translation) {
            return new vscode.Hover(
              new vscode.MarkdownString(`**Translation not found**\n\nKey: \`${callInfo.key}\``)
            )
          }

          // 构建 hover 内容
          return createHoverContent(callInfo, translation)
        }
      })
      
      useDisposable(hoverProvider)
    }
  })

  // ========== Definition Provider ==========
  watchEffect(() => {
    if (enableDefinition.value) {
      const definitionProvider = vscode.languages.registerDefinitionProvider(documentSelector, {
        provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
          const line = document.lineAt(position)
          const text = line.text

          const callInfo = i18nService.value.parseInterpolation(text)
          if (!callInfo) {
            return null
          }

          const location = i18nService.value.getKeyLocation(callInfo.key)
          if (!location) {
            return null
          }

          return new vscode.Location(
            vscode.Uri.file(location.filePath),
            new vscode.Position(location.line - 1, 0)
          )
        }
      })
      
      useDisposable(definitionProvider)
    }
  })

  // ========== Completion Provider ==========
  watchEffect(() => {
    if (enableCompletion.value) {
      const completionProvider = vscode.languages.registerCompletionItemProvider(
        documentSelector,
        {
          provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
            const line = document.lineAt(position)
            const textBeforeCursor = line.text.substring(0, position.character)

            // 检查是否在 $t 或 t 函数的字符串参数中
            const tFunctionMatch = textBeforeCursor.match(/(?:\$t|\.t)\s*\(\s*['"`]([^'"`]*)$/)
            if (!tFunctionMatch) {
              return null
            }

            const partialKey = tFunctionMatch[1]
            const allKeys = i18nService.value.getAllKeys()

            // 过滤匹配的键
            const matchingKeys = allKeys.filter(key =>
              key.toLowerCase().includes(partialKey.toLowerCase())
            )

            // 创建补全项
            return matchingKeys.map((key) => {
              const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property)

              // 获取翻译预览
              const translation = i18nService.value.getTranslation(key)
              if (translation) {
                item.detail = translation.value
                item.documentation = new vscode.MarkdownString(
                  `**Translation**: ${translation.value}\n\n` +
                  `**Locale**: ${translation.locale}\n\n${
                    translation.interpolationKeys.length > 0
                      ? `**Interpolation**: ${translation.interpolationKeys.join(', ')}`
                      : ''
                  }`
                )
              }

              // 设置排序权重
              if (key.toLowerCase().startsWith(partialKey.toLowerCase())) {
                item.sortText = `0_${key}`
              } else {
                item.sortText = `1_${key}`
              }

              return item
            })
          }
        },
        "'", '"', '`'
      )
      
      useDisposable(completionProvider)
    }
  })



  // ========== Inline Translation Decorations ==========
  
  // 翻译状态管理：存储每个位置的显示状态
  const translationStates = ref<Map<string, boolean>>(new Map())
  
  // 监听活动编辑器变化，清理状态
  watch(activeEditor, (newEditor, oldEditor) => {
    if (newEditor?.document.uri.toString() !== oldEditor?.document.uri.toString()) {
      // 清理旧文件的状态，保留当前文件的状态
      const currentUri = newEditor?.document.uri.toString()
      if (currentUri) {
        const newStates = new Map<string, boolean>()
        for (const [key, value] of translationStates.value.entries()) {
          if (key.startsWith(currentUri)) {
            newStates.set(key, value)
          }
        }
        translationStates.value = newStates
      }
    }
  })
  
  // 监听编辑器选择变化和文档编辑
  const currentSelections = ref<readonly vscode.Selection[]>([])
  const isEditing = ref(false)
  const lastEditTime = ref(0)
  
  // 监听文档变化，检测编辑状态
  useDisposable(vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document === activeEditor.value?.document) {
      isEditing.value = true
      lastEditTime.value = Date.now()
      
      // 500ms 后重置编辑状态
      setTimeout(() => {
        if (Date.now() - lastEditTime.value >= 500) {
          isEditing.value = false
        }
      }, 500)
    }
  }))
  
  useDisposable(vscode.window.onDidChangeTextEditorSelection((e) => {
    if (e.textEditor === activeEditor.value) {
      currentSelections.value = e.selections
    }
  }))

  // 计算所有可翻译的位置和内容
  const translationItems = computed(() => {
    if (!enableInlineTranslation.value || !isCurrentEditorSupported.value || !activeEditor.value) {
      return []
    }

    const editor = activeEditor.value
    const document = editor.document
    const items: Array<{
      range: vscode.Range
      key: string
      translation: string
      stateKey: string
    }> = []
    const text = document.getText()
    const lines = text.split('\n')

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      const tFunctionRegex = /(\$t|(?:^|[\s({,])t|\.t)\s*\(\s*(['"`])([^'"`]+)\2([^)]*)\)/g
      let match

      while ((match = tFunctionRegex.exec(line)) !== null) {
        const quote = match[2]
        const key = match[3]
        const fullMatch = match[0]
        const matchStart = match.index
        const keyStartInMatch = fullMatch.indexOf(quote + key + quote)
        const keyStart = matchStart + keyStartInMatch + 1
        const keyEnd = keyStart + key.length

        const translation = i18nService.value.getTranslation(key)
        if (translation) {
          const range = new vscode.Range(lineIndex, keyStart, lineIndex, keyEnd)
          const stateKey = `${document.uri.toString()}-${lineIndex}-${keyStart}-${key}`
          
          items.push({
            range,
            key,
            translation: translation.value,
            stateKey
          })
        }
      }
    }

    return items
  })

  // 优化的点击检测和切换逻辑
  let lastClickTime = 0
  let lastClickPosition: vscode.Position | null = null
  let clickTimeout: NodeJS.Timeout | null = null
  
  watchEffect(() => {
    const selections = currentSelections.value
    const items = translationItems.value
    
    // 如果正在编辑，不处理点击切换
    if (isEditing.value) {
      return
    }
    
    if (selections.length === 1 && selections[0].isEmpty) {
      const clickPosition = selections[0].start
      const currentTime = Date.now()
      
      // 防止重复触发，检查是否是新的点击
      const isSamePosition = lastClickPosition && 
        lastClickPosition.line === clickPosition.line && 
        lastClickPosition.character === clickPosition.character
      
      // 增加时间间隔，避免编辑时的误触发
      if (!isSamePosition || currentTime - lastClickTime > 300) {
        // 清除之前的延迟处理
        if (clickTimeout) {
          clearTimeout(clickTimeout)
        }
        
        // 延迟处理点击，确保不是编辑引起的选择变化
        clickTimeout = setTimeout(() => {
          // 再次检查是否还在编辑状态
          if (!isEditing.value) {
            lastClickTime = currentTime
            lastClickPosition = clickPosition
            
            // 查找点击位置对应的翻译项
            for (const item of items) {
              if (item.range.contains(clickPosition)) {
                const currentState = translationStates.value.get(item.stateKey) ?? true
                translationStates.value.set(item.stateKey, !currentState)
                console.log(`Toggled translation for key "${item.key}" to ${!currentState}`)
                break
              }
            }
          }
          clickTimeout = null
        }, 200) // 200ms 延迟
      }
    }
  })

  // 计算需要隐藏的装饰
  const hiddenDecorations = computed(() => {
    return translationItems.value
      .filter(item => translationStates.value.get(item.stateKey) !== false)
      .map(item => ({ range: item.range }))
  })

  // 计算需要显示的装饰
  const displayDecorations = computed(() => {
    return translationItems.value
      .filter(item => translationStates.value.get(item.stateKey) !== false)
      .map(item => ({
        range: item.range,
        renderOptions: {
          before: {
            contentText: item.translation,
            color: new vscode.ThemeColor('editorInfo.foreground'),
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            fontWeight: 'normal'
          }
        }
      }))
  })



  // 隐藏原文本（完全移除空间占用）
  useActiveEditorDecorations(
    {
      opacity: '0; display: none;'
    },
    () => hiddenDecorations.value
  )

  // 显示翻译内容
  useActiveEditorDecorations(
    {},
    () => displayDecorations.value
  )

  // ========== Commands ==========
  
  // 刷新缓存命令
  useCommand('mplat-i18n.refreshCache', () => {
    i18nService.value.refreshCache()
    vscode.window.showInformationMessage('I18n cache refreshed!')
  })



  // 内联翻译切换命令
  useCommand('mplat-i18n.toggleTranslation', (uri: vscode.Uri, position: vscode.Position) => {
    const editor = activeEditor.value
    if (editor && editor.document.uri.toString() === uri.toString()) {
      // 这里可以实现切换逻辑
      console.log('Toggle translation at', position)
    }
  })

  // ========== Helper Functions ==========
  
  function createHoverContent(callInfo: any, translation: TranslationResult) {
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
        } else if (callInfo.interpolationType === 'array') {
          callInfo.interpolation.forEach((value: any, index: number) => {
            content.appendMarkdown(`- \`${index}\`: \`${value}\`\n`)
          })
        } else if (callInfo.interpolationType === 'rest') {
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


}) 