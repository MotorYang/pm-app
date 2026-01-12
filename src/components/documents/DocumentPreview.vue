<script setup>
import { computed, nextTick, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import { useDocumentsStore } from '@/stores/documents'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'

const documentsStore = useDocumentsStore()

// 自定义渲染器，为代码块添加语言标签和复制按钮
const renderer = new marked.Renderer()
const originalCodeRenderer = renderer.code.bind(renderer)

renderer.code = function(code, language) {
  const validLanguage = language && hljs.getLanguage(language) ? language : 'plaintext'
  const highlighted = hljs.highlight(code, { language: validLanguage }).value

  const languageLabel = validLanguage !== 'plaintext' ? validLanguage : ''

  return `
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-language">${languageLabel}</span>
        <button class="copy-button" data-code="${encodeURIComponent(code)}">
          <svg class="copy-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5.5 2.5h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M3.5 5.5h-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-1" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
          <span class="copy-text">复制</span>
          <span class="copied-text">已复制!</span>
        </button>
      </div>
      <pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>
    </div>
  `
}

// Store for converting image paths
const imagePathCache = new Map()

// Custom image renderer to handle local image paths
renderer.image = function(href, title, text) {
  // If it's a relative path starting with 'images/', convert it to absolute path
  if (href.startsWith('images/') && documentsStore.activeDocumentId) {
    // We'll need to get the document directory path
    // For now, mark it for later processing
    const imageKey = `${documentsStore.activeDocumentId}_${href}`

    return `<img src="${href}" alt="${text}" title="${title || ''}" data-local-image="${imageKey}" />`
  }

  return `<img src="${href}" alt="${text}" title="${title || ''}" />`
}

// Configure marked
marked.setOptions({
  renderer: renderer,
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false
})

const renderedHtml = computed(() => {
  if (!documentsStore.activeDocumentContent) {
    return ''
  }

  try {
    const rawHtml = marked.parse(documentsStore.activeDocumentContent)
    return DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ['data-code'] // 允许 data-code 属性
    })
  } catch (e) {
    console.error('Markdown parsing error:', e)
    return `<p class="error">解析错误: ${e.message}</p>`
  }
})

// 处理复制按钮点击事件
const handleCopyClick = (event) => {
  const button = event.target.closest('.copy-button')
  if (!button) return

  const encodedCode = button.getAttribute('data-code')
  const code = decodeURIComponent(encodedCode)

  navigator.clipboard.writeText(code).then(() => {
    button.classList.add('copied')
    setTimeout(() => {
      button.classList.remove('copied')
    }, 2000)
  }).catch(err => {
    console.error('复制失败:', err)
  })
}

// Convert local image paths to Tauri accessible URLs
const convertLocalImages = async () => {
  await nextTick()
  const previewContent = document.querySelector('.preview-content')
  if (!previewContent || !documentsStore.activeDocumentId) return

  const images = previewContent.querySelectorAll('img[data-local-image]')

  for (const img of images) {
    const href = img.getAttribute('src')
    if (href && href.startsWith('images/')) {
      try {
        // Get the document's images directory path
        const imagesPath = await invoke('get_document_images_path', {
          docId: documentsStore.activeDocumentId
        })

        // Build full path to image using Tauri's path API for cross-platform support
        const filename = href.substring(7) // Remove 'images/' prefix
        const fullPath = await join(imagesPath, filename)

        // Convert to Tauri accessible URL
        const assetUrl = convertFileSrc(fullPath)

        img.src = assetUrl
      } catch (error) {
        console.error('Failed to convert image path:', error)
      }
    }
  }
}

// 监听内容变化，绑定复制事件和转换图片路径
watch(renderedHtml, async () => {
  await nextTick()
  const previewContent = document.querySelector('.preview-content')
  if (previewContent) {
    previewContent.addEventListener('click', handleCopyClick)
  }

  // Convert local image paths
  await convertLocalImages()
}, { immediate: true })
</script>

<template>
  <div class="document-preview">
    <div class="preview-header">
      <span class="preview-title">预览</span>
    </div>

    <div v-if="documentsStore.activeDocument" class="preview-content">
      <div
          class="markdown-body"
          v-html="renderedHtml"
      ></div>
    </div>

    <div v-else class="preview-empty">
      <p>选择一个文档查看预览</p>
    </div>
  </div>
