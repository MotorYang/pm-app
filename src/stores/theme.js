// Theme Store - Manage light/dark mode and UI preferences
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // State
  const mode = ref('light')
  const systemPreference = ref(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

  // Getters
  const isDark = computed(() => mode.value === 'dark')
  const currentTheme = computed(() => mode.value)

  // Actions
  function setTheme(newMode) {
    if (newMode !== 'light' && newMode !== 'dark') {
      console.warn(`Invalid theme mode: ${newMode}. Using 'light' as default.`)
      newMode = 'light'
    }
    mode.value = newMode
    applyTheme()
    saveThemePreference()
  }

  function toggleTheme() {
    const newMode = mode.value === 'light' ? 'dark' : 'light'
    setTheme(newMode)
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', mode.value)
  }

  function loadThemePreference() {
    try {
      const saved = localStorage.getItem('pm-app-theme')
      if (saved && (saved === 'light' || saved === 'dark')) {
        mode.value = saved
      } else {
        // Use system preference on first load
        mode.value = systemPreference.value
      }
      applyTheme()
    } catch (error) {
      console.error('Failed to load theme preference:', error)
      mode.value = 'light'
      applyTheme()
    }
  }

  function saveThemePreference() {
    try {
      localStorage.setItem('pm-app-theme', mode.value)
    } catch (error) {
      console.error('Failed to save theme preference:', error)
    }
  }

  function initTheme() {
    loadThemePreference()

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      systemPreference.value = e.matches ? 'dark' : 'light'
      // Optionally auto-switch if user hasn't set a preference
      // For now, we respect the user's manual choice
    })
  }

  return {
    // State
    mode,
    systemPreference,

    // Getters
    isDark,
    currentTheme,

    // Actions
    setTheme,
    toggleTheme,
    applyTheme,
    loadThemePreference,
    saveThemePreference,
    initTheme
  }
})
