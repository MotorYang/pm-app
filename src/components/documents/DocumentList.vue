<script setup>
import {ref, computed, onMounted, onUnmounted} from 'vue'
import {
  FolderOpen,
  FileAdditionOne,
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
  Home,
  Picture,
  FilePdf,
  DownloadOne,
  Code,
  FileZip,
  FileWord,
  Music,
  Video,
  FileHashOne,
  FolderOne,
  FolderCode,
  Refresh
} from '@icon-park/vue-next'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import CartoonModal from '@/components/ui/CartoonModal.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import FolderTreeItem from './FolderTreeItem.vue'
import {useDocumentsStore} from '@/stores/documents'
import {useProjectsStore} from '@/stores/projects'
import {useConfirm} from '@/composables/useConfirm.js'
import {useContextMenu} from '@/composables/useContextMenu'
import {useFileDrop} from '@/composables/useFileDrop'
import {getFileType, getDisplayName, fileTypeColors} from '@/utils/fileTypes'

const documentsStore = useDocumentsStore()
const projectsStore = useProjectsStore()
const contextMenu = useContextMenu()
const confirmDialog = useConfirm()
const emit = defineEmits(['create'])

// 文件拖拽相关
const dropZoneRef = ref(null)
const {isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop} = useFileDrop(
    async (files) => {
      if (!projectsStore.activeProjectId) return

      const results = await documentsStore.importFiles(
          projectsStore.activeProjectId,
          files,
          currentDropFolder.value
      )

      // 显示导入结果
      const successResults = results.filter(r => r.success)
      const failCount = results.filter(r => !r.success).length

      if (failCount > 0) {
        alert(`导入完成：成功 ${successResults.length} 个，失败 ${failCount} 个`)
      }

      // 导入成功后，自动打开第一个导入的文件
      if (successResults.length > 0) {
        const firstResult = successResults[0]
        const targetFolder = currentDropFolder.value
        // 根据文件名和目标文件夹查找文档
        // firstResult.name 是完整文件名（带扩展名），doc.title 是不带扩展名的
        const fileName = firstResult.name
        const fileNameWithoutExt = fileName.includes('.')
          ? fileName.substring(0, fileName.lastIndexOf('.'))
          : fileName
        const docToOpen = documentsStore.documents.find(d =>
          (d.title === fileName || d.title === fileNameWithoutExt) && d.folder === targetFolder
        )
        if (docToOpen) {
          documentsStore.openDocumentByType(docToOpen.id)
        }
      }
    }
)
const currentDropFolder = ref('/')

// 获取文件类型图标组件
const getFileIcon = (doc) => {
  const type = doc.type || 'markdown'
  switch (type) {
    case 'pdf':
      return FilePdf
    case 'image':
      return Picture
    case 'text':
      return FileText
    case 'code':
      return Code
    case 'archive':
      return FileZip
    case 'office':
      return FileWord
    case 'audio':
      return Music
    case 'video':
      return Video
    case 'file':
      return FileHashOne
    default:
      return FileText
  }
}

// 获取文件类型颜色
const getFileIconColor = (doc) => {
  const type = doc.type || 'markdown'
  return fileTypeColors[type] || fileTypeColors.markdown
}

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
const parentFolderPath = ref('/') // 父文件夹路径，用于创建子文件夹
const creatingFolder = ref(false)
const createFolderError = ref('')

// 文件夹折叠状态
const collapsedFolders = ref(new Set())

// 根目录文档（folder 为 "/" 或空）
const rootDocuments = computed(() => {
  return documentsStore.documents.filter(doc => !doc.folder || doc.folder === '/')
})

// 构建树形结构的文件夹
const folderTree = computed(() => {
  // 收集所有文件夹路径
  const allPaths = new Set()

  // 添加空文件夹
  documentsStore.emptyFolders.forEach(folder => {
    if (folder && folder !== '/') {
      allPaths.add(folder)
    }
  })

  // 添加有文档的文件夹
  documentsStore.documents.forEach(doc => {
    if (doc.folder && doc.folder !== '/') {
      allPaths.add(doc.folder)
    }
  })

  // 构建树形结构
  const root = { children: {}, docs: [] }

  Array.from(allPaths).sort().forEach(path => {
    const parts = path.split('/').filter(p => p)
    let current = root

    let currentPath = ''
    parts.forEach((part, index) => {
      currentPath += '/' + part
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: currentPath,
          children: {},
          docs: []
        }
      }
      current = current.children[part]
    })
  })

  // 将文档分配到对应的文件夹
  documentsStore.documents.forEach(doc => {
    const folder = doc.folder || '/'
    if (folder === '/') return

    const parts = folder.split('/').filter(p => p)
    let current = root

    parts.forEach(part => {
      if (current.children[part]) {
        current = current.children[part]
      }
    })

    if (current !== root) {
      current.docs.push(doc)
    }
  })

  // 转换为数组格式便于渲染
  function toArray(node) {
    return Object.values(node.children).map(child => ({
      name: child.name,
      path: child.path,
      docs: child.docs,
      children: toArray(child)
    }))
  }

  return toArray(root)
})

