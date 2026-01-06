<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import 'github-markdown-css/github-markdown-light.css'
import 'highlight.js/styles/github.css'
import { useDocumentsStore } from '@/stores/documents'

const documentsStore = useDocumentsStore()

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (e) {
        console.error('Highlight error:', e)
      }
    }
    return hljs.highlightAuto(code).value
  },
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
    return DOMPurify.sanitize(rawHtml)
  } catch (e) {
    console.error('Markdown parsing error:', e)
    return `<p class="error">解析错误: ${e.message}</p>`
  }
})
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
.document-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-primary);
}

.preview-header {
  padding: var(--spacing-md);
  border-bottom: var(--border-width) solid var(--color-border);
  background-color: var(--color-bg-secondary);
}

.preview-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xl);
  background-color: #ffffff;
}

.preview-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
}

/* Override some github-markdown-css styles for better Chinese display */
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
}

/* Better spacing for Chinese text */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0.02em;
}

.markdown-body h1 {
  font-size: 2em;
  padding-bottom: 0.3em;
}

.markdown-body h2 {
  font-size: 1.5em;
  padding-bottom: 0.3em;
}

.markdown-body h3 {
  font-size: 1.25em;
}

.markdown-body p {
  margin-top: 0;
  margin-bottom: 16px;
  line-height: 1.8;
}

/* Better code block styling */
.markdown-body pre {
  padding: 16px;
  overflow: auto;
  font-size: 14px;
  line-height: 1.6;
  background-color: #f6f8fa;
  border-radius: 6px;
  margin-bottom: 16px;
}

.markdown-body code {
  font-family: 'Consolas', 'Monaco', 'Courier New', 'JetBrains Mono', monospace;
  font-size: 0.9em;
  padding: 0.2em 0.4em;
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 6px;
}

.markdown-body pre code {
  padding: 0;
  background-color: transparent;
  border-radius: 0;
  font-size: 100%;
  line-height: inherit;
}

/* Better list styling for Chinese */
.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-body li {
  margin-top: 0.25em;
  margin-bottom: 0.25em;
  line-height: 1.8;
}

.markdown-body li > p {
  margin-bottom: 0.5em;
}

/* Better blockquote styling */
.markdown-body blockquote {
  padding: 0 1em;
  color: #57606a;
  border-left: 0.25em solid #d0d7de;
  margin: 0 0 16px 0;
}

.markdown-body blockquote > :first-child {
  margin-top: 0;
}

.markdown-body blockquote > :last-child {
  margin-bottom: 0;
}

/* Table styling */
.markdown-body table {
  border-spacing: 0;
  border-collapse: collapse;
  margin-top: 0;
  margin-bottom: 16px;
  display: block;
  width: max-content;
  max-width: 100%;
  overflow: auto;
}

.markdown-body table th,
.markdown-body table td {
  padding: 6px 13px;
  border: 1px solid #d0d7de;
}

.markdown-body table th {
  font-weight: 600;
  background-color: #f6f8fa;
}

.markdown-body table tr {
  background-color: #ffffff;
  border-top: 1px solid hsla(210, 18%, 87%, 1);
}

.markdown-body table tr:nth-child(2n) {
  background-color: #f6f8fa;
}

/* Image styling */
.markdown-body img {
  max-width: 100%;
  box-sizing: content-box;
  background-color: #ffffff;
  border-radius: 6px;
}

/* Horizontal rule */
.markdown-body hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #d0d7de;
  border: 0;
}

/* Task list styling */
.markdown-body .task-list-item {
  list-style-type: none;
}

.markdown-body .task-list-item input {
  margin: 0 0.2em 0.25em -1.6em;
  vertical-align: middle;
}

/* Error message styling */
.error {
  color: #d1242f;
  padding: 16px;
  background-color: #fff1f0;
  border: 1px solid #ffa39e;
  border-radius: 6px;
  margin: 16px 0;
}

/* Dark theme support */
[data-theme="dark"] .preview-content {
  background-color: #0d1117;
}

[data-theme="dark"] .markdown-body {
  color: #c9d1d9;
}

[data-theme="dark"] .markdown-body h1,
[data-theme="dark"] .markdown-body h2 {
  border-bottom-color: #21262d;
}

[data-theme="dark"] .markdown-body pre {
  background-color: #161b22;
}

[data-theme="dark"] .markdown-body code {
  background-color: rgba(110, 118, 129, 0.4);
}

[data-theme="dark"] .markdown-body table th,
[data-theme="dark"] .markdown-body table td {
  border-color: #30363d;
}

[data-theme="dark"] .markdown-body table th {
  background-color: #161b22;
}

[data-theme="dark"] .markdown-body table tr {
  background-color: #0d1117;
  border-top-color: #21262d;
}

[data-theme="dark"] .markdown-body table tr:nth-child(2n) {
  background-color: #161b22;
}

[data-theme="dark"] .markdown-body hr {
  background-color: #21262d;
}

[data-theme="dark"] .markdown-body blockquote {
  color: #8b949e;
  border-left-color: #3b434b;
}
</style>
