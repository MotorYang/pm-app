<script setup>
import { computed, ref } from 'vue'
import {LinkOne, Application, FolderOpen, Edit, Delete, Text} from '@icon-park/vue-next'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'
import CartoonCard from '@/components/ui/CartoonCard.vue'
import { useContextMenu } from '@/composables/useContextMenu.js'

const props = defineProps({
  shortcut: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit', 'delete'])

const contextMenu = useContextMenu()
const faviconError = ref(false)

// 获取 URL 的 favicon
const faviconUrl = computed(() => {
  if (props.shortcut.type !== 'url' || faviconError.value) {
    return null
  }
  try {
    const url = new URL(props.shortcut.target)
    // 使用 Google Favicon 服务
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`
  } catch {
    return null
  }
})

// 获取图标组件（备用）
const iconComponent = computed(() => {
  switch (props.shortcut.type) {
    case 'url':
      return LinkOne
    case 'app':
      return Application
    case 'folder':
      return FolderOpen
    default:
      return LinkOne
  }
})

// favicon 加载失败时使用默认图标
const handleFaviconError = () => {
  faviconError.value = true
}

// 右键菜单
const handleContextMenu = (event) => {
  const menuItems = [
    {
      label: '编辑',
      icon: Text,
      action: () => handleEdit()
    },
    { divider: true },
    {
      label: '删除',
      icon: Delete,
      danger: true,
      action: () => handleDelete()
    }
  ]
  contextMenu.show(event, menuItems)
}

// 获取类型标签
const typeLabel = computed(() => {
  switch (props.shortcut.type) {
    case 'url':
      return '网址'
    case 'app':
      return '应用'
    case 'folder':
      return '文件夹'
    default:
      return ''
  }
})

// 打开快捷方式
const handleOpen = async () => {
  try {
    if (props.shortcut.type === 'url') {
      // 打开 URL
      await open(props.shortcut.target)
    } else if (props.shortcut.type === 'app') {
      // 打开应用程序
      await invoke('open_terminal', {
        path: props.shortcut.target
      })
    } else if (props.shortcut.type === 'folder') {
      // 打开文件夹
      await invoke('open_in_file_explorer', {
        path: props.shortcut.target
      })
    }
  } catch (err) {
    console.error('Failed to open shortcut:', err)
    alert('打开快捷方式失败: ' + err)
  }
}

const handleEdit = () => {
  emit('edit', props.shortcut)
}

const handleDelete = () => {
  emit('delete', props.shortcut.id)
}
</script>

<template>
  <CartoonCard
    class="shortcut-card"
    hoverable
    padding="sm"
    @click="handleOpen"
    @contextmenu="handleContextMenu"
  >
    <div class="shortcut-content">
      <div class="shortcut-icon">
        <img
          v-if="faviconUrl"
          :src="faviconUrl"
          class="favicon-img"
          @error="handleFaviconError"
        />
        <component v-else :is="iconComponent" :size="32" theme="outline" />
      </div>

      <div class="shortcut-info">
        <h4 class="shortcut-title">{{ shortcut.name }}</h4>
        <span class="shortcut-type">{{ typeLabel }}</span>
      </div>
    </div>
  </CartoonCard>
</template>

<style scoped>
.shortcut-card {
  cursor: pointer;
  transition: all var(--transition-fast);
  padding-left: var(--spacing-xs) !important;
  padding-right: var(--spacing-xs) !important;
}

.shortcut-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
}

.shortcut-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius-md);
  color: var(--color-primary);
  flex-shrink: 0;
  transition: all var(--transition-fast);
  line-height: 0;
}

.shortcut-icon :deep(svg) {
  display: block;
}

.favicon-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: var(--border-radius-sm);
}

.shortcut-card:hover .shortcut-icon {
  background-color: var(--color-primary);
  color: white;
  transform: scale(1.05);
}

.shortcut-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
}

.shortcut-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: center;
}

.shortcut-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
</style>