</template>

<style scoped>
/* ---------------------- */
/* Markdown Preview Styles */
/* ---------------------- */

.document-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-primary);
}

.preview-header {
  height: 48px;
  padding-left: var(--spacing-md);
  border-bottom: var(--border-width) solid var(--color-border);
  background-color: var(--color-bg-secondary);
}

.preview-title {
  font-size: var(--font-size-md);
  line-height: 48px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xl);
  background-color: #ffffff;
  transition: background-color 0.3s ease;
}

.preview-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
}

/* ---------------------- */
/* Markdown Body Styling  */
/* ---------------------- */
.markdown-body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial,
  "Microsoft YaHei", "微软雅黑", sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  font-size: 16px;
  line-height: 1.8;
  word-wrap: break-word;
  box-sizing: border-box;
  min-width: 200px;
  max-width: 100%;
  margin: 0 auto;
  color: #24292e;
}

/* Headings */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0.02em;
}

.markdown-body :deep(h1) {
  font-size: 2em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
}

.markdown-body :deep(h2) {
  font-size: 1.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
}

.markdown-body :deep(h3) { font-size: 1.25em; }

/* Paragraph */
.markdown-body :deep(p) {
  margin: 0 0 16px;
  line-height: 1.8;
}

/* ---------------------- */
/* Code Block Wrapper     */
/* ---------------------- */
.markdown-body :deep(.code-block-wrapper) {
  position: relative;
  margin-bottom: 16px;
  border-radius: 6px;
  background-color: #f6f8fa;
  border: 1px solid #d0d7de;
  overflow: hidden;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.markdown-body :deep(.code-block-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #f6f8fa;
  border-bottom: 1px solid #d0d7de;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.markdown-body :deep(.code-language) {
  font-size: 12px;
  font-weight: 600;
  color: #57606a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.markdown-body :deep(.copy-button) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background-color: transparent;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  color: #24292f;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.markdown-body :deep(.copy-button:hover) {
  background-color: #f3f4f6;
  border-color: #1f2328;
}

.markdown-body :deep(.copy-button:active) {
  transform: scale(0.95);
}

.markdown-body :deep(.copy-icon) {
  width: 14px;
  height: 14px;
}

.markdown-body :deep(.copied-text) {
  display: none;
  color: #1a7f37;
  font-weight: 600;
}

.markdown-body :deep(.copy-button.copied .copy-text) {
  display: none;
}

.markdown-body :deep(.copy-button.copied .copied-text) {
  display: inline;
}

.markdown-body :deep(.copy-button.copied) {
  background-color: #dafbe1;
  border-color: #1a7f37;
  color: #1a7f37;
}

.markdown-body :deep(.code-block-wrapper pre) {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  background-color: transparent;
  border: none;
}

.markdown-body :deep(.code-block-wrapper code) {
  font-family: 'SF Mono', 'Consolas', 'Monaco', 'Courier New', 'JetBrains Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  padding: 0;
  background-color: transparent;
  border-radius: 0;
}

/* ---------------------- */
/* Inline Code            */
/* ---------------------- */
.markdown-body :deep(code) {
  font-family: 'SF Mono', 'Consolas', 'Monaco', 'Courier New', 'JetBrains Mono', monospace;
  font-size: 0.9em;
  padding: 0.2em 0.4em;
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 3px;
  transition: background-color 0.3s ease;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background-color: transparent;
}

/* ---------------------- */
/* Syntax Highlighting    */
/* ---------------------- */
.markdown-body :deep(.hljs) {
  display: block;
  overflow-x: auto;
  color: #24292e;
  background: transparent;
}

.markdown-body :deep(.hljs-comment),
.markdown-body :deep(.hljs-quote) {
  color: #6a737d;
  font-style: italic;
}

.markdown-body :deep(.hljs-keyword),
.markdown-body :deep(.hljs-selector-tag),
.markdown-body :deep(.hljs-literal),
.markdown-body :deep(.hljs-section),
.markdown-body :deep(.hljs-link) {
  color: #d73a49;
}

.markdown-body :deep(.hljs-function .hljs-keyword) {
  color: #d73a49;
}

.markdown-body :deep(.hljs-subst) {
  color: #24292e;
}

.markdown-body :deep(.hljs-string),
.markdown-body :deep(.hljs-title),
.markdown-body :deep(.hljs-name),
.markdown-body :deep(.hljs-type),
.markdown-body :deep(.hljs-attribute),
.markdown-body :deep(.hljs-symbol),
.markdown-body :deep(.hljs-bullet),
.markdown-body :deep(.hljs-addition),
.markdown-body :deep(.hljs-variable),
.markdown-body :deep(.hljs-template-tag),
.markdown-body :deep(.hljs-template-variable) {
  color: #032f62;
}

.markdown-body :deep(.hljs-doctag) {
  color: #22863a;
}

.markdown-body :deep(.hljs-number) {
  color: #005cc5;
}

.markdown-body :deep(.hljs-built_in),
.markdown-body :deep(.hljs-builtin-name),
.markdown-body :deep(.hljs-params),
.markdown-body :deep(.hljs-meta),
.markdown-body :deep(.hljs-class .hljs-title) {
  color: #6f42c1;
}

.markdown-body :deep(.hljs-attr) {
  color: #005cc5;
}

.markdown-body :deep(.hljs-tag) {
  color: #22863a;
}

.markdown-body :deep(.hljs-deletion) {
  color: #b31d28;
  background-color: #ffeef0;
}

.markdown-body :deep(.hljs-emphasis) {
  font-style: italic;
}

.markdown-body :deep(.hljs-strong) {
  font-weight: bold;
}

/* ---------------------- */
/* Lists */
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 2em;
  margin: 0 0 16px;
}

