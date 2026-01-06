import { defineStore } from 'pinia'
import { ref } from 'vue'
import Database from '@tauri-apps/plugin-sql'

export const useSettingsStore = defineStore('settings', () => {
  const db = ref(null)
  const editorPath = ref('')
  const loading = ref(false)
  const error = ref(null)

  // Initialize database
  const initDB = async () => {
    if (!db.value) {
      db.value = await Database.load('sqlite:pm-app.db')
    }
  }

  // Load settings from database
  const loadSettings = async () => {
    try {
      loading.value = true
      error.value = null

      await initDB()

      // Load editor path
      const result = await db.value.select(
        "SELECT value FROM app_settings WHERE key = 'editor_path'"
      )

      if (result.length > 0) {
        editorPath.value = result[0].value
      }
    } catch (err) {
      error.value = err.message
      console.error('Failed to load settings:', err)
    } finally {
      loading.value = false
    }
  }

  // Save editor path
  const saveEditorPath = async (path) => {
    try {
      loading.value = true
      error.value = null

      await initDB()

      // Check if setting exists
      const result = await db.value.select(
        "SELECT value FROM app_settings WHERE key = 'editor_path'"
      )

      if (result.length > 0) {
        // Update existing setting
        await db.value.execute(
          "UPDATE app_settings SET value = $1 WHERE key = 'editor_path'",
          [path]
        )
      } else {
        // Insert new setting
        await db.value.execute(
          "INSERT INTO app_settings (key, value) VALUES ('editor_path', $1)",
          [path]
        )
      }

      editorPath.value = path
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    editorPath,
    loading,
    error,

    // Actions
    loadSettings,
    saveEditorPath
  }
})