// 按文件夹分组的文档（排除根目录）- 保留用于兼容
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

// 获取文件夹的显示名称（只显示最后一级）
const getFolderDisplayName = (folder) => {
  const parts = folder.path.split('/').filter(p => p)
  return parts[parts.length - 1] || folder.name
}

const handleDocumentClick = (doc) => {
  // 使用 openDocumentByType 支持不同文件类型（markdown, pdf, image）
  documentsStore.openDocumentByType(doc.id)
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

// 手动刷新文档列表
const handleRefresh = () => {
  documentsStore.refreshDocuments()
}

const handleContextMenu = (doc, event) => {
  // 调试日志
  console.log('handleContextMenu (document) called:', { docPath: doc?.path, docTitle: doc?.title })

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
      label: '在资源管理器中打开',
      icon: FolderCode,
      action: () => handleOpenInExplorer(doc.path)
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
  // 调试日志
  console.log('handleFolderContextMenu called:', { folder, eventType: event?.type })

  // 防御性检查 - 确保参数有效
  if (!folder || !event) {
    console.error('handleFolderContextMenu: invalid params', { folder, event })
    return
  }

  const menuItems = [
    {
      label: '新建文档',
      icon: Plus,
      action: () => handleCreateInFolder(folder)
    },
    {
      label: '新建子文件夹',
      icon: FolderPlus,
      action: () => handleCreateSubFolder(folder)
    },
    {
      label: '导入文件',
      icon: DownloadOne,
      action: () => handleDownloadOneFile(folder)
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
      label: '在资源管理器中打开',
      icon: FolderCode,
      action: () => handleOpenInExplorer(folder)
    },
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
    },
    {divider: true},
    {
      label: '导入文件',
      icon: DownloadOne,
      action: () => handleDownloadOneFile('/')
    },
    {divider: true},
    {
      label: '在资源管理器中打开',
      icon: FolderCode,
      action: () => handleOpenInExplorer('/')
    }
  ]
  contextMenu.show(event, menuItems)
}

// 导入文件
const handleDownloadOneFile = async (targetFolder) => {
  if (!projectsStore.activeProjectId) return

  try {
    const {open} = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      multiple: true
    })

    if (selected && selected.length > 0) {
      const files = selected.map(path => ({
        path,
        name: path.split(/[/\\]/).pop()
      }))

      const results = await documentsStore.importFiles(
          projectsStore.activeProjectId,
          files,
          targetFolder
      )

      const successResults = results.filter(r => r.success)
      const failCount = results.filter(r => !r.success).length

      if (failCount > 0) {
        alert(`导入完成：成功 ${successResults.length} 个，失败 ${failCount} 个`)
      }

      // 导入成功后，自动打开第一个导入的文件
      if (successResults.length > 0) {
        const firstResult = successResults[0]
        // 根据文件名和目标文件夹查找文档
        // firstResult.name 是完整文件名（带扩展名），doc.title 是不带扩展名的
        const fileName = firstResult.name
        const fileNameWithoutExt = fileName.includes('.')
          ? fileName.substring(0, fileName.lastIndexOf('.'))
          : fileName
        const docToOpen = documentsStore.documents.find(d =>
          (d.title === fileName || d.title === fileNameWithoutExt) && d.folder === targetFolder
        )
        if (docToOpen) {
          documentsStore.openDocumentByType(docToOpen.id)
        }
      }
    }
  } catch (e) {
    console.error('Failed to import file:', e)
    alert('导入失败: ' + (e.message || '未知错误'))
  }
}

// 在指定文件夹下新建文档
const handleCreateInFolder = (folder) => {
  emit('create', folder)
}

