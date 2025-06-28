import * as fs from 'node:fs'
import * as path from 'node:path'
import * as vscode from 'vscode'

export interface LocaleMessage {
  [key: string]: string | LocaleMessage
}

export interface TranslationResult {
  value: string
  filePath: string
  line: number
  locale: string
  interpolationKeys: string[]
  interpolationType: 'object' | 'array' | 'rest' | 'none'
}

export class I18nService {
  private localesCache: Map<string, LocaleMessage> = new Map()
  private keyToFileMap: Map<string, Map<string, { filePath: string, line: number }>> = new Map()
  private allKeysCache: string[] = []
  private projectLocale: string | null = null

  constructor() {
    this.refreshCache()
  }

  /**
   * 刷新缓存
   */
  public async refreshCache(): Promise<void> {
    this.localesCache.clear()
    this.keyToFileMap.clear()
    this.allKeysCache = []
    this.projectLocale = null
    await this.detectProjectLocale()
    await this.loadLocales()
  }

  /**
   * 获取翻译
   */
  public getTranslation(key: string, interpolation?: any): TranslationResult | null {
    const config = vscode.workspace.getConfiguration('mplat-i18n')

    // 优先使用项目检测到的语言，其次使用配置的默认语言
    const defaultLocale: string = this.projectLocale || config.get('defaultLocale', 'zhCN')
    const fallbackLocale: string = config.get('fallbackLocale', 'en')

    // 尝试从默认语言获取
    let result = this.getTranslationFromLocale(key, defaultLocale, interpolation)
    if (result) {
      return result
    }

    // 尝试从备用语言获取
    if (fallbackLocale !== defaultLocale) {
      result = this.getTranslationFromLocale(key, fallbackLocale, interpolation)
      if (result) {
        return result
      }
    }

    return null
  }

  /**
   * 获取所有翻译键
   */
  public getAllKeys(): string[] {
    return this.allKeysCache
  }

  /**
   * 获取翻译键对应的文件位置
   */
  public getKeyLocation(key: string): { filePath: string, line: number } | null {
    const config = vscode.workspace.getConfiguration('mplat-i18n')
    const defaultLocale: string = this.projectLocale || config.get('defaultLocale', 'zhCN')

    const localeKeyMap = this.keyToFileMap.get(defaultLocale)
    if (localeKeyMap && localeKeyMap.has(key)) {
      return localeKeyMap.get(key)!
    }

    // 尝试从其他语言文件中查找
    for (const [_locale, keyMap] of this.keyToFileMap.entries()) {
      if (keyMap.has(key)) {
        return keyMap.get(key)!
      }
    }

    return null
  }

  private async loadLocales(): Promise<void> {
    const config = vscode.workspace.getConfiguration('mplat-i18n')
    const autoDiscovery = config.get('autoDiscovery', true)

    let localeFiles: string[] = []

    if (autoDiscovery) {
      const scanPatterns = config.get('scanPatterns', [
        'packages/*/src/locales/**/*.{ts,js}',
        'packages/*/src/i18n/**/*.{ts,js}',
        'src/locales/**/*.{ts,js}',
        'src/i18n/**/*.{ts,js}',
      ])

      for (const pattern of scanPatterns) {
        try {
          const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**')
          localeFiles.push(...files.map(uri => uri.fsPath))
        }
        catch (error) {
          console.warn(`Failed to find files with pattern ${pattern}:`, error)
        }
      }
    }
    else {
      const manualPaths = config.get('manualPaths', [])
      for (const dirPath of manualPaths) {
        const workspaceFolders = vscode.workspace.workspaceFolders
        if (workspaceFolders) {
          const fullPath = path.resolve(workspaceFolders[0].uri.fsPath, dirPath)
          if (fs.existsSync(fullPath)) {
            const files = this.getLocaleFilesFromDirectory(fullPath)
            localeFiles.push(...files)
          }
        }
      }
    }

    console.warn(`Found ${localeFiles.length} locale files`)

    // 按语言分组
    const localeGroups: { [locale: string]: LocaleMessage } = {}

    for (const filePath of localeFiles) {
      try {
        const locale = this.extractLocaleFromPath(filePath)
        if (!locale)
          continue

        const messages = await this.parseLocaleFile(filePath)
        if (messages) {
          // 深度合并
          if (!localeGroups[locale]) {
            localeGroups[locale] = {}
          }
          this.deepMerge(localeGroups[locale], messages)

          // 记录键到文件的映射
          this.recordKeyToFileMapping(messages, locale, filePath)
        }
      }
      catch (error) {
        console.warn(`Failed to parse locale file ${filePath}:`, error)
      }
    }

    // 将合并后的语言包存入缓存
    for (const [locale, messages] of Object.entries(localeGroups)) {
      this.localesCache.set(locale, messages)
    }

    console.warn('Loaded locales:', Object.keys(localeGroups))
    console.warn('Total translation keys:', this.allKeysCache.length)
    console.warn('Project locale:', this.projectLocale)
  }

