<script setup>
import { ref, computed } from 'vue'
import {FolderOpen, Plus, Delete, Edit, Text} from '@icon-park/vue-next'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import CartoonModal from '@/components/ui/CartoonModal.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import { useDocumentsStore } from '@/stores/documents'
import { useConfirm } from '@/composables/useConfirm.js'
import { useContextMenu } from '@/composables/useContextMenu'

const documentsStore = useDocumentsStore()
const contextMenu = useContextMenu()
const confirmDialog = useConfirm()
const emit = defineEmits(['create'])

const showRenameModal = ref(false)
const renameDocId = ref(null)
const newDocName = ref('')
const renaming = ref(false)
const renameError = ref('')

// Group documents by folder
const documentsByFolder = computed(() => {
  const folders = {}

  documentsStore.documents.forEach(doc => {
    const folder = doc.folder || '/'
    if (!folders[folder]) {
      folders[folder] = []
    }
    folders[folder].push(doc)
  })

  return Object.keys(folders).sort().reduce((acc, key) => {
    acc[key] = folders[key]
    return acc
  }, {})
})

const handleDocumentClick = (doc) => {
  documentsStore.openDocument(doc.id)
}

const handleCreate = () => {
  emit('create')
}

const handleContextMenu = (doc, event) => {
  const menuItems = [
    {
      label: '重命名',
      icon: Text,
      action: () => handleRename(doc, event)
    },
    { divider: true },
    {
      label: '删除文档',
      icon: Delete,
      danger: true,
      action: () => handleDelete(doc, event)
    }
  ]
  contextMenu.show(event, menuItems)
}

const handleDelete = async (doc, event) => {
  event.stopPropagation()

  const result = await confirmDialog({
    title: '删除文档',
    message: `确定要删除文档"${doc.title}.md"吗？`,
    danger: true,
    confirmText: '删除',
    cancelText: '取消'
  })

  if (result) {
    try {
      await documentsStore.deleteDocument(doc.id)
    } catch (e) {
      alert('删除失败: ' + (e.message || '未知错误'))
    }
  }
}

const handleRename = (doc, event) => {
  event.stopPropagation()
  renameDocId.value = doc.id
  newDocName.value = doc.title
  renameError.value = ''
  showRenameModal.value = true
}

const handleRenameSubmit = async () => {
  if (!newDocName.value.trim()) {
    renameError.value = '请输入新的文档名'
    return
  }

  renaming.value = true
  renameError.value = ''

  try {
    await documentsStore.renameDocument(renameDocId.value, newDocName.value.trim())
    showRenameModal.value = false
    renameDocId.value = null
    newDocName.value = ''
  } catch (e) {
    renameError.value = e.message || '重命名失败'
  } finally {
    renaming.value = false
  }
}

const handleCloseRenameModal = () => {
  showRenameModal.value = false
  renameDocId.value = null
  newDocName.value = ''
  renameError.value = ''
}
</script>

<template>
  <div class="document-list">
    <div class="document-list-header">
      <h3 class="document-list-title">文档</h3>
      <CartoonButton
        variant="primary"
        size="sm"
        @click="handleCreate"
      >
        <Plus :size="16" theme="outline" />
        新建
      </CartoonButton>
    </div>

    <div class="document-list-content">
      <div v-if="documentsStore.loading" class="document-list-loading">
        加载中...
      </div>

      <div v-else-if="documentsStore.documents.length === 0" class="document-list-empty">
        <p>还没有文档</p>
        <p class="empty-hint">点击"新建"创建第一个文档</p>
      </div>

      <div v-else class="folders">
        <div
          v-for="(docs, folder) in documentsByFolder"
          :key="folder"
          class="folder-group"
        >
          <div class="folder-header">
            <FolderOpen :size="16" theme="outline" fill="var(--color-secondary)" />
            <span class="folder-name">{{ folder }}</span>
          </div>

          <div class="folder-documents">
            <div
              v-for="doc in docs"
              :key="doc.id"
              class="document-item"
              :class="{ active: doc.id === documentsStore.activeDocumentId }"
              @click="handleDocumentClick(doc)"
              @contextmenu="handleContextMenu(doc, $event)"
            >
              <span class="document-name">{{ doc.title }}.md</span>
              <span
                v-if="documentsStore.hasUnsavedChanges && doc.id === documentsStore.activeDocumentId"
                class="unsaved-indicator"
              >
                ●
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Rename Modal -->
    <CartoonModal
      :open="showRenameModal"
      title="重命名文档"
      size="sm"
      @close="handleCloseRenameModal"
    >
      <div class="rename-form">
        <CartoonInput
          v-model="newDocName"
          label="新文档名"
          placeholder="输入新的文档名"
          required
          @keyup.enter="handleRenameSubmit"
        />

        <div v-if="renameError" class="error-message">
          {{ renameError }}
        </div>
      </div>

      <template #footer>
        <CartoonButton
          variant="ghost"
          @click="handleCloseRenameModal"
          :disabled="renaming"
        >
          取消
        </CartoonButton>
        <CartoonButton
          variant="primary"
          @click="handleRenameSubmit"
          :loading="renaming"
          :disabled="renaming"
        >
          重命名
        </CartoonButton>
      </template>
    </CartoonModal>
  </div>
</template>

<style scoped>
.document-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-secondary);
}

.document-list-header {
  height: 48px;
  padding: var(--spacing-md);
  border-bottom: var(--border-width) solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.document-list-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.document-list-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
}

.document-list-loading,
.document-list-empty {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.empty-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-xs);
}

.folders {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.folder-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.folder-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.folder-name {
  flex: 1;
}

.folder-documents {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.document-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.document-item:hover {
  background-color: var(--color-bg-tertiary);
}

.document-item.active {
  background-color: var(--color-primary);
  color: white;
}

.document-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unsaved-indicator {
  color: var(--color-warning);
  font-size: var(--font-size-lg);
  line-height: 1;
}

.document-item.active .unsaved-indicator {
  color: white;
}

.document-actions {
  display: none;
  align-items: center;
  gap: var(--spacing-xs);
  margin-left: auto;
}

.document-item:hover .document-actions {
  display: flex;
}

.action-btn {
  padding: var(--spacing-xs);
  background: none;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.action-btn.danger:hover {
  background-color: var(--color-danger);
  color: white;
}

.document-item.active .action-btn {
  color: rgba(255, 255, 255, 0.8);
}

.document-item.active .action-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.document-item.active .action-btn.danger:hover {
  background-color: var(--color-danger);
}

.rename-form {
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
</style>
