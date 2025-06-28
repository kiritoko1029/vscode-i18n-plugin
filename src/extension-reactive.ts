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

// Reactive 扩展定义
const reactiveExtension = defineExtension(() => {
  console.warn('MPLAT I18n Plugin (Reactive) is now active!')
  console.log('Extension activation time:', new Date().toISOString())

  try {
    // 创建 i18n 服务实例
    const i18nService = ref(new I18nService())
    console.log('I18n service created successfully')
  
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

  // 文档版本计数器，用于触发内联翻译重新计算
  const documentVersion = ref(0)
  
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

  // ========== Enhanced Completion Provider ==========
  watchEffect(() => {
    if (enableCompletion.value) {
      const completionProvider = vscode.languages.registerCompletionItemProvider(
        documentSelector,
        {
          provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
            const line = document.lineAt(position)
            const textBeforeCursor = line.text.substring(0, position.character)

            // 扩展的 t 函数匹配模式，支持更多调用形式
            const tFunctionPatterns = [
              /(?:\$t|\.t|^t|[\s({,]t|this\.t|i18n\.t)\s*\(\s*['"`]([^'"`]*)$/,  // 基本模式
              /(?:translate|trans)\s*\(\s*['"`]([^'"`]*)$/,  // 其他翻译函数
            ]

            let partialKey = ''
            let matchFound = false

            for (const pattern of tFunctionPatterns) {
              const match = textBeforeCursor.match(pattern)
              if (match) {
                partialKey = match[1] || ''
                matchFound = true
                break
              }
            }

            if (!matchFound) {
              return null
            }

            const allKeys = i18nService.value.getAllKeys()

            // 智能匹配算法
            const matchingKeys = allKeys.filter(key => {
              const keyLower = key.toLowerCase()
              const partialLower = partialKey.toLowerCase()
              
              // 1. 精确前缀匹配（最高优先级）
              if (keyLower.startsWith(partialLower)) return true
              
              // 2. 包含匹配
              if (keyLower.includes(partialLower)) return true
              
              // 3. 层级匹配（如输入 user 匹配 user.name）
              if (partialKey && key.includes('.')) {
                const keyParts = key.split('.')
                return keyParts.some(part => part.toLowerCase().startsWith(partialLower))
              }
              
              // 4. 模糊匹配（字符序列匹配）
              if (partialKey.length >= 2) {
                let keyIndex = 0
                for (let i = 0; i < partialLower.length; i++) {
                  keyIndex = keyLower.indexOf(partialLower[i], keyIndex)
                  if (keyIndex === -1) return false
                  keyIndex++
                }
                return true
              }
              
              return false
            })

            // 限制结果数量以提高性能
            const limitedKeys = matchingKeys.slice(0, 50)

            // 创建增强的补全项
            return limitedKeys.map((key, index) => {
              const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Constant)

              // 获取翻译预览
              const translation = i18nService.value.getTranslation(key)
              if (translation) {
                // 设置详细信息（显示在补全项右侧）
                item.detail = `${translation.value.slice(0, 50)}${translation.value.length > 50 ? '...' : ''}`
                
                // 设置文档（显示在补全弹窗中）
                const docs = new vscode.MarkdownString()
                docs.isTrusted = true
                docs.appendMarkdown(`**🌍 Translation**\n\n`)
                docs.appendMarkdown(`\`${translation.value}\`\n\n`)
                docs.appendMarkdown(`**📋 Details**\n\n`)
                docs.appendMarkdown(`• **Key**: \`${key}\`\n`)
                docs.appendMarkdown(`• **Locale**: \`${translation.locale}\`\n`)
                
                if (translation.interpolationKeys.length > 0) {
                  docs.appendMarkdown(`• **Parameters**: \`${translation.interpolationKeys.join(', ')}\`\n`)
                  docs.appendMarkdown(`\n**💡 Usage Example**\n\n`)
                  const exampleParams = translation.interpolationKeys.map(k => `${k}: 'value'`).join(', ')
                  docs.appendMarkdown(`\`\`\`typescript\nt('${key}', { ${exampleParams} })\n\`\`\``)
                } else {
                  docs.appendMarkdown(`\n**💡 Usage Example**\n\n`)
                  docs.appendMarkdown(`\`\`\`typescript\nt('${key}')\n\`\`\``)
                }
                
                item.documentation = docs
                
                // 设置插入文本（支持参数补全）
                if (translation.interpolationKeys.length > 0) {
                  const snippetParams = translation.interpolationKeys.map((k, i) => `\${${i + 2}:${k}}`).join(', ')
                  item.insertText = new vscode.SnippetString(`${key}\$1, { ${snippetParams} }`)
                } else {
                  item.insertText = key
                }
              } else {
                item.detail = 'Translation not found'
                item.insertText = key
              }

              // 智能排序权重
              const keyLower = key.toLowerCase()
              const partialLower = partialKey.toLowerCase()
              
              let sortWeight = 50 // 默认权重
              
              if (keyLower === partialLower) {
                sortWeight = 10 // 完全匹配
              } else if (keyLower.startsWith(partialLower)) {
                sortWeight = 20 // 前缀匹配
              } else if (keyLower.includes(partialLower)) {
                sortWeight = 30 // 包含匹配
              } else {
                sortWeight = 40 // 模糊匹配
              }
              
              // 考虑键的长度（短的更优先）
              sortWeight += Math.min(key.length / 10, 10)
              
              item.sortText = `${sortWeight.toString().padStart(2, '0')}_${key}`
              
              // 设置图标
              if (translation?.interpolationKeys && translation.interpolationKeys.length > 0) {
                item.kind = vscode.CompletionItemKind.Function // 有参数的显示为函数
              } else {
                item.kind = vscode.CompletionItemKind.Constant // 无参数的显示为常量
              }

              return item
            })
          }
        },
        "'", '"', '`'  // 触发字符
      )
      
      useDisposable(completionProvider)
    }
  })



  // ========== Inline Translation Decorations ==========
  
  // 监听编辑器选择变化
  const currentSelections = ref<readonly vscode.Selection[]>([])
  
  useDisposable(vscode.window.onDidChangeTextEditorSelection((e) => {
    if (e.textEditor === activeEditor.value) {
      currentSelections.value = e.selections
    }
  }))

  // 计算所有可翻译的位置和内容
  const translationItems = computed(() => {
    // 依赖文档版本以响应内容变化
    documentVersion.value; // 触发响应式依赖
    
    if (!enableInlineTranslation.value || !isCurrentEditorSupported.value || !activeEditor.value) {
      return []
    }

    const editor = activeEditor.value
    const document = editor.document
    const items: Array<{
      range: vscode.Range
      key: string
      translation: string
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
          
          items.push({
            range,
            key,
            translation: translation.value
          })
        }
      }
    }

    return items
  })

  // 基于选择的自动显示/隐藏逻辑（参照 PNPM Catalog Lens）
  const hiddenDecorations = computed(() => {
    const items = translationItems.value
    const selections = currentSelections.value
    
    return items
      .filter(item => {
        // 检查是否有选择范围与翻译范围重叠
        for (const selection of selections) {
          if (selection.contains(item.range) || 
              item.range.contains(selection.start) || 
              item.range.contains(selection.end) ||
              selection.intersection(item.range)) {
            return false // 有重叠时不隐藏原文本
          }
        }
        return true // 无重叠时隐藏原文本，显示翻译
      })
      .map(item => ({ range: item.range }))
  })

  // 计算需要显示翻译的装饰
  const displayDecorations = computed(() => {
    const items = translationItems.value
    const selections = currentSelections.value
    
    return items
      .filter(item => {
        // 检查是否有选择范围与翻译范围重叠
        for (const selection of selections) {
          if (selection.contains(item.range) || 
              item.range.contains(selection.start) || 
              item.range.contains(selection.end) ||
              selection.intersection(item.range)) {
            return false // 有重叠时不显示翻译
          }
        }
        return true // 无重叠时显示翻译
      })
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

  } catch (error) {
    console.error('MPLAT I18n Plugin initialization error:', error)
    vscode.window.showErrorMessage(`MPLAT I18n Plugin failed to initialize: ${error}`)
  }
})

// 传统的激活函数（向后兼容）
export function activate(context: vscode.ExtensionContext) {
  console.log('MPLAT I18n Plugin: Traditional activate function called')
  try {
    const result = reactiveExtension.activate(context)
    console.log('Reactive extension activated successfully')
    return result
  } catch (error) {
    console.error('Failed to activate reactive extension:', error)
    vscode.window.showErrorMessage(`MPLAT I18n Plugin activation failed: ${error}`)
  }
}

export function deactivate() {
  console.log('MPLAT I18n Plugin: Deactivating...')
  try {
    reactiveExtension.deactivate?.()
  } catch (error) {
    console.error('Failed to deactivate:', error)
  }
}