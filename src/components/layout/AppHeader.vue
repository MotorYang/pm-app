<script setup>
import { ref, onMounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { exit } from '@tauri-apps/plugin-process'
import { Minus, FullScreenOne, Close, Home, Terminal, Setting, FolderOpen } from '@icon-park/vue-next'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import SettingsModal from '@/components/settings/SettingsModal.vue'
import { useProjectsStore } from '@/stores/projects.js'
import { useSettingsStore } from '@/stores/settings.js'
import { useTauri } from '@/composables/useTauri'
import Logo from '@/assets/logo.png'

const appWindow = getCurrentWindow()
const isMaximized = ref(false)
const showSettings = ref(false)
const projectsStore = useProjectsStore()
const settingsStore = useSettingsStore()
const tauri = useTauri()

onMounted(async () => {
  isMaximized.value = await appWindow.isMaximized()
  await settingsStore.loadSettings()
})

const handleMinimize = async () => {
  await appWindow.minimize()
}

const handleMaximize = async () => {
  await appWindow.toggleMaximize()
  isMaximized.value = await appWindow.isMaximized()
}

const handleClose = async () => {
  // Check user's preference for close button behavior
  if (settingsStore.closeButtonBehavior === 'quit') {
    // Exit application
    await exit(0)
  } else {
    // Hide to tray (default)
    await appWindow.hide()
  }
}

const handleHomeClick = (id) => {
  if (id === 'menu-home') {
    projectsStore.setActiveProject(null)
  } else if (id === 'menu-terminal') {
    tauri.invokeCommand("open_terminal", {
      dir: projectsStore.activeProject?.path
    })
  } else if (id === 'menu-folder') {
    tauri.invokeCommand("open_in_file_explorer", {
      path: projectsStore.activeProject?.path
    })
  } else if (id === 'menu-setting') {
    showSettings.value = true
  }
}
</script>

<template>
  <header class="app-header" data-tauri-drag-region>
    <div class="app-header-left">
      <div class="app-logo">
        <img :src="Logo" alt="Logo" class="app-logo-icon" />
<!--        <span class="app-title"></span>-->
      </div>
      <div class="vertical-divider"></div>
      <!-- 菜单工具栏 -->
      <div class="menu-tools">
        <button @click="handleHomeClick('menu-home')" title="主页">
          <Home :size="20" theme="outline" />
        </button>
        <button @click="handleHomeClick('menu-terminal')" title="终端">
          <Terminal :size="20" theme="outline" />
        </button>
        <button @click="handleHomeClick('menu-folder')" title="资源管理器">
          <FolderOpen :size="20" theme="outline" />
        </button>
        <button @click="handleHomeClick('menu-setting')" title="设置">
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

    <!-- Settings Modal -->
    <SettingsModal v-model:show="showSettings" @close="showSettings = false" />
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
  width: 26px;
  font-size: 20px;
  line-height: 1;
}

.vertical-divider {
  width: 2px;
  height: 40px;
  background-color: var(--color-border);
  margin: 0;
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
