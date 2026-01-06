<script setup>
import { ref, onMounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, FullScreenOne, Close, Home, Terminal, Setting, FolderOpen } from '@icon-park/vue-next'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import { useProjectsStore } from '@/stores/projects.js'
import { useTauri } from '@/composables/useTauri'

const appWindow = getCurrentWindow()
const isMaximized = ref(false)
const projectsStore = useProjectsStore()
const tauri = useTauri()

onMounted(async () => {
  isMaximized.value = await appWindow.isMaximized()
})

const handleMinimize = async () => {
  await appWindow.minimize()
}

const handleMaximize = async () => {
  await appWindow.toggleMaximize()
  isMaximized.value = await appWindow.isMaximized()
}

const handleClose = async () => {
  await appWindow.close()
}

const handleHomeClick = (id) => {
  if (id === 'menu-home') {
    projectsStore.setActiveProject(null)
  } else if (id === 'menu-terminal') {
    tauri.invokeCommand("open_terminal", null)
  } else if (id === 'menu-folder') {
    tauri.invokeCommand("open_in_file_explorer", null)
  }
}
</script>

<template>
  <header class="app-header" data-tauri-drag-region>
    <div class="app-header-left">
      <div class="app-logo">
        <span class="app-logo-icon">📦</span>
        <span class="app-title">PM-App</span>
      </div>
      <div class="vertical-divider"></div>
      <!-- 菜单工具栏 -->
      <div class="menu-tools">
        <button @click="handleHomeClick('menu-home')">
          <Home :size="20" theme="outline" />
        </button>
        <button @click="handleHomeClick('menu-terminal')">
          <Terminal :size="20" theme="outline" />
        </button>
        <button @click="handleHomeClick('menu-folder')">
          <FolderOpen :size="20" theme="outline" />
        </button>
        <button @click="handleHomeClick('menu-setting')">
          <Setting :size="20" theme="outline" />
        </button>
      </div>
    </div>

    <div class="app-header-right">
      <ThemeToggle />

      <div class="window-controls">
        <button
          class="window-control-btn minimize-btn"
          @click="handleMinimize"
          aria-label="Minimize"
        >
          <Minus :size="16" theme="outline" />
        </button>

        <button
          class="window-control-btn maximize-btn"
          @click="handleMaximize"
          :aria-label="isMaximized ? 'Restore' : 'Maximize'"
        >
          <FullScreenOne :size="16" theme="outline" />
        </button>

        <button
          class="window-control-btn close-btn"
          @click="handleClose"
          aria-label="Close"
        >
          <Close :size="16" theme="outline" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  background-color: var(--color-bg-secondary);
  border-bottom: var(--border-width) solid var(--color-border);
  padding: 0 var(--spacing-md);
  user-select: none;
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.app-header-left,
.app-header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  -webkit-app-region: no-drag;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.app-logo-icon {
  font-size: 20px;
  line-height: 1;
}

.vertical-divider {
  width: 1px;
  height: 40px;
  background-color: var(--color-border);
  margin: 0 5px;
}

.menu-tools {
  height: 40px;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.menu-tools > button {
  width: 32px;
  height: 32px;
  line-height: 1;
  border-radius: var(--border-radius-sm);
  background: transparent;
  border: none;
  color: var(--color-text);
  cursor: pointer;
}

.menu-tools > button:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.app-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.window-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.window-control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  width: 32px;
  height: 32px;
  border-radius: var(--border-radius-sm);
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background-color var(--transition-fast),
              color var(--transition-fast);
}

.window-control-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.close-btn:hover {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
}

.window-control-btn:active {
  transform: scale(0.95);
}
</style>
