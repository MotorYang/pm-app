// Documents Store - Manage documents with file system mode
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useProjectsStore } from './projects'
import { getFileType } from '@/utils/fileTypes'

export const useDocumentsStore = defineStore('documents', () => {
  const projectsStore = useProjectsStore()

  // State
  const documents = ref([])
  const recentDocuments = ref([])
  const fileTree = ref([]) // 文件系统树形结构
  const activeDocumentId = ref(null)
  const activeDocumentPath = ref(null) // 当前文档的相对路径
  const activeDocumentContent = ref('')
  const activeDocumentBinary = ref(null) // For binary files (PDF, images)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(null)
  const emptyFolders = ref([]) // 存储空文件夹路径

  // Getters
  const activeDocument = computed(() => {
    return documents.value.find(doc => doc.id === activeDocumentId.value) || null
  })

  const hasUnsavedChanges = ref(false)

  const RECENT_DOCS_KEY = 'pm-app-recent-documents'

  function loadRecentDocumentsFromStorage() {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
      const raw = localStorage.getItem(RECENT_DOCS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        recentDocuments.value = parsed
      }
    } catch (e) {
      console.error('Failed to load recent documents:', e)
    }
  }

  function saveRecentDocumentsToStorage() {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
      localStorage.setItem(RECENT_DOCS_KEY, JSON.stringify(recentDocuments.value))
    } catch (e) {
      console.error('Failed to save recent documents:', e)
    }
  }

  function addRecentDocument(doc, project) {
    if (!doc) return
    const projectId = doc.project_id || project?.id || projectsStore.activeProjectId
    if (!projectId) return

    const projectInfo =
      project ||
      (Array.isArray(projectsStore.projects)
        ? projectsStore.projects.find(p => p.id === projectId)
        : null)

    const entry = {
      id: doc.id,
      path: doc.path,
      title: doc.title,
      project_id: projectId,
      project_name: projectInfo?.name || '',
      project_color: projectInfo?.color || '#999999',
      file_ext: doc.file_ext,
      type: doc.type,
      updated_at: new Date().toISOString()
    }

    const list = recentDocuments.value.filter(
      item => !(item.project_id === projectId && item.path === doc.path)
    )
    list.unshift(entry)
    recentDocuments.value = list.slice(0, 20)
    saveRecentDocumentsToStorage()
  }

  loadRecentDocumentsFromStorage()

  // Group documents by folder
  const documentsByFolder = computed(() => {
    const folders = {}

    documents.value.forEach(doc => {
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

  // 将扫描结果转换为扁平的文档列表
  function flattenScanResult(items, parentFolder = '/') {
    const result = []

    for (const item of items) {
      if (item.is_dir) {
        // 添加文件夹到 emptyFolders（如果没有子文件）
        const hasFiles = item.children && item.children.some(c => !c.is_dir)
        if (!hasFiles) {
          emptyFolders.value.push(item.path)
        }
        // 递归处理子目录
        if (item.children && item.children.length > 0) {
          result.push(...flattenScanResult(item.children, item.path))
        }
      } else {
        // 构建文档对象
        const folder = parentFolder === '/' ? '/' : parentFolder
        result.push({
          id: item.path, // 使用路径作为 ID
          path: item.path, // 相对路径
          title: item.name,
          folder: folder,
          type: item.file_type || 'unknown',
          file_ext: item.ext,
          file_size: item.size,
          project_id: projectsStore.activeProjectId
        })
      }
    }

    return result
  }

  // Actions
  async function loadDocuments(projectId, options = {}) {
    const { preserveSelection = false } = options

    if (!projectId) {
      documents.value = []
      fileTree.value = []
      closeDocument()
      return
    }

    // 保存当前选中的文档路径
    const currentDocPath = preserveSelection ? activeDocumentPath.value : null

    loading.value = true
    error.value = null
    emptyFolders.value = []

    try {
      // 文件系统扫描模式
      await initDocvault(projectId)
      const scanResult = await invoke('scan_docvault', { projectId })
      fileTree.value = scanResult
      documents.value = flattenScanResult(scanResult)

      // 如果需要保留选中状态，尝试重新选中之前的文档
      if (currentDocPath) {
        const previousDoc = documents.value.find(d => d.path === currentDocPath)
        if (previousDoc) {
          // 文档仍然存在，保持选中
          return
        }
      }

      // 自动打开第一个 markdown 文档
      const firstMarkdown = documents.value.find(d => d.type === 'markdown')
      if (firstMarkdown) {
        await openDocumentByPath(firstMarkdown.path, projectId)
      } else if (documents.value.length > 0) {
        await openDocumentByPath(documents.value[0].path, projectId)
      } else {
        closeDocument()
      }
    } catch (e) {
      error.value = e.message || 'Failed to load documents'
      console.error('Failed to load documents:', e)
    } finally {
      loading.value = false
    }
  }

  // 刷新文档列表（保留当前选中的文档）
  async function refreshDocuments() {
    const projectId = projectsStore.activeProjectId
    if (!projectId) return
    await loadDocuments(projectId, { preserveSelection: true })
  }

  // 通过路径打开文档（文件系统模式）
  async function openDocumentByPath(relativePath, projectId) {
    if (!relativePath || !projectId) return

    const doc = documents.value.find(d => d.path === relativePath)
    if (!doc) {
      error.value = 'Document not found'
      return
    }

    loading.value = true
    error.value = null
    activeDocumentBinary.value = null

    try {
      activeDocumentId.value = relativePath
      activeDocumentPath.value = relativePath

      const fileType = doc.type || getFileType(doc.file_ext)

      if (fileType === 'markdown') {
        const content = await invoke('read_docvault_file', {
          projectId,
          relativePath
        })
        activeDocumentContent.value = content || ''
        activeDocumentBinary.value = null
      } else if (fileType === 'pdf' || fileType === 'image') {
        activeDocumentContent.value = ''
        const binaryData = await invoke('read_docvault_binary', {
          projectId,
          relativePath
        })
        activeDocumentBinary.value = binaryData
      }

      const project =
        Array.isArray(projectsStore.projects)
          ? projectsStore.projects.find(p => p.id === (doc.project_id || projectId))
          : null
      addRecentDocument(doc, project)

      hasUnsavedChanges.value = false
    } catch (e) {
      error.value = e.message || 'Failed to open document'
      console.error('Failed to open document:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function saveDocument() {
    if (!activeDocumentId.value || !hasUnsavedChanges.value) {
      return
    }
    return saveDocumentInDocvault()
  }

  function updateContent(content) {
    activeDocumentContent.value = content
    hasUnsavedChanges.value = true
  }

  function closeDocument() {
    activeDocumentId.value = null
    activeDocumentContent.value = ''
    hasUnsavedChanges.value = false
  }

  async function createDocument(projectId, title, folder = '/') {
    if (!projectId || !title) {
      throw new Error('Project ID and title are required')
    }
    return createDocumentInDocvault(projectId, title, folder, 'markdown')
  }

  async function deleteDocument(documentId) {
    if (!documentId) {
      throw new Error('Document ID is required')
    }

    loading.value = true
    error.value = null

    try {
      const doc = documents.value.find(d => d.id === documentId)
      if (doc && doc.path) {
        await invoke('delete_docvault_item', {
          projectId: projectsStore.activeProjectId,
          itemPath: doc.path
        })
      }

      // Remove from local list
      documents.value = documents.value.filter(d => d.id !== documentId)

      // Close if this was the active document
      if (activeDocumentId.value === documentId) {
        closeDocument()
      }
    } catch (e) {
      error.value = e.message || 'Failed to delete document'
      console.error('Failed to delete document:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function renameDocument(documentId, newTitle) {
    if (!documentId || !newTitle) {
      throw new Error('Document ID and new title are required')
    }

    const doc = documents.value.find(d => d.id === documentId)
    if (!doc || !doc.path) {
      throw new Error('Document not found')
    }

    // Remove extension if present
    let cleanTitle = newTitle.trim()
    const ext = doc.file_ext || 'md'
    if (cleanTitle.endsWith(`.${ext}`)) {
      cleanTitle = cleanTitle.slice(0, -(ext.length + 1))
    }

    loading.value = true
    error.value = null

    try {
      const projectId = doc.project_id || projectsStore.activeProjectId

      // 构建新路径
      const oldPath = doc.path
      const folder = doc.folder === '/' ? '' : doc.folder
      const newPath = folder ? `${folder}/${cleanTitle}.${ext}` : `/${cleanTitle}.${ext}`

      // 调用后端重命名
      await invoke('rename_docvault_item', {
        projectId,
        oldPath: oldPath.replace(/^\//, ''),
        newPath: newPath.replace(/^\//, '')
      })

      // 重新加载文档列表
      await loadDocuments(projectId)
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        error.value = '该文件夹下已存在同名文档'
      } else {
        error.value = e.message || 'Failed to rename document'
      }
      console.error('Failed to rename document:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  // 复制文档到目标文件夹
  async function copyDocument(documentId, targetFolder) {
    const doc = documents.value.find(d => d.id === documentId)
    if (!doc) {
      throw new Error('Document not found')
    }

    loading.value = true
    error.value = null

    try {
      const projectId = doc.project_id || projectsStore.activeProjectId
      await invoke('copy_docvault_item', {
        projectId,
        sourcePath: doc.path,
        targetFolder
      })

      // 重新加载文档列表
      await loadDocuments(projectId)
      return doc.path
    } catch (e) {
      error.value = e.message || 'Failed to copy document'
      console.error('Failed to copy document:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // 移动文档到目标文件夹
  async function moveDocument(documentId, targetFolder) {
    const doc = documents.value.find(d => d.id === documentId)
    if (!doc) {
      throw new Error('Document not found')
    }

    if (doc.folder === targetFolder) {
      return // 已经在目标文件夹，无需移动
    }

    loading.value = true
    error.value = null

    try {
      const projectId = doc.project_id || projectsStore.activeProjectId
      await invoke('move_docvault_item', {
        projectId,
        sourcePath: doc.path,
        targetFolder
      })

      // 重新加载文档列表
      await loadDocuments(projectId)
    } catch (e) {
      error.value = e.message || 'Failed to move document'
      console.error('Failed to move document:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // 重命名文件夹
  async function renameFolder(oldPath, newName) {
    if (!oldPath || !newName) {
      throw new Error('Folder path and new name are required')
    }

    loading.value = true
    error.value = null

    try {
      const projectId = projectsStore.activeProjectId
      if (!projectId) {
        throw new Error('No active project')
      }

      // 构建新路径
      const parts = oldPath.split('/').filter(p => p)
      parts[parts.length - 1] = newName
      const newPath = '/' + parts.join('/')

      // 调用后端重命名
      await invoke('rename_docvault_item', {
        projectId,
        oldPath: oldPath.replace(/^\//, ''),
        newPath: newPath.replace(/^\//, '')
      })

      // 重新加载文档列表
      await loadDocuments(projectId)
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        error.value = '已存在同名文件夹'
      } else {
        error.value = e.message || 'Failed to rename folder'
      }
      console.error('Failed to rename folder:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // 创建新文件夹
  async function createFolder(folderPath) {
    if (!folderPath) {
      throw new Error('Folder path is required')
    }

    const projectId = projectsStore.activeProjectId
    if (!projectId) {
      throw new Error('No active project')
    }

    return createFolderInDocvault(projectId, folderPath)
  }

  // 删除文件夹及其下所有文档
  async function deleteFolder(folderPath) {
    if (!folderPath) {
      throw new Error('Folder path is required')
    }

    loading.value = true
    error.value = null

    try {
      await invoke('delete_docvault_item', {
        projectId: projectsStore.activeProjectId,
        itemPath: folderPath
      })

      // 更新本地列表（移除该文件夹及其子文件）
      documents.value = documents.value.filter(d => !d.folder.startsWith(folderPath))

      // 从空文件夹列表中移除
      emptyFolders.value = emptyFolders.value.filter(f => !f.startsWith(folderPath))

      // 如果当前活动文档在被删除的文件夹中，关闭它
      if (activeDocumentId.value) {
        const activeDoc = documents.value.find(d => d.id === activeDocumentId.value)
        if (!activeDoc) {
          closeDocument()
        }
      }
    } catch (e) {
      error.value = e.message || 'Failed to delete folder'
      console.error('Failed to delete folder:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // ==================== DocVault 功能 ====================

  // 初始化项目的 docvault
  async function initDocvault(projectId) {
    if (!projectId) return

    try {
      await invoke('init_docvault', { projectId })
    } catch (e) {
      console.error('Failed to init docvault:', e)
    }
  }

  // 获取 docvault 路径
  async function getDocvaultPath(projectId) {
    if (!projectId) return null

    try {
      return await invoke('get_docvault_path', { projectId })
    } catch (e) {
      console.error('Failed to get docvault path:', e)
      return null
    }
  }

  // 导入外部文件到文档库
  async function importFile(projectId, sourcePath, targetFolder = '/') {
    if (!projectId || !sourcePath) {
      throw new Error('Project ID and source path are required')
    }

    loading.value = true
    error.value = null

    try {
      // 先初始化 docvault
      await initDocvault(projectId)

      // 调用后端导入文件（直接复制到目标文件夹）
      const fileInfo = await invoke('import_file_to_docvault', {
        projectId,
        sourcePath,
        targetFolder
      })

      // 重新扫描目录
      await loadDocuments(projectId)
      return fileInfo.filename
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        error.value = '该文件夹下已存在同名文件'
      } else {
        error.value = e.message || 'Failed to import file'
      }
      console.error('Failed to import file:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // 批量导入文件
  async function importFiles(projectId, files, targetFolder = '/') {
    const results = []

    for (const file of files) {
      try {
        const docId = await importFile(projectId, file.path, targetFolder)
        results.push({ success: true, docId, name: file.name })
      } catch (e) {
        results.push({ success: false, error: e.message, name: file.name })
      }
    }

    return results
  }

  // 打开文档（支持多种文件类型）
  async function openDocumentByType(documentId) {
    const doc = documents.value.find(d => d.id === documentId)
    if (!doc) {
      error.value = 'Document not found'
      return
    }

    if (doc.path) {
      return openDocumentByPath(doc.path, doc.project_id || projectsStore.activeProjectId)
    }
  }

  // 构建相对路径
  function buildRelativePath(doc) {
    const folder = doc.folder === '/' ? '' : doc.folder
    const filename = `${doc.title}.${doc.file_ext || 'md'}`
    return folder ? `${folder}/${filename}` : filename
  }

  // 在 docvault 中创建文档
  async function createDocumentInDocvault(projectId, title, folder = '/', type = 'markdown') {
    if (!projectId || !title) {
      throw new Error('Project ID and title are required')
    }

    // 清理标题
    let cleanTitle = title.trim()
    const ext = type === 'markdown' ? 'md' : type
    if (cleanTitle.endsWith(`.${ext}`)) {
      cleanTitle = cleanTitle.slice(0, -(ext.length + 1))
    }

    loading.value = true
    error.value = null

    try {
      // 初始化 docvault
      await initDocvault(projectId)

      // 构建相对路径
      const relativePath = folder === '/' ? `${cleanTitle}.${ext}` : `${folder}/${cleanTitle}.${ext}`.replace(/^\//, '')
      const initialContent = type === 'markdown' ? `# ${cleanTitle}\n\n` : ''

      // 写入文件
      await invoke('write_docvault_file', {
        projectId,
        relativePath,
        content: initialContent
      })

      // 重新扫描目录
      await loadDocuments(projectId)
      // 通过路径找到新创建的文档
      const newPath = '/' + relativePath
      const newDoc = documents.value.find(d => d.path === newPath)
      if (newDoc) {
        await openDocumentByPath(newPath, projectId)
      }
      return newPath
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        error.value = '该文件夹下已存在同名文件'
      } else {
        error.value = e.message || 'Failed to create document'
      }
      console.error('Failed to create document:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // 保存文档
  async function saveDocumentInDocvault() {
    if (!activeDocumentId.value || !hasUnsavedChanges.value) {
      return
    }

    const doc = documents.value.find(d => d.id === activeDocumentId.value)
    if (!doc || doc.type !== 'markdown' || !doc.path) {
      return // 只有 markdown 文件可以编辑保存
    }

    saving.value = true
    error.value = null

    try {
      const projectId = doc.project_id || projectsStore.activeProjectId

      await invoke('write_docvault_file', {
        projectId,
        relativePath: doc.path.replace(/^\//, ''),
        content: activeDocumentContent.value
      })

      doc.file_size = activeDocumentContent.value.length
      hasUnsavedChanges.value = false
    } catch (e) {
      error.value = e.message || 'Failed to save document'
      console.error('Failed to save document:', e)
      throw e
    } finally {
      saving.value = false
    }
  }

  // 在 docvault 中创建文件夹
  async function createFolderInDocvault(projectId, folderPath) {
    if (!projectId || !folderPath) {
      throw new Error('Project ID and folder path are required')
    }

    try {
      await invoke('create_docvault_folder', { projectId, folderPath })
      await loadDocuments(projectId)
      return folderPath
    } catch (e) {
      error.value = e.message || 'Failed to create folder'
      console.error('Failed to create folder:', e)
      throw e
    }
  }

  // 删除 docvault 中的文件或文件夹
  async function deleteInDocvault(projectId, itemPath) {
    if (!projectId || !itemPath) {
      throw new Error('Project ID and item path are required')
    }

    try {
      await invoke('delete_docvault_item', { projectId, itemPath })
    } catch (e) {
      console.error('Failed to delete in docvault:', e)
      throw e
    }
  }

  // 重命名 docvault 中的文件或文件夹
  async function renameInDocvault(projectId, oldPath, newPath) {
    if (!projectId || !oldPath || !newPath) {
      throw new Error('Project ID and paths are required')
    }

    try {
      await invoke('rename_docvault_item', { projectId, oldPath, newPath })
    } catch (e) {
      console.error('Failed to rename in docvault:', e)
      throw e
    }
  }

  // 保存附件图片到 docvault
  async function saveAttachment(projectId, filename, imageData) {
    if (!projectId || !filename || !imageData) {
      throw new Error('Project ID, filename and image data are required')
    }

    try {
      const relativePath = await invoke('save_docvault_attachment', {
        projectId,
        filename,
        imageData
      })
      return relativePath
    } catch (e) {
      console.error('Failed to save attachment:', e)
      throw e
    }
  }

  // 扫描 docvault 目录
  async function scanDocvault(projectId) {
    if (!projectId) return []

    try {
      return await invoke('scan_docvault', { projectId })
    } catch (e) {
      console.error('Failed to scan docvault:', e)
      return []
    }
  }

  // 在资源管理器中打开文件或文件夹
  async function openInExplorer(itemPath) {
    const projectId = projectsStore.activeProjectId
    if (!projectId) {
      console.warn('openInExplorer: no active project')
      return
    }

    console.log('openInExplorer:', { projectId, itemPath })

    try {
      await invoke('open_in_explorer', {
        projectId,
        itemPath: itemPath || '/'
      })
    } catch (e) {
      console.error('Failed to open in explorer:', e, { projectId, itemPath })
      throw e
    }
  }

  return {
    // State
    documents,
    recentDocuments,
    fileTree,
    activeDocumentId,
    activeDocumentPath,
    activeDocumentContent,
    activeDocumentBinary,
    loading,
    saving,
    error,
    hasUnsavedChanges,
    emptyFolders,

    // Getters
    activeDocument,
    documentsByFolder,

    // Actions
    loadDocuments,
    refreshDocuments,
    saveDocument,
    updateContent,
    closeDocument,
    createDocument,
    deleteDocument,
    renameDocument,
    copyDocument,
    moveDocument,
    createFolder,
    renameFolder,
    deleteFolder,
    clearError,
    initDocvault,
    getDocvaultPath,
    importFile,
    importFiles,
    openDocumentByType,
    openDocumentByPath,
    createDocumentInDocvault,
    saveDocumentInDocvault,
    createFolderInDocvault,
    deleteInDocvault,
    renameInDocvault,
    saveAttachment,
    scanDocvault,
    buildRelativePath,
    openInExplorer
  }
})
