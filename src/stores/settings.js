import { defineStore } from 'pinia'
import { ref } from 'vue'
import Database from '@tauri-apps/plugin-sql'

// 预设主题色
export const THEME_COLORS = [
  { id: 'pink', label: '樱花粉', color: '#FF6B9D' },
  { id: 'blue', label: '天空蓝', color: '#3498DB' },
  { id: 'teal', label: '薄荷青', color: '#4ECDC4' },
  { id: 'orange', label: '暖阳橙', color: '#FFA94D' },
  { id: 'purple', label: '梦幻紫', color: '#9B59B6' },
  { id: 'green', label: '森林绿', color: '#27AE60' },
]

// 图片保存位置选项
export const IMAGE_SAVE_LOCATIONS = [
  { id: '.attachments', label: '.attachments 文件夹', description: '保存到文档同级的 .attachments 隐藏文件夹' },
  { id: 'same', label: '文档同级目录', description: '直接保存到与文档相同的目录' },
  { id: 'assets', label: 'assets 文件夹', description: '保存到文档同级的 assets 文件夹' },
  { id: 'images', label: 'images 文件夹', description: '保存到文档同级的 images 文件夹' },
]

export const useSettingsStore = defineStore('settings', () => {
  const db = ref(null)
  const editorPath = ref('')
  const closeButtonBehavior = ref('hide') // 'hide' or 'quit'
  const exportProjectBehavior = ref('ignore-plugin-directory') // 'ignore-plugin-directory' | 'all-directory'
  const themeColor = ref('pink') // 默认主题色
  const imageAttachmentPath = ref('.attachments') // 图片保存位置，默认 .attachments
  const loading = ref(false)
  const error = ref(null)

  // Initialize database
  const initDB = async () => {
    if (!db.value) {
      db.value = await Database.load('sqlite:pomo.db')
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

      // themeColor
      const themeResult = await db.value.select(
          "SELECT value FROM app_settings WHERE key = 'theme_color'"
      )
      themeColor.value = themeResult.length > 0 ? themeResult[0].value : 'pink'
      applyThemeColor(themeColor.value)

      // imageAttachmentPath
      const imagePathResult = await db.value.select(
          "SELECT value FROM app_settings WHERE key = 'image_attachment_path'"
      )
      imageAttachmentPath.value = imagePathResult.length > 0 ? imagePathResult[0].value : '.attachments'

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

  // Apply theme color to CSS variables
  const applyThemeColor = (colorId) => {
    const theme = THEME_COLORS.find(t => t.id === colorId)
    if (theme) {
      document.documentElement.style.setProperty('--color-primary', theme.color)
    }
  }

  // Save themeColor
  const saveThemeColor = async (colorId) => {
    try {
      loading.value = true
      error.value = null
      await saveSetting('theme_color', colorId)
      themeColor.value = colorId
      applyThemeColor(colorId)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Save imageAttachmentPath
  const saveImageAttachmentPath = async (path) => {
    try {
      loading.value = true
      error.value = null
      await saveSetting('image_attachment_path', path)
      imageAttachmentPath.value = path
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
    themeColor,
    imageAttachmentPath,
    loading,
    error,

    // Actions
    loadSettings,
    saveEditorPath,
    saveCloseButtonBehavior,
    saveExportProjectBehavior,
    saveThemeColor,
    saveImageAttachmentPath,
    applyThemeColor
  }
})
