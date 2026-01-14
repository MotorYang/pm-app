<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { convertFileSrc, invoke } from '@tauri-apps/api/core'

// CodeMirror
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { java } from '@codemirror/lang-java'
import { python } from '@codemirror/lang-python'

const props = defineProps({
  textDocument: Object // { path, project_id, language? }
})

const editorContainer = ref(null)
let editorView = null

const loading = ref(false)
const error = ref(null)
const codeContent = ref('')

const theme = ref('dark')       // 默认深色主题
const language = ref('')         // 自动检测
const isEditable = ref(true)     // 默认可编辑

// --- PM-App 主题系统 ---
const darkTheme = EditorView.theme({
  "&": { color: "var(--color-text-primary)", backgroundColor: "var(--color-bg-primary)" },
  ".cm-content": { caretColor: "var(--color-text-primary)" },
  ".cm-gutters": { backgroundColor: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", border: "none" },
  ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.05)" },
  ".cm-selectionBackground, .cm-content ::selection": { backgroundColor: "rgba(255,255,255,0.2)" },
  ".cm-scroller": { overflow: "auto" }
})

const lightTheme = EditorView.theme({
  "&": { color: "var(--color-text-primary)", backgroundColor: "var(--color-bg-primary)" },
  ".cm-content": { caretColor: "var(--color-text-primary)" },
  ".cm-gutters": { backgroundColor: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", border: "none" },
  ".cm-activeLine": { backgroundColor: "rgba(0,0,0,0.05)" },
  ".cm-selectionBackground, .cm-content ::selection": { backgroundColor: "rgba(0,0,0,0.2)" },
  ".cm-scroller": { overflow: "auto" }
})

// 根据语言选择 CodeMirror 扩展
function getLanguageExtension(lang) {
  switch (lang) {
    case 'js': return javascript()
    case 'python': return python()
    case 'java': return java()
    default: return [] // 普通文本
  }
}

// 主题扩展
const themeExtension = computed(() => theme.value === 'dark' ? darkTheme : lightTheme)

// 根据文件扩展名自动识别语言
function detectLanguage(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'js') return 'js'
  if (ext === 'py') return 'python'
  if (ext === 'java') return 'java'
  return 'plain' // 普通文本
}

// 加载文本文件
async function loadText() {
  loading.value = true
  error.value = null

  try {
    if (!props.textDocument?.path || !props.textDocument?.project_id) {
      throw new Error('文档信息不完整')
    }

    const absFilePath = await invoke('get_file_absolute_path', {
      projectId: props.textDocument.project_id,
      relativePath: props.textDocument.path
    })

    const fileUrl = convertFileSrc(absFilePath)
    const res = await fetch(fileUrl)
    if (!res.ok) throw new Error(`无法读取文件: ${res.statusText}`)
    codeContent.value = await res.text()

    language.value = props.textDocument.language || detectLanguage(props.textDocument.path)

    // 初始化或刷新 CodeMirror
    if (editorContainer.value) {
      if (editorView) editorView.destroy()
      editorView = new EditorView({
        doc: codeContent.value,
        extensions: [
          basicSetup,
          getLanguageExtension(language.value),
          themeExtension.value,
          EditorView.editable.of(isEditable.value)
        ],
        parent: editorContainer.value
      })
    }
  } catch (err) {
    console.error(err)
    error.value = `系统错误: ${err.message || err}`
  } finally {
    loading.value = false
  }
}

onMounted(() => loadText())
watch(() => props.textDocument, () => loadText(), { deep: true })
</script>

<template>
  <div class="text-preview-root">
    <div v-if="loading" class="text-loading">
      <span>正在加载文本…</span>
    </div>
    <div v-if="error" class="text-error">
      <div class="error-msg">{{ error }}</div>
      <button @click="loadText" class="retry-btn">重试</button>
    </div>
    <div
        v-show="!loading && !error"
        ref="editorContainer"
        class="editor-container"
    />
  </div>
</template>

<style scoped>
.text-preview-root {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  //border-radius: var(--border-radius-md);
  border: var(--border-width) solid var(--color-border);
  overflow: hidden; /* 防止 CodeMirror 滚动超出容器 */
}

.editor-container {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: auto; /* 关键：启用滚动 */
}

.cm-scroller {
  overflow: auto !important; /* 确保 CodeMirror 内部可滚动 */
  height: 100%;
}

.text-loading, .text-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.retry-btn {
  margin-left: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-md);
  border: none;
  border-radius: var(--border-radius-sm);
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  cursor: pointer;
}
</style>