  private getTranslationFromLocale(key: string, locale: string, interpolation?: any): TranslationResult | null {
    const messages = this.localesCache.get(locale)
    if (!messages) {
      return null
    }

    const keys = key.split('.')
    let current: any = messages

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k]
      }
      else {
        return null
      }
    }

    if (typeof current === 'string') {
      const localeKeyMap = this.keyToFileMap.get(locale)
      const location = localeKeyMap?.get(key) || { filePath: '', line: 0 }

      // 解析插值信息
      const interpolationKeys = this.extractInterpolationKeys(current)
      const interpolationType = this.detectInterpolationType(interpolation)

      return {
        value: current,
        filePath: location.filePath,
        line: location.line,
        locale,
        interpolationKeys,
        interpolationType,
      }
    }

    return null
  }

  private getLocaleFilesFromDirectory(dirPath: string): string[] {
    const files: string[] = []

    if (!fs.existsSync(dirPath)) {
      return files
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        files.push(...this.getLocaleFilesFromDirectory(fullPath))
      }
      else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
        files.push(fullPath)
      }
    }

    return files
  }

  private extractLocaleFromPath(filePath: string): string | null {
    // 从文件路径中提取语言标识
    // 支持多种路径格式:
    // - /locales/zh-CN.ts -> zhCN
    // - /locales/lang/zh-CN.ts -> zhCN
    // - /i18n/zh.ts -> zh
    const fileName = path.basename(filePath, path.extname(filePath))

    // 标准化语言代码
    const localeMap: { [key: string]: string } = {
      'zh-CN': 'zhCN',
      'zh-cn': 'zhCN',
      'zh': 'zhCN',
      'en-US': 'en',
      'en-us': 'en',
      'en': 'en',
    }

    return localeMap[fileName] || fileName
  }

  private async parseLocaleFile(filePath: string): Promise<LocaleMessage | null> {
    try {
      // 读取文件内容
      const content = fs.readFileSync(filePath, 'utf-8')

      // 简单的解析方式，适用于标准的 export default 格式
      // 这里可以根据实际需要扩展更复杂的解析逻辑
      const exportMatch = content.match(/export\s+default\s+(\{[\s\S]*?\});?\s*$/m)
      if (!exportMatch) {
        console.warn(`No export default found in ${filePath}`)
        return null
      }

      // 使用 eval 解析对象 (在实际应用中可能需要更安全的解析方式)
      // 替换模板字符串为普通字符串，避免解析错误
      let objectStr = exportMatch[1]
      objectStr = objectStr.replace(/`([^`]*)`/g, '"$1"')

      const messages = eval(`(${objectStr})`)
      return messages
    }
    catch (error) {
      console.warn(`Failed to parse ${filePath}:`, error)
      return null
    }
  }

  private deepMerge(target: LocaleMessage, source: LocaleMessage): void {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {}
          }
          this.deepMerge(target[key] as LocaleMessage, source[key] as LocaleMessage)
        }
        else {
          target[key] = source[key]
        }
      }
    }
  }

  private recordKeyToFileMapping(messages: LocaleMessage, locale: string, filePath: string, prefix = ''): void {
    if (!this.keyToFileMap.has(locale)) {
      this.keyToFileMap.set(locale, new Map())
    }

    const localeKeyMap = this.keyToFileMap.get(locale)!

    for (const key in messages) {
      if (messages.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key

        if (typeof messages[key] === 'string') {
          localeKeyMap.set(fullKey, { filePath, line: 1 }) // 简化的行号，实际可以通过解析获得准确行号
          if (!this.allKeysCache.includes(fullKey)) {
            this.allKeysCache.push(fullKey)
          }
        }
        else if (typeof messages[key] === 'object' && messages[key] !== null) {
          this.recordKeyToFileMapping(messages[key] as LocaleMessage, locale, filePath, fullKey)
        }
      }
    }
  }

  private extractInterpolationKeys(template: string): string[] {
    const keys: string[] = []

    // 匹配 {{key}} 格式
    const braceMatches = template.match(/\{\{([^}]+)\}\}/g)
    if (braceMatches) {
      keys.push(...braceMatches.map(match => match.replace(/[{}]/g, '').trim()))
    }

    // 匹配 {key} 格式
    const singleBraceMatches = template.match(/\{([^}]+)\}/g)
    if (singleBraceMatches) {
      keys.push(...singleBraceMatches.map(match => match.replace(/[{}]/g, '').trim()))
    }

    // 匹配 {0}, {1} 等数字格式
    const numberMatches = template.match(/\{\d+\}/g)
    if (numberMatches) {
      keys.push(...numberMatches.map(match => match.replace(/[{}]/g, '').trim()))
    }

    return [...new Set(keys)] // 去重
  }

  private detectInterpolationType(interpolation?: any): 'object' | 'array' | 'rest' | 'none' {
    if (!interpolation)
      return 'none'
    if (Array.isArray(interpolation))
      return 'array'
    if (typeof interpolation === 'object')
      return 'object'
    return 'rest' // 假设是剩余参数
  }

  private async detectProjectLocale(): Promise<void> {
    try {
      // 尝试从项目配置文件中检测语言
      const workspaceFolders = vscode.workspace.workspaceFolders
      if (!workspaceFolders)
        return

      const rootPath = workspaceFolders[0].uri.fsPath

      // 检查 package.json 中的语言配置
      const packageJsonPath = path.join(rootPath, 'package.json')
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
        if (packageJson.locale) {
          this.projectLocale = packageJson.locale
          return
        }
      }

      // 检查 Vue 项目的 vue.config.js 或 vite.config.ts
      const configFiles = ['vue.config.js', 'vite.config.ts', 'vite.config.js']
      for (const configFile of configFiles) {
        const configPath = path.join(rootPath, configFile)
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, 'utf-8')
          const localeMatch = content.match(/locale:\s*['"`]([^'"`]+)['"`]/)
          if (localeMatch) {
            this.projectLocale = localeMatch[1]
            console.warn(`Detected project locale: ${this.projectLocale}`)
            return
          }
        }
      }
    }
    catch (error) {
      console.warn('Failed to detect project locale:', error)
    }
  }

  /**
   * 解析 t 函数调用，提取翻译键和插值参数
   */
  public parseInterpolation(text: string): { key: string, interpolation?: any, interpolationType: 'object' | 'array' | 'rest' | 'none' } | null {
    // 匹配 t('key') 或 $t('key') 或 .t('key') 等形式
    const tFunctionRegex = /(?:\$t|\.t|(?:^|[\s({,])t)\s*\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*(.+?))?\s*\)/
    const match = text.match(tFunctionRegex)
    
    if (!match) {
      return null
    }

    const key = match[1]
    const interpolationStr = match[2]

    if (!interpolationStr) {
      return { key, interpolationType: 'none' }
    }

    try {
      // 尝试解析插值参数
      const trimmed = interpolationStr.trim()
      
      // 检测是否是对象格式 { key: value }
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const interpolation = eval(`(${trimmed})`)
        return { key, interpolation, interpolationType: 'object' }
      }
      
      // 检测是否是数组格式 [value1, value2]
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const interpolation = eval(`(${trimmed})`)
        return { key, interpolation, interpolationType: 'array' }
      }
      
      // 其他情况作为剩余参数处理
      return { key, interpolation: trimmed, interpolationType: 'rest' }
    } catch (error) {
      // 解析失败，只返回 key
      return { key, interpolationType: 'none' }
    }
  }

  dispose(): void {
    // 清理资源
    this.localesCache.clear()
    this.keyToFileMap.clear()
    this.allKeysCache = []
  }
}