.markdown-body :deep(li) {
  margin: 0.25em 0;
  line-height: 1.8;
}

.markdown-body :deep(li > p) {
  margin-bottom: 0.5em;
}

/* Blockquote */
.markdown-body :deep(blockquote) {
  padding: 0 1em;
  color: #57606a;
  border-left: 0.25em solid #d0d7de;
  margin: 0 0 16px 0;
}

/* Table */
.markdown-body :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  display: block;
  width: max-content;
  max-width: 100%;
  overflow: auto;
  margin: 0 0 16px;
}

.markdown-body :deep(table th),
.markdown-body :deep(table td) {
  padding: 6px 13px;
  border: 1px solid #d0d7de;
}

.markdown-body :deep(table th) {
  font-weight: 600;
  background-color: #f6f8fa;
}

.markdown-body :deep(table tr) {
  background-color: #ffffff;
  border-top: 1px solid hsla(210,18%,87%,1);
}

.markdown-body :deep(table tr:nth-child(2n)) {
  background-color: #f6f8fa;
}

/* Images */
.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 6px;
  background-color: #ffffff;
}

/* Horizontal rule */
.markdown-body :deep(hr) {
  height: 0.25em;
  margin: 24px 0;
  background-color: #d0d7de;
  border: 0;
}

/* Links */
.markdown-body :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

/* Error messages */
.error {
  color: #d1242f;
  padding: 16px;
  background-color: #fff1f0;
  border: 1px solid #ffa39e;
  border-radius: 6px;
  margin: 16px 0;
}

/* ---------------------- */
/* Dark Mode Overrides    */
/* ---------------------- */
[data-theme="dark"] .preview-content {
  background-color: #0d1117;
}

[data-theme="dark"] .markdown-body {
  color: #c9d1d9;
}

[data-theme="dark"] .markdown-body :deep(h1),
[data-theme="dark"] .markdown-body :deep(h2) {
  border-bottom-color: #21262d;
}

/* Dark mode code blocks */
[data-theme="dark"] .markdown-body :deep(.code-block-wrapper) {
  background-color: #161b22;
  border-color: #30363d;
}

[data-theme="dark"] .markdown-body :deep(.code-block-header) {
  background-color: #161b22;
  border-bottom-color: #30363d;
}

[data-theme="dark"] .markdown-body :deep(.code-language) {
  color: #8b949e;
}

