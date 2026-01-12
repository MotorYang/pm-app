// Documents Store - Manage markdown documents in database
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Database from '@tauri-apps/plugin-sql'
import { invoke } from '@tauri-apps/api/core'
import { useProjectsStore } from './projects'

export const useDocumentsStore = defineStore('documents', () => {
  const projectsStore = useProjectsStore()

  // State
  const documents = ref([])
  const activeDocumentId = ref(null)
  const activeDocumentContent = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(null)
  const emptyFolders = ref([]) // 存储空文件夹路径

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

  // Actions
  async function loadDocuments(projectId) {
    if (!projectId) {
      documents.value = []
      closeDocument()
      return
    }

    loading.value = true
    error.value = null

    try {
      const database = await getDb()
      const result = await database.select(
        'SELECT * FROM documents WHERE project_id = ? ORDER BY folder, title',
        [projectId]
      )
      documents.value = result

      // 自动打开第一个文档
      if (result.length > 0) {
        await openDocument(result[0].id)
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
      // Delete document folder from file system
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
      // 获取该文件夹下所有文档
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

  return {
    // State
    documents,
    activeDocumentId,
    activeDocumentContent,
    loading,
    saving,
    error,
    hasUnsavedChanges,
    recentDocuments,
    emptyFolders,

    // Getters
    activeDocument,
    documentsByFolder,

    // Actions
    loadDocuments,
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
    clearError
  }
})
