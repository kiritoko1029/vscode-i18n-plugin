# 安装和使用指南

## 快速开始

### 1. 安装依赖

```bash
cd vscode-i18n-plugin
npm install
```

### 2. 编译插件

```bash
npm run compile
```

### 3. 开发模式

```bash
# 监听文件变化，自动编译
npm run watch
```

### 4. 调试插件

1. 在 VSCode 中打开 `vscode-i18n-plugin` 文件夹
2. 按 `F5` 启动调试 (会打开一个新的 VSCode 窗口)
3. 在新窗口中打开您的 MPlatform 项目
4. 测试插件功能

## 打包发布

### 1. 安装 vsce

```bash
npm install -g vsce
```

### 2. 打包插件

```bash
vsce package
```

这会生成一个 `.vsix` 文件。

### 3. 安装到 VSCode

```bash
code --install-extension mplat-i18n-support-0.1.0.vsix
```

或者在 VSCode 中：
1. 打开扩展面板
2. 点击 "..." 菜单
3. 选择 "Install from VSIX..."
4. 选择生成的 `.vsix` 文件

## 使用说明

### 配置项目

在您的项目 `.vscode/settings.json` 中添加配置：

```json
{
  "mplat-i18n.localesPath": "packages/shared/src/i18n/locales/lang",
  "mplat-i18n.defaultLocale": "zhCN",
  "mplat-i18n.fallbackLocale": "en"
}
```

### 功能演示

#### 1. Hover 提示
```typescript
// 将鼠标悬停在 t() 函数上
const message = i18n.t('mplat.logout')
// 会显示：退出登录
```

#### 2. Go to Definition
```typescript
// 按住 Ctrl 点击翻译键，或按 F12
i18n.t('mplat.logout') // 跳转到语言包文件
```

#### 3. 自动补全
```typescript
// 在引号内输入，会显示可用的翻译键
i18n.t('mpl') // 自动提示 mplat.logout 等
```

#### 4. 插值支持
```typescript
// 对象插值
i18n.t('welcome', { name: 'John' })

// 数组插值
i18n.t('message', ['arg1', 'arg2'])

// 剩余参数
i18n.t('text', 'arg1', 'arg2')
```

## 故障排除

### 插件不工作

1. 确保项目中有正确的语言包文件
2. 检查配置路径是否正确
3. 重启 VSCode
4. 查看输出面板的错误信息

### 翻译不显示

1. 检查语言包文件格式是否正确
2. 确保翻译键存在
3. 检查文件路径配置

### 跳转不工作

1. 确保语言包文件存在
2. 检查文件权限
3. 验证翻译键是否正确

## 开发贡献

### 项目结构

```
vscode-i18n-plugin/
├── src/
│   ├── extension.ts          # 主入口
│   ├── services/
│   │   └── i18nService.ts   # I18n 服务
│   └── providers/
│       ├── hoverProvider.ts      # Hover 提供程序
│       ├── definitionProvider.ts # 定义提供程序
│       └── completionProvider.ts # 补全提供程序
├── package.json             # 插件配置
└── tsconfig.json           # TypeScript 配置
```

### 添加新功能

1. 在相应的 provider 中添加功能
2. 在 `extension.ts` 中注册新的 provider
3. 更新 `package.json` 中的配置
4. 编写测试用例
5. 更新文档

## 技术细节

### 支持的语法

- `i18n.t('key')`
- `i18n.t("key")`
- `i18n.t(\`key\`)`
- `$t('key')` (Vue 模板中)
- 各种插值格式

### 文件监听

插件会自动监听语言包文件的变化，无需手动刷新。

### 缓存机制

为了提高性能，插件会缓存语言包数据，在文件变化时自动更新。
