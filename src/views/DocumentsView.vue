<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import DocumentList from '@/components/documents/DocumentList.vue'
import DocumentSplitView from '@/components/documents/DocumentSplitView.vue'
import PdfViewer from '@/components/documents/PdfViewer.vue'
import ImageViewer from '@/components/documents/ImageViewer.vue'
import FilePreviewer from '@/components/documents/FilePreviewer.vue'
import CartoonModal from '@/components/ui/CartoonModal.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import { useDocumentsStore } from '@/stores/documents'
import { useProjectsStore } from '@/stores/projects'

const documentsStore = useDocumentsStore()
const projectsStore = useProjectsStore()

// 窗口焦点刷新 - 当用户从外部切换回来时刷新文档列表
let lastFocusTime = Date.now()
const REFRESH_COOLDOWN = 2000 // 2秒内不重复刷新

const handleWindowFocus = () => {
  const now = Date.now()
  if (now - lastFocusTime > REFRESH_COOLDOWN && projectsStore.activeProject) {
    console.log('Window focused, refreshing documents...')
    documentsStore.refreshDocuments()
  }
  lastFocusTime = now
}

// 自动识别文档类型
const activeDocType = computed(() => {
  const doc = documentsStore.activeDocument
  if (!doc || !doc.title) return null

  const ext = doc.file_ext?.toLowerCase() || ''
  if (ext === 'md') return 'markdown'
  if (ext === 'pdf') return 'pdf'
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) return 'image'

  // 默认其它为文本 / 代码文件
  return 'text'
})

// Check if the active document is editable (markdown)
const isMarkdown = computed(() => activeDocType.value === 'markdown')
const isPdf = computed(() => activeDocType.value === 'pdf')
const isImage = computed(() => activeDocType.value === 'image')
const isText = computed(() => activeDocType.value === 'text')

const showCreateModal = ref(false)
const newFileName = ref('')
const creating = ref(false)
const createError = ref('')
const createInFolder = ref('/')

onMounted(() => {
  if (projectsStore.activeProject) {
    documentsStore.loadDocuments(projectsStore.activeProject.id)
  }

  // 监听窗口焦点变化
  window.addEventListener('focus', handleWindowFocus)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleWindowFocus()
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('focus', handleWindowFocus)
})

// Watch for active project changes
watch(() => projectsStore.activeProject, (newProject) => {
  if (newProject) {
    documentsStore.loadDocuments(newProject.id)
  } else {
    documentsStore.documents = []
    documentsStore.closeDocument()
  }
})

const handleCreate = (folder = '/') => {
  showCreateModal.value = true
  newFileName.value = ''
  createError.value = ''
  createInFolder.value = folder
}

const handleCreateSubmit = async () => {
  if (!newFileName.value.trim()) {
    createError.value = '请输入文件名'
    return
  }

  creating.value = true
  createError.value = ''

  try {
    await documentsStore.createDocument(projectsStore.activeProject.id, newFileName.value.trim(), createInFolder.value)
    showCreateModal.value = false
    newFileName.value = ''
    createInFolder.value = '/'
  } catch (e) {
    createError.value = e.message || '创建文档失败'
  } finally {
    creating.value = false
  }
}

const handleCloseModal = () => {
  showCreateModal.value = false
  newFileName.value = ''
  createError.value = ''
  createInFolder.value = '/'
}
</script>

<template>
  <div class="documents-view">
    <div class="documents-sidebar">
      <DocumentList @create="handleCreate" />
    </div>

    <div class="documents-main">
      <!-- Empty state -->
      <div v-if="!documentsStore.activeDocument" class="documents-empty">
        <p>请选择或创建一个文档</p>
      </div>

      <!-- Markdown editor with preview -->
      <DocumentSplitView v-else-if="isMarkdown" />

      <!-- PDF viewer -->
      <PdfViewer
          v-else-if="isPdf"
          :pdf-document="documentsStore.activeDocument"
      />

      <!-- Image viewer -->
      <ImageViewer
          v-else-if="isImage"
          :data="documentsStore.activeDocumentBinary"
          :title="documentsStore.activeDocument?.title"
          :ext="documentsStore.activeDocument?.file_ext"
      />

      <!-- 文本 / 代码文件预览 -->
      <FilePreviewer
          v-else-if="isText"
          :text-document="documentsStore.activeDocument"
      />

      <!-- Unknown type fallback -->
      <div v-else class="documents-empty">
        <p>不支持预览此文件类型</p>
      </div>
    </div>

    <CartoonModal
      :open="showCreateModal"
      title="新建文档"
      size="sm"
      @close="handleCloseModal"
    >
      <div class="create-form">
        <div v-if="createInFolder !== '/'" class="target-folder-hint">
          将在 <code>{{ createInFolder }}</code> 下创建
        </div>
        <CartoonInput
          v-model="newFileName"
          label="文件名"
          placeholder="输入文件名 (例如: README.md)"
          required
          @keyup.enter="handleCreateSubmit"
        />

        <div v-if="createError" class="error-message">
          {{ createError }}
        </div>
      </div>

      <template #footer>
        <CartoonButton
          variant="ghost"
          @click="handleCloseModal"
          :disabled="creating"
        >
          取消
        </CartoonButton>
        <CartoonButton
          variant="primary"
          @click="handleCreateSubmit"
          :loading="creating"
          :disabled="creating"
        >
          创建
        </CartoonButton>
      </template>
    </CartoonModal>
  </div>
</template>

<style scoped>
.documents-view {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.documents-sidebar {
  width: 200px;
  height: 100%;
  border-right: var(--border-width) solid var(--color-border);
  flex-shrink: 0;
}

.documents-main {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.documents-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-md);
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.error-message {
  padding: var(--spacing-sm);
  background-color: rgba(255, 71, 87, 0.1);
  border: var(--border-width) solid var(--color-danger);
  border-radius: var(--border-radius-md);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.target-folder-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius-sm);
}

.target-folder-hint code {
  background-color: var(--color-bg-secondary);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  font-family: monospace;
  color: var(--color-primary);
}
</style>
