// useTheme Composable - Theme management helper
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

export function useTheme() {
  const themeStore = useThemeStore()

  const isDark = computed(() => themeStore.isDark)
  const currentTheme = computed(() => themeStore.currentTheme)

  const toggleTheme = () => {
    themeStore.toggleTheme()
  }

  const setTheme = (mode) => {
    themeStore.setTheme(mode)
  }

  const applyTheme = () => {
    themeStore.applyTheme()
  }

  return {
    isDark,
    currentTheme,
    toggleTheme,
    setTheme,
    applyTheme
  }
}
