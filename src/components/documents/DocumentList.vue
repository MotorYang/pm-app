<script setup>
import {ref, computed} from 'vue'
import {
  FolderOpen,
  DocAdd,
  Plus,
  Delete,
  Text,
  Copy,
  CuttingOne,
  Clipboard,
  FolderPlus,
  FileText,
  Down,
  Right,
  Home
} from '@icon-park/vue-next'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import CartoonModal from '@/components/ui/CartoonModal.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import {useDocumentsStore} from '@/stores/documents'
import {useConfirm} from '@/composables/useConfirm.js'
import {useContextMenu} from '@/composables/useContextMenu'

const documentsStore = useDocumentsStore()
const contextMenu = useContextMenu()
const confirmDialog = useConfirm()
const emit = defineEmits(['create'])

// 文档重命名相关
const showRenameModal = ref(false)
const renameDocId = ref(null)
const newDocName = ref('')
const renaming = ref(false)
const renameError = ref('')

// 文件夹重命名相关
const showFolderRenameModal = ref(false)
const renameFolderPath = ref('')
const newFolderName = ref('')
const renamingFolder = ref(false)
const folderRenameError = ref('')

// 剪贴板相关
const clipboard = ref({
  docId: null,
  action: null // 'copy' | 'cut'
})

// 新建文件夹相关
const showCreateFolderModal = ref(false)
const newFolderPath = ref('')
const creatingFolder = ref(false)
const createFolderError = ref('')

// 文件夹折叠状态
const collapsedFolders = ref(new Set())

// 根目录文档（folder 为 "/" 或空）
const rootDocuments = computed(() => {
  return documentsStore.documents.filter(doc => !doc.folder || doc.folder === '/')
})

