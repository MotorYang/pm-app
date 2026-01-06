import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Database from '@tauri-apps/plugin-sql'
import { invoke } from '@tauri-apps/api/core'

export const useVaultStore = defineStore('vault', () => {
  const db = ref(null)
  const isUnlocked = ref(false)
  const masterPassword = ref('')
  const entries = ref([])
  const selectedEntry = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const currentProjectId = ref(null)

  // Initialize database
  const initDB = async () => {
    if (!db.value) {
      db.value = await Database.load('sqlite:pm-app.db')
    }
  }

  // Check if vault is initialized for a project
  const isVaultInitialized = async (projectId) => {
    await initDB()
    const result = await db.value.select(
      'SELECT COUNT(*) as count FROM vault_master WHERE project_id = $1',
      [projectId]
    )
    return result[0].count > 0
  }

  // Initialize vault for a project
  const initVault = async (projectId, password) => {
    try {
      loading.value = true
      error.value = null

      await initDB()

      // Check if vault already exists
      const exists = await isVaultInitialized(projectId)
      if (exists) {
        throw new Error('保险箱已初始化')
      }

      // Hash password using Rust Argon2 (same algorithm as verification)
      const [passwordHash, salt] = await invoke('vault_hash_password', {
        password
      })

      // Store hashed password in database
      await db.value.execute(
        'INSERT INTO vault_master (project_id, password_hash, salt) VALUES ($1, $2, $3)',
        [projectId, passwordHash, salt]
      )

      return true
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Unlock vault (verify master password)
  const unlockVault = async (projectId, password) => {
    try {
      loading.value = true
      error.value = null

      await initDB()

      // Get stored password hash
      const result = await db.value.select(
        'SELECT password_hash FROM vault_master WHERE project_id = $1',
        [projectId]
      )

      if (result.length === 0) {
        throw new Error('保险箱未初始化')
      }

      const passwordHash = result[0].password_hash

      // Verify password using Rust command
      const isValid = await invoke('vault_verify_master', {
        projectId,
        masterPassword: password,
        passwordHash
      })

      if (!isValid) {
        throw new Error('密码错误')
      }

      // Store master password in memory for encryption/decryption
      masterPassword.value = password
      currentProjectId.value = projectId
      isUnlocked.value = true

      // Load entries
      await loadEntries(projectId)

      return true
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Lock vault
  const lockVault = () => {
    isUnlocked.value = false
    masterPassword.value = ''
    currentProjectId.value = null
    entries.value = []
    selectedEntry.value = null
  }

  // Load all vault entries for a project
  const loadEntries = async (projectId) => {
    try {
      loading.value = true
      error.value = null

      await initDB()

      const result = await db.value.select(
        `SELECT id, project_id, title, username, encrypted_password, encrypted_notes,
         url, category, salt, nonce, created_at, updated_at
         FROM vault_entries WHERE project_id = $1 ORDER BY created_at DESC`,
        [projectId]
      )

      entries.value = result
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Create a new vault entry
  const createEntry = async (entryData) => {
    try {
      loading.value = true
      error.value = null

      if (!isUnlocked.value) {
        throw new Error('保险箱已锁定')
      }

      await initDB()

      // Encrypt password and notes using Rust command
      const [encryptedPassword, nonce, encryptedNotes, , salt] = await invoke(
        'vault_encrypt_entry',
        {
          password: entryData.password,
          notes: entryData.notes || null,
          masterPassword: masterPassword.value
        }
      )

      // Insert into database
      await db.value.execute(
        `INSERT INTO vault_entries
         (project_id, title, username, encrypted_password, encrypted_notes, url, category, salt, nonce)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          currentProjectId.value,
          entryData.title,
          entryData.username || null,
          encryptedPassword,
          encryptedNotes || null,
          entryData.url || null,
          entryData.category || 'general',
          salt,
          nonce
        ]
      )

      // Reload entries
      await loadEntries(currentProjectId.value)

      return true
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update a vault entry
  const updateEntry = async (entryId, entryData) => {
    try {
      loading.value = true
      error.value = null

      if (!isUnlocked.value) {
        throw new Error('保险箱已锁定')
      }

      await initDB()

      // Encrypt password and notes using Rust command
      const [encryptedPassword, nonce, encryptedNotes, , salt] = await invoke(
        'vault_encrypt_entry',
        {
          password: entryData.password,
          notes: entryData.notes || null,
          masterPassword: masterPassword.value
        }
      )

      // Update in database
      await db.value.execute(
        `UPDATE vault_entries
         SET title = $1, username = $2, encrypted_password = $3, encrypted_notes = $4,
             url = $5, category = $6, salt = $7, nonce = $8, updated_at = CURRENT_TIMESTAMP
         WHERE id = $9`,
        [
          entryData.title,
          entryData.username || null,
          encryptedPassword,
          encryptedNotes || null,
          entryData.url || null,
          entryData.category || 'general',
          salt,
          nonce,
          entryId
        ]
      )

      // Reload entries
      await loadEntries(currentProjectId.value)

      return true
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete a vault entry
  const deleteEntry = async (entryId) => {
    try {
      loading.value = true
      error.value = null

      await initDB()

      await db.value.execute('DELETE FROM vault_entries WHERE id = $1', [entryId])

      // Reload entries
      await loadEntries(currentProjectId.value)

      return true
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Decrypt a vault entry
  const decryptEntry = async (entry) => {
    try {
      if (!isUnlocked.value) {
        throw new Error('保险箱已锁定')
      }

      // Decrypt using Rust command
      const [password, notes] = await invoke('vault_decrypt_entry', {
        encryptedPassword: entry.encrypted_password,
        nonce: entry.nonce,
        encryptedNotes: entry.encrypted_notes || null,
        salt: entry.salt,
        masterPassword: masterPassword.value
      })

      return {
        id: entry.id,
        project_id: entry.project_id,
        title: entry.title,
        username: entry.username,
        password,
        notes,
        url: entry.url,
        category: entry.category,
        created_at: entry.created_at,
        updated_at: entry.updated_at
      }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Generate a random password
  const generatePassword = async (options = {}) => {
    const {
      length = 16,
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSymbols = true
    } = options

    try {
      const password = await invoke('vault_generate_password', {
        length,
        includeUppercase,
        includeLowercase,
        includeNumbers,
        includeSymbols
      })
      return password
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Computed properties
  const entriesByCategory = computed(() => {
    const categories = {}
    entries.value.forEach(entry => {
      const cat = entry.category || 'general'
      if (!categories[cat]) {
        categories[cat] = []
      }
      categories[cat].push(entry)
    })
    return categories
  })

  const entryCount = computed(() => entries.value.length)

  return {
    // State
    isUnlocked,
    entries,
    selectedEntry,
    loading,
    error,
    currentProjectId,

    // Actions
    isVaultInitialized,
    initVault,
    unlockVault,
    lockVault,
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    decryptEntry,
    generatePassword,

    // Computed
    entriesByCategory,
    entryCount
  }
})