[data-theme="dark"] .markdown-body :deep(.copy-button) {
  color: #c9d1d9;
  border-color: #30363d;
}

[data-theme="dark"] .markdown-body :deep(.copy-button:hover) {
  background-color: #21262d;
  border-color: #8b949e;
}

[data-theme="dark"] .markdown-body :deep(.copy-button.copied) {
  background-color: #0d3818;
  border-color: #238636;
  color: #3fb950;
}

[data-theme="dark"] .markdown-body :deep(code) {
  background-color: rgba(110,118,129,0.4);
}

/* Dark mode syntax highlighting */
[data-theme="dark"] .markdown-body :deep(.hljs) {
  color: #c9d1d9;
}

[data-theme="dark"] .markdown-body :deep(.hljs-comment),
[data-theme="dark"] .markdown-body :deep(.hljs-quote) {
  color: #8b949e;
}

[data-theme="dark"] .markdown-body :deep(.hljs-keyword),
[data-theme="dark"] .markdown-body :deep(.hljs-selector-tag),
[data-theme="dark"] .markdown-body :deep(.hljs-literal),
[data-theme="dark"] .markdown-body :deep(.hljs-section),
[data-theme="dark"] .markdown-body :deep(.hljs-link) {
  color: #ff7b72;
}

[data-theme="dark"] .markdown-body :deep(.hljs-string),
[data-theme="dark"] .markdown-body :deep(.hljs-title),
[data-theme="dark"] .markdown-body :deep(.hljs-name),
[data-theme="dark"] .markdown-body :deep(.hljs-type),
[data-theme="dark"] .markdown-body :deep(.hljs-attribute),
[data-theme="dark"] .markdown-body :deep(.hljs-symbol),
[data-theme="dark"] .markdown-body :deep(.hljs-bullet),
[data-theme="dark"] .markdown-body :deep(.hljs-addition),
[data-theme="dark"] .markdown-body :deep(.hljs-variable),
[data-theme="dark"] .markdown-body :deep(.hljs-template-tag),
[data-theme="dark"] .markdown-body :deep(.hljs-template-variable) {
  color: #a5d6ff;
}

[data-theme="dark"] .markdown-body :deep(.hljs-doctag) {
  color: #7ee787;
}

[data-theme="dark"] .markdown-body :deep(.hljs-number) {
  color: #79c0ff;
}

[data-theme="dark"] .markdown-body :deep(.hljs-built_in),
[data-theme="dark"] .markdown-body :deep(.hljs-builtin-name),
[data-theme="dark"] .markdown-body :deep(.hljs-params),
[data-theme="dark"] .markdown-body :deep(.hljs-meta),
[data-theme="dark"] .markdown-body :deep(.hljs-class .hljs-title) {
  color: #d2a8ff;
}

[data-theme="dark"] .markdown-body :deep(.hljs-attr) {
  color: #79c0ff;
}

[data-theme="dark"] .markdown-body :deep(.hljs-tag) {
  color: #7ee787;
}

[data-theme="dark"] .markdown-body :deep(.hljs-deletion) {
  color: #ffa198;
  background-color: #490202;
}

/* Dark mode tables */
[data-theme="dark"] .markdown-body :deep(table th),
[data-theme="dark"] .markdown-body :deep(table td) {
  border-color: #30363d;
}

[data-theme="dark"] .markdown-body :deep(table th) {
  background-color: #161b22;
}

[data-theme="dark"] .markdown-body :deep(table tr) {
  background-color: #0d1117;
  border-top-color: #21262d;
}

[data-theme="dark"] .markdown-body :deep(table tr:nth-child(2n)) {
  background-color: #161b22;
}

[data-theme="dark"] .markdown-body :deep(hr) {
  background-color: #21262d;
}

[data-theme="dark"] .markdown-body :deep(blockquote) {
  color: #8b949e;
  border-left-color: #3b434b;
}

[data-theme="dark"] .markdown-body :deep(a) {
  color: #58a6ff;
}

[data-theme="dark"] .markdown-body :deep(img) {
  background-color: #0d1117;
}

[data-theme="dark"] .error {
  color: #ff7b72;
  background-color: #490202;
  border-color: #f85149;
}
</style>