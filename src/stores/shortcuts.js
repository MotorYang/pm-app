import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useShortcutsStore = defineStore('shortcuts', () => {
  const shortcuts = ref([])

  // 从 localStorage 加载快捷方式
  const loadShortcuts = () => {
    try {
      const saved = localStorage.getItem('pm-app-shortcuts')
      if (saved) {
        shortcuts.value = JSON.parse(saved)
      }
    } catch (e) {
      console.error('Failed to load shortcuts:', e)
    }
  }

  // 保存快捷方式到 localStorage
  const saveShortcuts = () => {
    try {
      localStorage.setItem('pm-app-shortcuts', JSON.stringify(shortcuts.value))
    } catch (e) {
      console.error('Failed to save shortcuts:', e)
    }
  }

  // 添加快捷方式
  const addShortcut = (shortcut) => {
    shortcuts.value.push({
      id: Date.now().toString(),
      ...shortcut
    })
    saveShortcuts()
  }

  // 更新快捷方式
  const updateShortcut = (id, updates) => {
    const index = shortcuts.value.findIndex(s => s.id === id)
    if (index !== -1) {
      shortcuts.value[index] = {
        ...shortcuts.value[index],
        ...updates
      }
      saveShortcuts()
    }
  }

  // 删除快捷方式
  const deleteShortcut = (id) => {
    shortcuts.value = shortcuts.value.filter(s => s.id !== id)
    saveShortcuts()
  }

  // 初始化时加载
  loadShortcuts()

  return {
    shortcuts,
    addShortcut,
    updateShortcut,
    deleteShortcut,
    loadShortcuts,
    saveShortcuts
  }
})
