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
    loadRecentDocuments,
    clearError
  }
})
