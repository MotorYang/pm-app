// Documents Store - Manage documents in database with docvault support
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Database from '@tauri-apps/plugin-sql'
import { invoke } from '@tauri-apps/api/core'
import { useProjectsStore } from './projects'
import { getFileType, getExtension, getBasename } from '@/utils/fileTypes'

export const useDocumentsStore = defineStore('documents', () => {
  const projectsStore = useProjectsStore()

  // State
  const documents = ref([])
  const fileTree = ref([]) // 文件系统树形结构
  const activeDocumentId = ref(null)
  const activeDocumentPath = ref(null) // 当前文档的相对路径
  const activeDocumentContent = ref('')
  const activeDocumentBinary = ref(null) // For binary files (PDF, images)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(null)
  const emptyFolders = ref([]) // 存储空文件夹路径
  const useDocvault = ref(true) // 是否使用新的 docvault 存储模式
  const useFileSystemMode = ref(true) // 使用文件系统扫描模式

  // Database connection
  let db = null
  async function getDb() {
    if (!db) {
      db = await Database.load('sqlite:pm-app.db')
    }
    return db
  }

  // Getters
  const activeDocument = computed(() => {
    return documents.value.find(doc => doc.id === activeDocumentId.value) || null
  })

  const hasUnsavedChanges = ref(false)

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
      if (useFileSystemMode.value) {
        // 文件系统扫描模式
        await initDocvault(projectId)
        const scanResult = await invoke('scan_docvault', { projectId })
        fileTree.value = scanResult
        documents.value = flattenScanResult(scanResult)
      } else {
        // 数据库模式（保留兼容）
        const database = await getDb()
        const result = await database.select(
          'SELECT * FROM documents WHERE project_id = ? ORDER BY folder, title',
          [projectId]
        )
        documents.value = result
      }

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

      hasUnsavedChanges.value = false
    } catch (e) {
      error.value = e.message || 'Failed to open document'
      console.error('Failed to open document:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function openDocument(documentId) {
    const doc = documents.value.find(d => d.id === documentId)
    if (!doc) {
      error.value = 'Document not found'
      return
    }

    loading.value = true
    error.value = null

    try {
      // Read document content from file system
      const content = await invoke('read_document_content', { docId: documentId })
      activeDocumentId.value = documentId
      activeDocumentContent.value = content || ''
      hasUnsavedChanges.value = false

      // 更新文档的访问时间
      const database = await getDb()
      await database.execute(
        'UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [documentId]
      )
      doc.updated_at = new Date().toISOString()
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

    // 文件系统模式下使用 docvault 保存
    if (useFileSystemMode.value) {
      return saveDocumentInDocvault()
    }

    saving.value = true
    error.value = null

    try {
      // Write document content to file system
      await invoke('write_document_content', {
        docId: activeDocumentId.value,
        content: activeDocumentContent.value
      })

      // Update document timestamp in database
      const database = await getDb()
      await database.execute(
        'UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [activeDocumentId.value]
      )

      // Update local document
      const doc = documents.value.find(d => d.id === activeDocumentId.value)
      if (doc) {
        doc.updated_at = new Date().toISOString()
      }

      hasUnsavedChanges.value = false
    } catch (e) {
      error.value = e.message || 'Failed to save document'
      console.error('Failed to save document:', e)
      throw e
    } finally {
      saving.value = false
    }
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

    // 文件系统模式下，使用 docvault 创建
    if (useFileSystemMode.value) {
      return createDocumentInDocvault(projectId, title, folder, 'markdown')
    }

    // Remove .md extension if present (we'll add it when displaying)
    let cleanTitle = title.trim()
    if (cleanTitle.endsWith('.md')) {
      cleanTitle = cleanTitle.slice(0, -3)
    }

    loading.value = true
    error.value = null

    try {
      const database = await getDb()
      // Create document record in database (without content)
      const result = await database.execute(
        'INSERT INTO documents (project_id, title, folder) VALUES (?, ?, ?)',
        [projectId, cleanTitle, folder]
      )

      const docId = result.lastInsertId

      // Create document folder structure in file system
      await invoke('create_document_folder', { docId })

      // Write initial content to file
      const initialContent = '# ' + cleanTitle + '\n\n开始编写...'
      await invoke('write_document_content', { docId, content: initialContent })

      // Reload documents
      await loadDocuments(projectId)

      // Open the newly created document
      const newDoc = documents.value.find(d => d.id === docId)
      if (newDoc) {
        await openDocument(newDoc.id)
      }

      return docId
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE constraint failed')) {
        error.value = '该文件夹下已存在同名文档'
      } else {
        error.value = e.message || 'Failed to create document'
      }
      console.error('Failed to create document:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteDocument(documentId) {
    if (!documentId) {
      throw new Error('Document ID is required')
    }

    loading.value = true
    error.value = null

    try {
      // 文件系统模式下使用 docvault 删除
      if (useFileSystemMode.value) {
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
        return
      }

      // 旧模式：删除文档文件夹
      await invoke('delete_document_folder', { docId: documentId })

      // Delete document record from database
      const database = await getDb()
      await database.execute('DELETE FROM documents WHERE id = ?', [documentId])

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

    // Remove .md extension if present
    let cleanTitle = newTitle.trim()
    if (cleanTitle.endsWith('.md')) {
      cleanTitle = cleanTitle.slice(0, -3)
    }

    loading.value = true
    error.value = null

    try {
      const database = await getDb()
      await database.execute(
        'UPDATE documents SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [cleanTitle, documentId]
      )

      // Update local document
      const doc = documents.value.find(d => d.id === documentId)
      if (doc) {
        doc.title = cleanTitle
        doc.updated_at = new Date().toISOString()
      }
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE constraint failed')) {
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
      // 文件系统模式下使用 docvault 复制
      if (useFileSystemMode.value) {
        const projectId = doc.project_id || projectsStore.activeProjectId
        await invoke('copy_docvault_item', {
          projectId,
          sourcePath: doc.path,
          targetFolder
        })

        // 重新加载文档列表
        await loadDocuments(projectId)
        return doc.path
      }

      // 旧模式：数据库方式
      const database = await getDb()

      // 读取原文档内容
      const content = await invoke('read_document_content', { docId: documentId })

      // 生成新标题（添加 "副本" 后缀）
      let newTitle = doc.title + ' 副本'
      let suffix = 1

      // 检查是否存在同名文档
      while (documents.value.some(d => d.title === newTitle && d.folder === targetFolder)) {
        suffix++
        newTitle = `${doc.title} 副本 ${suffix}`
      }

      // 创建新文档记录
      const result = await database.execute(
        'INSERT INTO documents (project_id, title, folder) VALUES (?, ?, ?)',
        [doc.project_id, newTitle, targetFolder]
      )

      const newDocId = result.lastInsertId

      // 创建文档文件夹
      await invoke('create_document_folder', { docId: newDocId })

      // 写入内容
      await invoke('write_document_content', { docId: newDocId, content })

      // 复制图片文件夹（如果存在）
      try {
        await invoke('copy_document_images', { sourceDocId: documentId, targetDocId: newDocId })
      } catch (e) {
        // 图片复制失败不影响主流程
        console.warn('Failed to copy images:', e)
      }

      // 重新加载文档列表
      await loadDocuments(doc.project_id)

      return newDocId
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
      // 文件系统模式下使用 docvault 移动
      if (useFileSystemMode.value) {
        const projectId = doc.project_id || projectsStore.activeProjectId
        await invoke('move_docvault_item', {
          projectId,
          sourcePath: doc.path,
          targetFolder
        })

        // 重新加载文档列表
        await loadDocuments(projectId)
        return
      }

      // 旧模式：数据库方式
      const database = await getDb()

      // 检查目标文件夹是否存在同名文档
      const existing = documents.value.find(d => d.title === doc.title && d.folder === targetFolder)
      if (existing) {
        throw new Error('目标文件夹已存在同名文档')
      }

      // 更新文档的 folder 字段
      await database.execute(
        'UPDATE documents SET folder = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [targetFolder, documentId]
      )

      // 更新本地文档
      doc.folder = targetFolder
      doc.updated_at = new Date().toISOString()
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
      const database = await getDb()

      // 构建新路径
      const parts = oldPath.split('/').filter(p => p)
      parts[parts.length - 1] = newName
      const newPath = '/' + parts.join('/')

      // 检查新路径是否已存在
      const existingDoc = documents.value.some(d => d.folder === newPath)
      const existingEmpty = emptyFolders.value.includes(newPath)
      if (existingDoc || existingEmpty) {
        throw new Error('已存在同名文件夹')
      }

      // 更新所有该文件夹下的文档
      await database.execute(
        'UPDATE documents SET folder = ?, updated_at = CURRENT_TIMESTAMP WHERE folder = ?',
        [newPath, oldPath]
      )

      // 更新本地文档列表
      documents.value.forEach(doc => {
        if (doc.folder === oldPath) {
          doc.folder = newPath
          doc.updated_at = new Date().toISOString()
        }
      })

      // 更新空文件夹列表
      const emptyIndex = emptyFolders.value.indexOf(oldPath)
      if (emptyIndex !== -1) {
        emptyFolders.value[emptyIndex] = newPath
        emptyFolders.value.sort()
      }
    } catch (e) {
      error.value = e.message || 'Failed to rename folder'
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

    // 文件系统模式下，在 docvault 中创建文件夹
    if (useFileSystemMode.value && projectsStore.activeProjectId) {
      return createFolderInDocvault(projectsStore.activeProjectId, folderPath)
    }

    // 检查文件夹是否已存在（在文档中或空文件夹列表中）
    const existingDocs = documents.value.filter(d => d.folder === folderPath)
    if (existingDocs.length > 0 || emptyFolders.value.includes(folderPath)) {
      throw new Error('文件夹已存在')
    }

    // 添加到空文件夹列表
    emptyFolders.value.push(folderPath)
    emptyFolders.value.sort()

    return folderPath
  }

  // 删除文件夹及其下所有文档
  async function deleteFolder(folderPath) {
    if (!folderPath) {
      throw new Error('Folder path is required')
    }

    loading.value = true
    error.value = null

    try {
      // 文件系统模式下使用 docvault 删除
      if (useFileSystemMode.value) {
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
        return
      }

      // 旧模式：获取该文件夹下所有文档
      const docsInFolder = documents.value.filter(d => d.folder === folderPath)

      // 删除每个文档
      for (const doc of docsInFolder) {
        await invoke('delete_document_folder', { docId: doc.id })
      }

      // 从数据库中删除
      const database = await getDb()
      await database.execute('DELETE FROM documents WHERE folder = ?', [folderPath])

      // 更新本地列表
      documents.value = documents.value.filter(d => d.folder !== folderPath)

      // 从空文件夹列表中移除
      emptyFolders.value = emptyFolders.value.filter(f => f !== folderPath)

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

  // 获取最近打开的文档（跨项目）
  const recentDocuments = ref([])

  async function loadRecentDocuments(limit = 10) {
    try {
      const database = await getDb()
      const result = await database.select(
        `SELECT d.*, p.name as project_name, p.color as project_color
         FROM documents d
         LEFT JOIN projects p ON d.project_id = p.id
         ORDER BY d.updated_at DESC
         LIMIT ?`,
        [limit]
      )
      recentDocuments.value = result
      return result
    } catch (e) {
      console.error('Failed to load recent documents:', e)
      return []
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

      // 文件系统模式下，只需要重新扫描目录即可
      if (useFileSystemMode.value) {
        await loadDocuments(projectId)
        return fileInfo.filename
      }

      // 非文件系统模式：插入数据库记录
      const database = await getDb()
      const result = await database.execute(
        'INSERT INTO documents (project_id, title, folder, type, file_ext, file_size) VALUES (?, ?, ?, ?, ?, ?)',
        [projectId, fileInfo.filename, targetFolder, fileInfo.file_type, fileInfo.ext, fileInfo.size]
      )

      // 重新加载文档列表
      await loadDocuments(projectId)

      return result.lastInsertId
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE constraint failed')) {
        error.value = '该文件夹下已存在同名文件'
      } else if (e.message && e.message.includes('already exists')) {
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

    // 文件系统模式下，使用路径打开
    if (useFileSystemMode.value && doc.path) {
      return openDocumentByPath(doc.path, doc.project_id || projectsStore.activeProjectId)
    }

    loading.value = true
    error.value = null
    activeDocumentBinary.value = null

    try {
      activeDocumentId.value = documentId

      // 根据文件类型读取内容
      if (doc.type === 'markdown') {
        // Markdown 文件读取文本内容
        if (useDocvault.value) {
          const relativePath = buildRelativePath(doc)
          const content = await invoke('read_docvault_file', {
            projectId: doc.project_id,
            relativePath
          })
          activeDocumentContent.value = content || ''
        } else {
          // 兼容旧模式
          const content = await invoke('read_document_content', { docId: documentId })
          activeDocumentContent.value = content || ''
        }
        activeDocumentBinary.value = null
      } else if (doc.type === 'pdf' || doc.type === 'image') {
        // 二进制文件
        activeDocumentContent.value = ''
        if (useDocvault.value) {
          const relativePath = buildRelativePath(doc)
          const binaryData = await invoke('read_docvault_binary', {
            projectId: doc.project_id,
            relativePath
          })
          activeDocumentBinary.value = binaryData
        }
      }

      hasUnsavedChanges.value = false

      // 更新访问时间（仅非文件系统模式）
      if (!useFileSystemMode.value) {
        const database = await getDb()
        await database.execute(
          'UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [documentId]
        )
        doc.updated_at = new Date().toISOString()
      }
    } catch (e) {
      error.value = e.message || 'Failed to open document'
      console.error('Failed to open document:', e)
      throw e
    } finally {
      loading.value = false
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

      // 文件系统模式下，只需要重新扫描目录
      if (useFileSystemMode.value) {
        await loadDocuments(projectId)
        // 通过路径找到新创建的文档
        const newPath = '/' + relativePath
        const newDoc = documents.value.find(d => d.path === newPath)
        if (newDoc) {
          await openDocumentByPath(newPath, projectId)
        }
        return newPath
      }

      // 非文件系统模式：插入数据库记录
      const database = await getDb()
      const result = await database.execute(
        'INSERT INTO documents (project_id, title, folder, type, file_ext, file_size) VALUES (?, ?, ?, ?, ?, ?)',
        [projectId, cleanTitle, folder, type, ext, initialContent.length]
      )

      const docId = result.lastInsertId

      // 重新加载并打开新文档
      await loadDocuments(projectId)

      const newDoc = documents.value.find(d => d.id === docId)
      if (newDoc) {
        await openDocumentByType(newDoc.id)
      }

      return docId
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE constraint failed')) {
        error.value = '该文件夹下已存在同名文件'
      } else if (e.message && e.message.includes('already exists')) {
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

  // 保存文档（支持 docvault 模式）
  async function saveDocumentInDocvault() {
    if (!activeDocumentId.value || !hasUnsavedChanges.value) {
      return
    }

    const doc = documents.value.find(d => d.id === activeDocumentId.value)
    if (!doc || doc.type !== 'markdown') {
      return // 只有 markdown 文件可以编辑保存
    }

    saving.value = true
    error.value = null

    try {
      const projectId = doc.project_id || projectsStore.activeProjectId

      if (useFileSystemMode.value && doc.path) {
        // 文件系统模式：使用文档的 path 字段
        await invoke('write_docvault_file', {
          projectId,
          relativePath: doc.path.replace(/^\//, ''),
          content: activeDocumentContent.value
        })
      } else if (useDocvault.value) {
        const relativePath = buildRelativePath(doc)
        await invoke('write_docvault_file', {
          projectId,
          relativePath,
          content: activeDocumentContent.value
        })
      } else {
        // 兼容旧模式
        await invoke('write_document_content', {
          docId: activeDocumentId.value,
          content: activeDocumentContent.value
        })
      }

      // 文件系统模式下不更新数据库
      if (!useFileSystemMode.value) {
        const database = await getDb()
        await database.execute(
          'UPDATE documents SET updated_at = CURRENT_TIMESTAMP, file_size = ? WHERE id = ?',
          [activeDocumentContent.value.length, activeDocumentId.value]
        )
        doc.updated_at = new Date().toISOString()
      }

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

      // 文件系统模式下重新扫描目录
      if (useFileSystemMode.value) {
        await loadDocuments(projectId)
      } else {
        // 添加到空文件夹列表
        if (!emptyFolders.value.includes(folderPath)) {
          emptyFolders.value.push(folderPath)
          emptyFolders.value.sort()
        }
      }

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
    fileTree,
    activeDocumentId,
    activeDocumentPath,
    activeDocumentContent,
    activeDocumentBinary,
    loading,
    saving,
    error,
    hasUnsavedChanges,
    recentDocuments,
    emptyFolders,
    useDocvault,
    useFileSystemMode,

    // Getters
    activeDocument,
    documentsByFolder,

    // Actions (Legacy)
    loadDocuments,
    refreshDocuments,
    openDocument,
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
    loadRecentDocuments,
    clearError,

    // Actions (DocVault / FileSystem Mode)
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
