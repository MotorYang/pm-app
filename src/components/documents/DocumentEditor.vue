<script setup>
import { ref, watch } from 'vue'
import { Save } from '@icon-park/vue-next'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import MarkdownToolbar from './MarkdownToolbar.vue'
import { useDocumentsStore } from '@/stores/documents'
import { useProjectsStore } from '@/stores/projects'
import { useSettingsStore } from '@/stores/settings'
import { invoke } from '@tauri-apps/api/core'

const documentsStore = useDocumentsStore()
const projectsStore = useProjectsStore()
const settingsStore = useSettingsStore()

const localContent = ref('')
const textareaRef = ref(null)
const uploadingImage = ref(false)

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

// Handle toolbar markdown insertion
const handleToolbarInsert = (tool) => {
  if (!textareaRef.value) return

  const textarea = textareaRef.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = textarea.value.substring(start, end)
  let newText = ''
  let cursorPos = start

  switch (tool.type) {
    case 'wrap':
      // Wrap selected text with syntax (e.g., **bold**)
      newText = tool.syntax + selectedText + tool.syntax
      cursorPos = start + tool.syntax.length
      break

    case 'line-prefix':
      // Add prefix to line (e.g., # Header)
      if (selectedText) {
        newText = tool.syntax + selectedText
      } else {
        newText = tool.syntax
      }
      cursorPos = start + tool.syntax.length
      break

    case 'link':
      // Insert link template
      if (selectedText) {
        newText = `[${selectedText}](url)`
        cursorPos = start + selectedText.length + 3
      } else {
        newText = '[链接文本](url)'
        cursorPos = start + 1
      }
      break

    case 'image':
      // Insert image template
      if (selectedText) {
        newText = `![${selectedText}](url)`
        cursorPos = start + selectedText.length + 4
      } else {
        newText = '![图片描述](url)'
        cursorPos = start + 1
      }
      break

    case 'table':
      // Insert table template (3 columns x 2 rows)
      newText = `| 列1 | 列2 | 列3 |
| --- | --- | --- |
| 内容 | 内容 | 内容 |
| 内容 | 内容 | 内容 |`
      cursorPos = start + 2 // Position cursor at first cell
      break

    default:
      newText = selectedText
  }

  // Replace text
  const before = textarea.value.substring(0, start)
  const after = textarea.value.substring(end)
  textarea.value = before + newText + after

  // Update content
  localContent.value = textarea.value
  documentsStore.updateContent(textarea.value)

  // Set cursor position without scrolling
  textarea.focus({ preventScroll: true })
  textarea.selectionStart = textarea.selectionEnd = cursorPos
}

// Handle image paste
const handlePaste = async (event) => {
  const items = event.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (file) {
        await uploadImage(file)
      }
      break
    }
  }
}

// Handle image drop
const handleDrop = async (event) => {
  event.preventDefault()
  event.stopPropagation()

  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return

  for (const file of files) {
    if (file.type.startsWith('image/')) {
      await uploadImage(file)
      break // Only handle first image
    }
  }
}

const handleDragOver = (event) => {
  event.preventDefault()
  event.stopPropagation()
}

// Upload image to document folder
const uploadImage = async (file) => {
  if (!documentsStore.activeDocumentId) {
    alert('请先选择一个文档')
    return
  }

  uploadingImage.value = true
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const bytes = Array.from(uint8Array)

    // Generate unique filename
    const timestamp = Date.now()
    const ext = file.name.split('.').pop() || 'png'
    const filename = `image_${timestamp}.${ext}`

    const doc = documentsStore.activeDocument
    const projectId = projectsStore.activeProjectId

    if (!doc || !projectId) {
      throw new Error('No active document or project')
    }

    // 获取图片保存位置设置
    const saveLocation = settingsStore.imageAttachmentPath || '.attachments'

    // 获取文档所在的文件夹路径
    const docFolder = doc.folder === '/' ? '' : doc.folder.replace(/^\//, '')

    // 根据设置构建图片保存路径
    let imageRelativePath
    let imagePath

    if (saveLocation === 'same') {
      // 保存到文档同级目录
      imageRelativePath = docFolder ? `${docFolder}/${filename}` : filename
      imagePath = filename
    } else {
      // 保存到子文件夹（.attachments, assets, images 等）
      imageRelativePath = docFolder
        ? `${docFolder}/${saveLocation}/${filename}`
        : `${saveLocation}/${filename}`
      imagePath = `${saveLocation}/${filename}`
    }

    console.log('Saving image to:', imageRelativePath)

    await invoke('write_docvault_binary', {
      projectId: projectId,
      relativePath: imageRelativePath,
      data: bytes
    })

    // Insert markdown image syntax
    insertImageMarkdown(filename, imagePath)
  } catch (error) {
    console.error('Failed to upload image:', error)
    alert('上传图片失败: ' + error)
  } finally {
    uploadingImage.value = false
  }
}

// Insert image markdown at cursor
const insertImageMarkdown = (filename, imagePath) => {
  if (!textareaRef.value) return

  const textarea = textareaRef.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  // 使用传入的 imagePath 构建 markdown
  const markdown = `![${filename}](${imagePath})`

  const before = textarea.value.substring(0, start)
  const after = textarea.value.substring(end)
  textarea.value = before + markdown + after

  // Update content
  localContent.value = textarea.value
  documentsStore.updateContent(textarea.value)

  // Move cursor to end of inserted text
  const newPos = start + markdown.length
  textarea.focus({ preventScroll: true })
  textarea.selectionStart = textarea.selectionEnd = newPos
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
        <span v-if="uploadingImage" class="uploading-badge">
          上传中...
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

    <!-- Markdown Toolbar -->
    <MarkdownToolbar
      v-if="documentsStore.activeDocument"
      @insert="handleToolbarInsert"
    />

    <textarea
      v-if="documentsStore.activeDocument"
      ref="textareaRef"
      :value="localContent"
      @input="handleInput"
      @keydown="handleKeyDown"
      @paste="handlePaste"
      @drop="handleDrop"
      @dragover="handleDragOver"
      class="editor-textarea"
      placeholder="开始输入 Markdown...&#10;提示：可以直接粘贴或拖拽图片到编辑器中"
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
  height: 38px;
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

.uploading-badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-accent);
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
