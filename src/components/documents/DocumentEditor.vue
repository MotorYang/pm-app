<script setup>
import { ref, watch } from 'vue'
import { Save } from '@icon-park/vue-next'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import { useDocumentsStore } from '@/stores/documents'

const documentsStore = useDocumentsStore()

const localContent = ref('')

// Watch for external content changes (when opening a new document)
watch(() => documentsStore.activeDocumentContent, (newContent) => {
  localContent.value = newContent
}, { immediate: true })

// Debounced update
let updateTimer = null
const handleInput = (event) => {
  localContent.value = event.target.value
  documentsStore.updateContent(event.target.value)

  // Clear existing timer
  if (updateTimer) {
    clearTimeout(updateTimer)
  }

  // Auto-save after 500ms of inactivity
  updateTimer = setTimeout(() => {
    handleSave()
  }, 500)
}

const handleSave = async () => {
  try {
    await documentsStore.saveDocument()
  } catch (e) {
    console.error('Save failed:', e)
  }
}

const handleKeyDown = (event) => {
  // Ctrl+S or Cmd+S to save
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    handleSave()
  }

  // Tab key handling
  if (event.key === 'Tab') {
    event.preventDefault()
    const textarea = event.target
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value

    // Insert tab character
    textarea.value = value.substring(0, start) + '  ' + value.substring(end)
    textarea.selectionStart = textarea.selectionEnd = start + 2

    // Trigger input event
    handleInput({ target: textarea })
  }
}
</script>

<template>
  <div class="document-editor">
    <div class="editor-header">
      <div class="editor-info">
        <span v-if="documentsStore.activeDocument" class="editor-title">
          {{ documentsStore.activeDocument.title }}.md
        </span>
        <span v-else class="editor-placeholder">
          选择一个文档开始编辑
        </span>
        <span v-if="documentsStore.hasUnsavedChanges" class="unsaved-badge">
          未保存
        </span>
      </div>

      <CartoonButton
        v-if="documentsStore.activeDocument"
        variant="primary"
        size="sm"
        :loading="documentsStore.saving"
        :disabled="!documentsStore.hasUnsavedChanges"
        @click="handleSave"
      >
        <Save :size="16" theme="outline" />
        保存
      </CartoonButton>
    </div>

    <textarea
      v-if="documentsStore.activeDocument"
      :value="localContent"
      @input="handleInput"
      @keydown="handleKeyDown"
      class="editor-textarea"
      placeholder="开始输入 Markdown..."
      spellcheck="false"
    ></textarea>

    <div v-else class="editor-empty">
      <p>请从左侧选择一个文档开始编辑</p>
    </div>
  </div>
</template>

<style scoped>
.document-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-primary);
}

.editor-header {
  padding: var(--spacing-md);
  border-bottom: var(--border-width) solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  background-color: var(--color-bg-secondary);
}

.editor-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
}

.editor-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.editor-placeholder {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.unsaved-badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-warning);
  color: white;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.editor-textarea {
  flex: 1;
  padding: var(--spacing-lg);
  border: none;
  outline: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', 'Courier New', 'Microsoft YaHei', '微软雅黑', monospace;
  font-size: 16px;
  line-height: 1.8;
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  tab-size: 2;
  letter-spacing: 0.02em;
}

.editor-textarea::placeholder {
  color: var(--color-text-tertiary);
}

.editor-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
}
</style>
