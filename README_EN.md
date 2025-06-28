# I18n Inline Translation

🌍 **Smart Internationalization Inline Translation Plugin** - Display translation content directly in your code in real-time

[![VSCode Extension](https://img.shields.io/badge/VSCode-Extension-blue.svg)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Languages**: [English](README_EN.md) | [中文](README.md)

## ✨ Core Features

### 🎯 **Inline Translation Display**
- **Real-time Preview**: Display translation content directly in code without switching files
- **Smart Editing**: Automatically switch to edit mode showing original keys when clicking translation content
- **Seamless Experience**: Automatically restore translation display when cursor leaves
- **Multi-language Support**: Automatically detect project language configuration

```typescript
// Edit state: Show original keys
t('user.profile.name')

// Preview state: Show translation content  
t('user.profile.name') → User Name
```

### 🔍 **Smart Code Assistant**
- **Hover Information**: Show complete translation info and parameter details on hover
- **Go to Definition**: Jump to specific location in language pack files with one click
- **Smart Completion**: Provide intelligent suggestions for translation keys while typing
- **Parameter Hints**: Support smart completion and preview for interpolation parameters

### 🚀 **Advanced Features**
- **Multi-framework Support**: Vue, React, Angular, Vanilla JavaScript
- **Flexible Configuration**: Support custom language pack paths and scan rules
- **Performance Optimized**: Reactive architecture based on reactive-vscode
- **Real-time Updates**: Automatically refresh when language pack files change

## 📦 Installation

### Method 1: Manual Installation (Recommended)
1. Download the latest `.vsix` file
2. Open VSCode, press `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`)
3. Type `Extensions: Install from VSIX...`
4. Select the downloaded `.vsix` file
5. Restart VSCode

### Method 2: Command Line Installation
```bash
code --install-extension i18n-inline-translation-0.1.3.vsix
```

## ⚙️ Configuration

### Basic Configuration
Search for `mplat-i18n` in VSCode settings or edit `settings.json`:

```json
{
  "mplat-i18n.autoDiscovery": true,
  "mplat-i18n.defaultLocale": "en",
  "mplat-i18n.fallbackLocale": "en",
  "mplat-i18n.enableInlineTranslation": true,
  "mplat-i18n.enableHover": true,
  "mplat-i18n.enableDefinition": true,
  "mplat-i18n.enableCompletion": true
}
```

### Advanced Configuration
```json
{
  "mplat-i18n.scanPatterns": [
    "src/locales/**/*.{ts,js,json}",
    "src/i18n/**/*.{ts,js,json}",
    "locales/**/*.{ts,js,json}",
    "lang/**/*.{ts,js,json}"
  ],
  "mplat-i18n.manualPaths": [
    "src/assets/i18n",
    "public/locales"
  ]
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoDiscovery` | boolean | `true` | Automatically discover language pack files in project |
| `scanPatterns` | string[] | `["src/locales/**/*.{ts,js}"]` | Language pack file scan patterns |
| `manualPaths` | string[] | `[]` | Manually specified language pack directory paths |
| `defaultLocale` | string | `"zhCN"` | Default display language |
| `fallbackLocale` | string | `"en"` | Fallback language |
| `enableInlineTranslation` | boolean | `false` | Enable inline translation display |
| `enableHover` | boolean | `true` | Enable hover information |
| `enableDefinition` | boolean | `true` | Enable go to definition |
| `enableCompletion` | boolean | `true` | Enable smart completion |

## 🎮 Usage

### Supported File Types
- TypeScript (`.ts`)
- JavaScript (`.js`)  
- Vue (`.vue`)
- JSX/TSX (`.jsx`, `.tsx`)

### Supported Function Formats

#### Vue Projects
```vue
<template>
  <!-- Vue template syntax -->
  <div>{{ $t('welcome.message') }}</div>
  <button>{{ $t('button.submit') }}</button>
</template>

<script setup>
// Composition API
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const message = t('user.profile.title')
const greeting = t('welcome.greeting', { name: 'John' })
</script>
```

#### React Projects
```typescript
import { useTranslation } from 'react-i18next'

function Component() {
  const { t } = useTranslation()
  
  return (
    <div>
      <h1>{t('page.title')}</h1>
      <p>{t('user.description', { count: 5 })}</p>
    </div>
  )
}
```

#### Vanilla JavaScript
```javascript
// Various call methods
i18n.t('menu.home')
this.t('error.network')
translate('success.saved')
$t('loading.please_wait')
```

### Language Pack File Formats

#### TypeScript/JavaScript Format
```typescript
// src/locales/en.ts
export default {
  welcome: {
    message: 'Welcome to our application',
    greeting: 'Hello, {name}!'
  },
  user: {
    profile: {
      title: 'User Profile',
      name: 'Name',
      email: 'Email Address'
    }
  },
  button: {
    submit: 'Submit',
    cancel: 'Cancel',
    save: 'Save'
  }
}
```

#### JSON Format
```json
{
  "welcome": {
    "message": "Welcome to our application",
    "greeting": "Hello, {name}!"
  },
  "user": {
    "profile": {
      "title": "User Profile",
      "name": "Name",
      "email": "Email Address"
    }
  }
}
```

## 🔧 Feature Demonstrations

### 1. Inline Translation Display
When cursor is not on translation keys, display translation content:
```typescript
const title = t('user.profile.title') → User Profile
```

When clicking or editing translation keys, automatically switch to edit mode:
```typescript
const title = t('user.profile.title')  // Show original keys for editing
```

### 2. Smart Completion
When typing `t('user.`, it shows:
- `user.profile.title` → User Profile
- `user.profile.name` → Name  
- `user.profile.email` → Email Address

### 3. Hover Information
Hovering over `t('welcome.greeting', { name: 'John' })` displays:

```
🌍 Translation
📝 Hello, John!

📋 Details  
🔑 Key: welcome.greeting
🌍 Locale: en
🔧 Parameters: name

💡 Usage Example
t('welcome.greeting', { name: 'value' })
```

### 4. Go to Definition
`Ctrl+Click` (macOS: `Cmd+Click`) or press `F12` to jump to the corresponding location in language pack files.

## 🏗️ Supported Project Structures

The plugin supports various common project structures:

```
Project Root/
├── src/
│   ├── locales/           # Recommended structure
│   │   ├── en.ts
│   │   ├── zh-CN.ts
│   │   └── index.ts
│   ├── i18n/              # Alternative structure
│   │   └── lang/
│   └── assets/
│       └── i18n/          # Static resources structure
├── locales/               # Root directory structure
├── lang/                  # Simplified structure
└── public/
    └── locales/           # Public resources structure
```

## 🎨 Custom Configuration Examples

### Vue Project Configuration
```json
{
  "mplat-i18n.scanPatterns": [
    "src/locales/**/*.{ts,js}",
    "src/i18n/lang/**/*.{ts,js}"
  ],
  "mplat-i18n.defaultLocale": "en",
  "mplat-i18n.enableInlineTranslation": true
}
```

### React Project Configuration  
```json
{
  "mplat-i18n.scanPatterns": [
    "src/locales/**/*.{ts,js,json}",
    "public/locales/**/*.json"
  ],
  "mplat-i18n.defaultLocale": "en",
  "mplat-i18n.fallbackLocale": "en"
}
```

### Monorepo Project Configuration
```json
{
  "mplat-i18n.scanPatterns": [
    "packages/*/src/locales/**/*.{ts,js}",
    "packages/*/src/i18n/**/*.{ts,js}",
    "apps/*/src/locales/**/*.{ts,js}"
  ]
}
```

## 🔍 Troubleshooting

### Common Issues

**Q: Why can't I see translation content?**
A: Please check:
1. Is inline translation enabled: `"mplat-i18n.enableInlineTranslation": true`
2. Are language pack paths configured correctly
3. Are language pack file formats supported

**Q: Smart completion doesn't work?**
A: Please confirm:
1. Is the file type supported (`.ts`, `.js`, `.vue`)
2. Are you at the correct function call position (`t('`, `$t('`)
3. Are language packs scanned correctly

**Q: Go to definition fails?**
A: Please check:
1. Do language pack files exist
2. Are keys defined in language packs
3. Are file paths accessible

### Debug Mode
Open VSCode Developer Tools (`Help > Toggle Developer Tools`) to view console output:
```
MPLAT I18n Plugin (Reactive) is now active!
I18n service created successfully
```

## 🚀 Performance Optimization

- **Reactive Architecture**: Based on reactive-vscode, recalculates only when needed
- **Smart Caching**: Language pack content caching reduces file reads
- **Incremental Updates**: Only updates relevant parts when files change
- **Limited Results**: Smart completion limited to 50 items for better performance

## 🛠️ Development

### Local Development
```bash
# Clone project
git clone <repository-url>
cd i18n-inline-translation

# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Package
npx vsce package
```

### Tech Stack
- **TypeScript** - Type-safe development experience
- **reactive-vscode** - Reactive VSCode extension framework
- **Babel** - Code parsing and AST processing

## 📝 Changelog

### v0.1.3
- 🎯 **Major Update**: Implemented smart inline editing based on cursor position
- ✨ **New Feature**: Interaction logic inspired by PNPM Catalog Lens
- 🔧 **Optimization**: Removed click toggle, changed to automatic edit state detection
- 🚀 **Performance**: Simplified state management, improved response speed
- 🐛 **Fix**: Resolved plugin restart unresponsive issue

### v0.1.2  
- 🎨 **Enhanced Completion**: Support fuzzy search and hierarchical matching
- 📝 **Rich Documentation**: Added usage examples and parameter hints
- 🔧 **Extended Support**: Support more translation function formats
- ⚡ **Performance Optimization**: Limited completion results count

### v0.1.1
- ✅ Fixed language pack recognition issues
- ✅ Optimized inline display layout
- ✅ Improved display effects and colors
- ✅ Enhanced language pack scanning

### v0.1.0
- 🎉 Initial release
- 🔍 Hover information feature
- 🎯 Go to definition feature  
- ✨ Inline translation display feature
- 🎨 Smart completion feature

## 🤝 Contributing

Welcome to submit Issues and Pull Requests!

1. Fork the project
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License

## 🙏 Acknowledgments

- [reactive-vscode](https://github.com/KermanX/reactive-vscode) - Reactive VSCode extension framework
- [PNPM Catalog Lens](https://github.com/antfu/vscode-pnpm-catalog-lens) - Inline editing interaction design inspiration

---

**Enjoy smart internationalization development experience!** 🌍✨ 