// 在资源管理器中打开
const handleOpenInExplorer = async (itemPath) => {
  try {
    await documentsStore.openInExplorer(itemPath)
  } catch (e) {
    alert('打开失败: ' + (e.message || '未知错误'))
  }
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

// 新建文件夹（在根目录）
const handleCreateFolder = () => {
  newFolderPath.value = ''
  parentFolderPath.value = '/'
  createFolderError.value = ''
  showCreateFolderModal.value = true
}

// 新建子文件夹（在指定文件夹下）
const handleCreateSubFolder = (parentFolder) => {
  newFolderPath.value = ''
  parentFolderPath.value = parentFolder
  createFolderError.value = ''
  showCreateFolderModal.value = true
}

const handleCreateFolderSubmit = async () => {
  const folderName = newFolderPath.value.trim()
  if (!folderName) {
    createFolderError.value = '请输入文件夹名称'
    return
  }

  // 文件夹名称不能包含路径分隔符
  if (folderName.includes('/') || folderName.includes('\\')) {
    createFolderError.value = '文件夹名称不能包含路径分隔符'
    return
  }

  // 构建完整文件夹路径
  let folderPath
  if (parentFolderPath.value === '/') {
    folderPath = '/' + folderName
  } else {
    folderPath = parentFolderPath.value + '/' + folderName
  }

  // 检查文件夹是否已存在
  if (allFolders.value.includes(folderPath)) {
    createFolderError.value = '该文件夹已存在'
    return
  }

  creatingFolder.value = true
  createFolderError.value = ''

  try {
    await documentsStore.createFolder(folderPath)
    showCreateFolderModal.value = false
    newFolderPath.value = ''
    parentFolderPath.value = '/'
  } catch (e) {
    createFolderError.value = e.message || '创建失败'
  } finally {
    creatingFolder.value = false
  }
}

const handleCloseCreateFolderModal = () => {
  showCreateFolderModal.value = false
  newFolderPath.value = ''
  parentFolderPath.value = '/'
  createFolderError.value = ''
}

const handleDelete = async (doc, event) => {
  event.stopPropagation()

  const result = await confirmDialog({
    title: '删除文档',
    message: `确定要删除"${doc.title}"吗？`,
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
        <button @click="handleRefresh" title="刷新">
          <Refresh :size="18" theme="outline"/>
        </button>
        <button @click="handleCreateFolder" title="新建文件夹">
          <FolderPlus :size="20" theme="outline"/>
        </button>
        <button @click="handleCreate" title="新建文档">
          <FileAdditionOne :size="20" theme="outline"/>
        </button>
      </div>
    </div>

    <div
        class="document-list-content"
        :class="{ 'is-dragging': isDragging }"
        ref="dropZoneRef"
        @contextmenu="handleEmptyContextMenu"
        @dragenter="handleDragEnter"
        @dragleave="handleDragLeave"
        @dragover="handleDragOver"
        @drop="handleDrop"
    >
      <!-- 拖拽提示遮罩 -->
      <div v-if="isDragging" class="drop-overlay">
        <div class="drop-hint">
          <DownloadOne :size="32" theme="outline"/>
          <span>松开鼠标导入文件</span>
        </div>
      </div>

      <div v-if="documentsStore.loading && documentsStore.documents.length === 0" class="document-list-loading">
        加载中...
      </div>

      <div v-else-if="documentsStore.documents.length === 0" class="document-list-empty"
           @contextmenu="handleEmptyContextMenu">
        <p>还没有文档</p>
        <p class="empty-hint">点击"新建"或拖入文件</p>
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
              @contextmenu.prevent.stop="handleContextMenu(doc, $event)"
          >
            <component
                :is="getFileIcon(doc)"
                :size="14"
                theme="outline"
                class="file-icon"
                :style="{ color: getFileIconColor(doc) }"
            />
            <span class="document-name">{{ doc.title }}.{{ doc.file_ext || 'md' }}</span>
            <span
                v-if="documentsStore.hasUnsavedChanges && doc.id === documentsStore.activeDocumentId"
                class="unsaved-indicator"
            >
              ●
            </span>
          </div>
        </div>

        <!-- 文件夹树 -->
        <FolderTreeItem
            v-for="folder in folderTree"
            :key="folder.path"
            :folder="folder"
            :depth="0"
            :collapsed-folders="collapsedFolders"
            :active-document-id="documentsStore.activeDocumentId"
            :has-unsaved-changes="documentsStore.hasUnsavedChanges"
            :get-file-icon="getFileIcon"
            :get-file-icon-color="getFileIconColor"
            @toggle-collapse="toggleFolderCollapse"
            @folder-context-menu="handleFolderContextMenu"
            @document-click="handleDocumentClick"
            @document-context-menu="handleContextMenu"
        />
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
        :title="parentFolderPath === '/' ? '新建文件夹' : '新建子文件夹'"
        size="sm"
        @close="handleCloseCreateFolderModal"
    >
      <div class="rename-form">
        <div v-if="parentFolderPath !== '/'" class="parent-folder-hint">
          将在 <code>{{ parentFolderPath }}</code> 下创建
        </div>
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
  height: 38px;
  padding: var(--spacing-md);
  border-bottom: var(--border-width) solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.document-list-title {
  font-size: var(--font-size-md);
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
}

.header-actions > button:hover {
  color: var(--color-text-secondary);
}


.document-list-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
  position: relative;
}

.document-list-content.is-dragging {
  background-color: rgba(var(--color-primary-rgb, 59, 130, 246), 0.05);
}

.drop-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(var(--color-primary-rgb, 59, 130, 246), 0.1);
  border: 2px dashed var(--color-primary);
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}

.drop-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-primary);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
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

.parent-folder-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius-sm);
}

.parent-folder-hint code {
  background-color: var(--color-bg-secondary);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  font-family: monospace;
  color: var(--color-primary);
}
</style>
