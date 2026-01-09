import { defineStore } from 'pinia'
import { ref } from 'vue'
import Database from '@tauri-apps/plugin-sql'

export const useSettingsStore = defineStore('settings', () => {
  const db = ref(null)
  const editorPath = ref('')
  const closeButtonBehavior = ref('hide') // 'hide' or 'quit'
  const exportProjectBehavior = ref('ignore-plugin-directory') // 'ignore-plugin-directory' | 'all-directory'
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

      // editorPath
      const editorResult = await db.value.select(
          "SELECT value FROM app_settings WHERE key = 'editor_path'"
      )
      if (editorResult.length > 0) editorPath.value = editorResult[0].value

      // closeButtonBehavior
      const closeResult = await db.value.select(
          "SELECT value FROM app_settings WHERE key = 'close_button_behavior'"
      )
      closeButtonBehavior.value = closeResult.length > 0 ? closeResult[0].value : 'hide'

      // exportProjectBehavior
      const exportResult = await db.value.select(
          "SELECT value FROM app_settings WHERE key = 'export_project_behavior'"
      )
      exportProjectBehavior.value = exportResult.length > 0
          ? exportResult[0].value
          : 'ignore-plugin-directory'

    } catch (err) {
      error.value = err.message
      console.error('Failed to load settings:', err)
    } finally {
      loading.value = false
    }
  }

  // Save generic setting
  const saveSetting = async (key, value) => {
    await initDB()
    const result = await db.value.select("SELECT value FROM app_settings WHERE key = $1", [key])
    if (result.length > 0) {
      await db.value.execute("UPDATE app_settings SET value = $1 WHERE key = $2", [value, key])
    } else {
      await db.value.execute("INSERT INTO app_settings (key, value) VALUES ($1, $2)", [key, value])
    }
  }

  // Save editorPath
  const saveEditorPath = async (path) => {
    try {
      loading.value = true
      error.value = null
      await saveSetting('editor_path', path)
      editorPath.value = path
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Save closeButtonBehavior
  const saveCloseButtonBehavior = async (behavior) => {
    try {
      loading.value = true
      error.value = null
      await saveSetting('close_button_behavior', behavior)
      closeButtonBehavior.value = behavior
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Save exportProjectBehavior
  const saveExportProjectBehavior = async (behavior) => {
    try {
      loading.value = true
      error.value = null
      await saveSetting('export_project_behavior', behavior)
      exportProjectBehavior.value = behavior
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
    closeButtonBehavior,
    exportProjectBehavior,
    loading,
    error,

    // Actions
    loadSettings,
    saveEditorPath,
    saveCloseButtonBehavior,
    saveExportProjectBehavior
  }
})
