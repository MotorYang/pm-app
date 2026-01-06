// Documents Store - Manage markdown documents in database
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Database from '@tauri-apps/plugin-sql'
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

    activeDocumentId.value = documentId
    activeDocumentContent.value = doc.content || ''
    hasUnsavedChanges.value = false
  }

  async function saveDocument() {
    if (!activeDocumentId.value || !hasUnsavedChanges.value) {
      return
    }

    saving.value = true
    error.value = null

    try {
      const database = await getDb()
      await database.execute(
        'UPDATE documents SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [activeDocumentContent.value, activeDocumentId.value]
      )

      // Update local document
      const doc = documents.value.find(d => d.id === activeDocumentId.value)
      if (doc) {
        doc.content = activeDocumentContent.value
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
      const result = await database.execute(
        'INSERT INTO documents (project_id, title, content, folder) VALUES (?, ?, ?, ?)',
        [projectId, cleanTitle, '# ' + cleanTitle + '\n\n开始编写...', folder]
      )

      // Reload documents
      await loadDocuments(projectId)

      // Open the newly created document
      const newDoc = documents.value.find(d =>
        d.project_id === projectId &&
        d.title === cleanTitle &&
        d.folder === folder
      )

      if (newDoc) {
        await openDocument(newDoc.id)
      }

      return result.lastInsertId
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

  return {
    // State
    documents,
    activeDocumentId,
    activeDocumentContent,
    loading,
    saving,
    error,
    hasUnsavedChanges,

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
    clearError
  }
})