// 按文件夹分组的文档（排除根目录）
const documentsByFolder = computed(() => {
  const folders = {}

  // 先添加空文件夹
  documentsStore.emptyFolders.forEach(folder => {
    if (!folders[folder]) {
      folders[folder] = []
    }
  })

  // 再添加有文档的文件夹
  documentsStore.documents.forEach(doc => {
    const folder = doc.folder || '/'
    // 跳过根目录文档
    if (folder === '/') return

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

// 获取所有文件夹列表
const allFolders = computed(() => {
  const folders = new Set()
  // 添加空文件夹
  documentsStore.emptyFolders.forEach(folder => folders.add(folder))
  // 添加有文档的文件夹
  documentsStore.documents.forEach(doc => {
    if (doc.folder && doc.folder !== '/') {
      folders.add(doc.folder)
    }
  })
  return Array.from(folders).sort()
})

const handleDocumentClick = (doc) => {
  documentsStore.openDocument(doc.id)
}

const toggleFolderCollapse = (folder) => {
  if (collapsedFolders.value.has(folder)) {
    collapsedFolders.value.delete(folder)
  } else {
    collapsedFolders.value.add(folder)
  }
}

const isFolderCollapsed = (folder) => {
  return collapsedFolders.value.has(folder)
}

const handleCreate = () => {
  emit('create')
}

const handleContextMenu = (doc, event) => {
  event.preventDefault()
  event.stopPropagation()

  const menuItems = [
    {
      label: '重命名',
      icon: Text,
      action: () => handleRename(doc, event)
    },
    {divider: true},
    {
      label: '复制',
      icon: Copy,
      action: () => handleCopy(doc)
    },
    {
      label: '剪切',
      icon: CuttingOne,
      action: () => handleCut(doc)
    },
    {divider: true},
    {
      label: '删除文档',
      icon: Delete,
      danger: true,
      action: () => handleDelete(doc, event)
    }
  ]
  contextMenu.show(event, menuItems)
}

// 文件夹右键菜单
const handleFolderContextMenu = (folder, event) => {
  event.preventDefault()
  event.stopPropagation()

  const menuItems = [
    {
      label: '新建文档',
      icon: Plus,
      action: () => handleCreateInFolder(folder)
    },
    {divider: true},
    {
      label: '重命名文件夹',
      icon: Text,
      action: () => handleFolderRename(folder)
    },
    ...(clipboard.value.docId ? [{
      label: '粘贴到此文件夹',
      icon: Clipboard,
      action: () => handlePaste(folder)
    }] : []),
    {divider: true},
    {
      label: '删除文件夹',
      icon: Delete,
      danger: true,
      action: () => handleFolderDelete(folder)
    }
  ]
  contextMenu.show(event, menuItems)
}

// 空白处右键菜单
const handleEmptyContextMenu = (event) => {
  event.preventDefault()

  const menuItems = [
    {
      label: '新建文档',
      icon: Plus,
      action: () => emit('create')
    },
    {
      label: '新建文件夹',
      icon: FolderPlus,
      action: () => handleCreateFolder()
    }
  ]
  contextMenu.show(event, menuItems)
}

// 在指定文件夹下新建文档
const handleCreateInFolder = (folder) => {
  emit('create', folder)
}

// 复制文档
const handleCopy = (doc) => {
  clipboard.value = {
    docId: doc.id,
    action: 'copy'
  }
}

// 剪切文档
const handleCut = (doc) => {
  clipboard.value = {
    docId: doc.id,
    action: 'cut'
  }
}

// 粘贴文档到文件夹
const handlePaste = async (targetFolder) => {
  if (!clipboard.value.docId) return

  try {
    if (clipboard.value.action === 'copy') {
      await documentsStore.copyDocument(clipboard.value.docId, targetFolder)
    } else if (clipboard.value.action === 'cut') {
      await documentsStore.moveDocument(clipboard.value.docId, targetFolder)
      clipboard.value = {docId: null, action: null}
    }
  } catch (e) {
    alert('操作失败: ' + (e.message || '未知错误'))
  }
}

// 文件夹重命名
const handleFolderRename = (folder) => {
  renameFolderPath.value = folder
  // 提取文件夹名称（最后一部分）
  const parts = folder.split('/').filter(p => p)
  newFolderName.value = parts.length > 0 ? parts[parts.length - 1] : folder
  folderRenameError.value = ''
  showFolderRenameModal.value = true
}

const handleFolderRenameSubmit = async () => {
  if (!newFolderName.value.trim()) {
    folderRenameError.value = '请输入新的文件夹名'
    return
  }

  renamingFolder.value = true
  folderRenameError.value = ''

  try {
    await documentsStore.renameFolder(renameFolderPath.value, newFolderName.value.trim())
    showFolderRenameModal.value = false
    renameFolderPath.value = ''
    newFolderName.value = ''
  } catch (e) {
    folderRenameError.value = e.message || '重命名失败'
  } finally {
    renamingFolder.value = false
  }
}

const handleCloseFolderRenameModal = () => {
  showFolderRenameModal.value = false
  renameFolderPath.value = ''
  newFolderName.value = ''
  folderRenameError.value = ''
}

// 文件夹删除
const handleFolderDelete = async (folder) => {
  const docsInFolder = documentsStore.documents.filter(doc => doc.folder === folder)

  let message = `确定要删除文件夹"${folder}"吗？`
  if (docsInFolder.length > 0) {
    message = `文件夹"${folder}"下有 ${docsInFolder.length} 个文档，删除文件夹将同时删除这些文档。确定要继续吗？`
  }

  const result = await confirmDialog({
    title: '删除文件夹',
    message,
    danger: true,
    confirmText: '删除',
    cancelText: '取消'
  })

  if (result) {
    try {
      await documentsStore.deleteFolder(folder)
    } catch (e) {
      alert('删除失败: ' + (e.message || '未知错误'))
    }
  }
}

// 新建文件夹
const handleCreateFolder = () => {
  newFolderPath.value = ''
  createFolderError.value = ''
  showCreateFolderModal.value = true
}

const handleCreateFolderSubmit = async () => {
  const folderName = newFolderPath.value.trim()
  if (!folderName) {
    createFolderError.value = '请输入文件夹名称'
    return
  }

  // 构建文件夹路径
  let folderPath = folderName.startsWith('/') ? folderName : '/' + folderName

  // 检查文件夹是否已存在
  if (allFolders.value.includes(folderPath)) {
    createFolderError.value = '该文件夹已存在'
    return
  }

  creatingFolder.value = true
  createFolderError.value = ''

  try {
    // 通过创建一个空文档来创建文件夹
    await documentsStore.createFolder(folderPath)
    showCreateFolderModal.value = false
    newFolderPath.value = ''
  } catch (e) {
    createFolderError.value = e.message || '创建失败'
  } finally {
    creatingFolder.value = false
  }
}

const handleCloseCreateFolderModal = () => {
  showCreateFolderModal.value = false
  newFolderPath.value = ''
  createFolderError.value = ''
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
      <div class="header-actions">
        <button @click="handleCreateFolder" title="新建文件夹">
          <FolderPlus :size="20" theme="outline"/>
        </button>
        <button @click="handleCreate" title="新建文档">
          <DocAdd :size="20" theme="outline"/>
        </button>
      </div>
    </div>

    <div class="document-list-content" @contextmenu="handleEmptyContextMenu">
      <div v-if="documentsStore.loading && documentsStore.documents.length === 0" class="document-list-loading">
        加载中...
      </div>

      <div v-else-if="documentsStore.documents.length === 0" class="document-list-empty"
           @contextmenu="handleEmptyContextMenu">
        <p>还没有文档</p>
        <p class="empty-hint">点击"新建"或右键创建文档</p>
      </div>

      <div v-else class="document-tree">
        <!-- 根目录文档 -->
        <div v-if="rootDocuments.length > 0" class="root-documents">
          <div
              v-for="doc in rootDocuments"
              :key="doc.id"
              class="document-item"
              :class="{ active: doc.id === documentsStore.activeDocumentId }"
              @click="handleDocumentClick(doc)"
              @contextmenu="handleContextMenu(doc, $event)"
          >
            <FileText :size="14" theme="outline" class="file-icon"/>
            <span class="document-name">{{ doc.title }}.md</span>
            <span
                v-if="documentsStore.hasUnsavedChanges && doc.id === documentsStore.activeDocumentId"
                class="unsaved-indicator"
            >
              ●
            </span>
          </div>
        </div>

        <!-- 文件夹 -->
        <div
            v-for="(docs, folder) in documentsByFolder"
            :key="folder"
            class="folder-group"
        >
          <div
              class="folder-header"
              @click="toggleFolderCollapse(folder)"
              @contextmenu="handleFolderContextMenu(folder, $event)"
          >
            <Right v-if="isFolderCollapsed(folder)" :size="12" theme="outline" class="folder-arrow"/>
            <Down v-else :size="12" theme="outline" class="folder-arrow"/>
            <FolderOpen :size="14" theme="outline" class="folder-icon"/>
            <span class="folder-name">{{ folder.replace(/^\//, '') }}</span>
          </div>

          <div v-if="!isFolderCollapsed(folder)" class="folder-documents">
            <div
                v-for="doc in docs"
                :key="doc.id"
                class="document-item"
                :class="{ active: doc.id === documentsStore.activeDocumentId }"
                @click="handleDocumentClick(doc)"
                @contextmenu="handleContextMenu(doc, $event)"
            >
              <FileText :size="14" theme="outline" class="file-icon"/>
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

    <!-- Folder Rename Modal -->
    <CartoonModal
        :open="showFolderRenameModal"
        title="重命名文件夹"
        size="sm"
        @close="handleCloseFolderRenameModal"
    >
      <div class="rename-form">
        <CartoonInput
            v-model="newFolderName"
            label="新文件夹名"
            placeholder="输入新的文件夹名"
            required
            @keyup.enter="handleFolderRenameSubmit"
        />

        <div v-if="folderRenameError" class="error-message">
          {{ folderRenameError }}
        </div>
      </div>

      <template #footer>
        <CartoonButton
            variant="ghost"
            @click="handleCloseFolderRenameModal"
            :disabled="renamingFolder"
        >
          取消
        </CartoonButton>
        <CartoonButton
            variant="primary"
            @click="handleFolderRenameSubmit"
            :loading="renamingFolder"
            :disabled="renamingFolder"
        >
          重命名
        </CartoonButton>
      </template>
    </CartoonModal>

    <!-- Create Folder Modal -->
    <CartoonModal
        :open="showCreateFolderModal"
        title="新建文件夹"
        size="sm"
        @close="handleCloseCreateFolderModal"
    >
      <div class="rename-form">
        <CartoonInput
            v-model="newFolderPath"
            label="文件夹名称"
            placeholder="输入文件夹名称"
            required
            @keyup.enter="handleCreateFolderSubmit"
        />

        <div v-if="createFolderError" class="error-message">
          {{ createFolderError }}
        </div>
      </div>

      <template #footer>
        <CartoonButton
            variant="ghost"
            @click="handleCloseCreateFolderModal"
            :disabled="creatingFolder"
        >
          取消
        </CartoonButton>
        <CartoonButton
            variant="primary"
            @click="handleCreateFolderSubmit"
            :loading="creatingFolder"
            :disabled="creatingFolder"
        >
          创建
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

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-xs);
}

.header-actions > button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  height: 32px; /* 改为合适的高度 */
  width: 32px;  /* 添加固定宽度保持正方形 */
  line-height: 1;
  color: var(--color-text-primary);
}

.header-actions > button:deep(svg) {
  display: block;
  vertical-align: middle;
}

.header-actions > button:hover {
  color: var(--color-text-secondary);
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

.document-tree {
  display: flex;
  flex-direction: column;
}

.root-documents {
  display: flex;
  flex-direction: column;
}

.folder-group {
  display: flex;
  flex-direction: column;
}

.folder-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color 0.1s;
  user-select: none;
}

.folder-header:hover {
  background-color: var(--color-bg-tertiary);
}

.folder-arrow {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.folder-icon {
  color: var(--color-secondary);
  flex-shrink: 0;
}

.folder-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-documents {
  display: flex;
  flex-direction: column;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 28px;
  cursor: pointer;
  transition: background-color 0.1s;
  color: var(--color-text-primary);
  font-size: 13px;
  user-select: none;
}

.root-documents .document-item {
  padding-left: 8px;
}

.file-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.document-item:hover {
  background-color: var(--color-bg-tertiary);
}

.document-item.active {
  background-color: rgba(var(--color-primary-rgb, 59, 130, 246), 0.15);
  color: var(--color-primary);
}

.document-item.active:hover {
  background-color: rgba(var(--color-primary-rgb, 59, 130, 246), 0.2);
}

.document-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unsaved-indicator {
  color: var(--color-warning);
  font-size: 10px;
  line-height: 1;
  margin-left: 4px;
}

.document-item.active .unsaved-indicator {
  color: var(--color-primary);
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
