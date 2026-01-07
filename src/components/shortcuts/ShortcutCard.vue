<script setup>
import { computed } from 'vue'
import { LinkOne, Application, FolderOpen, Edit, Delete } from '@icon-park/vue-next'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'
import CartoonCard from '@/components/ui/CartoonCard.vue'

const props = defineProps({
  shortcut: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit', 'delete'])

// 获取图标组件
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

const handleEdit = (e) => {
  e.stopPropagation()
  emit('edit', props.shortcut)
}

const handleDelete = (e) => {
  e.stopPropagation()
  emit('delete', props.shortcut.id)
}
</script>

<template>
  <CartoonCard
    class="shortcut-card"
    hoverable
    @click="handleOpen"
  >
    <div class="shortcut-content">
      <div class="shortcut-icon">
        <component :is="iconComponent" :size="32" theme="outline" />
      </div>

      <div class="shortcut-info">
        <h4 class="shortcut-title">{{ shortcut.name }}</h4>
        <span class="shortcut-type">{{ typeLabel }}</span>
      </div>

      <div class="shortcut-actions">
        <button
          class="action-btn"
          @click="handleEdit"
          title="编辑"
        >
          <Edit :size="16" theme="outline" />
        </button>
        <button
          class="action-btn delete"
          @click="handleDelete"
          title="删除"
        >
          <Delete :size="16" theme="outline" />
        </button>
      </div>
    </div>
  </CartoonCard>
</template>

<style scoped>
.shortcut-card {
  cursor: pointer;
  transition: all var(--transition-fast);
}

.shortcut-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
}

.shortcut-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius-md);
  color: var(--color-primary);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.shortcut-card:hover .shortcut-icon {
  background-color: var(--color-primary);
  color: white;
  transform: scale(1.05);
}

.shortcut-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shortcut-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shortcut-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.shortcut-actions {
  display: flex;
  gap: var(--spacing-xs);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.shortcut-card:hover .shortcut-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: var(--color-bg-tertiary);
  border: none;
  border-radius: var(--border-radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background-color: var(--color-primary);
  color: white;
}

.action-btn.delete:hover {
  background-color: var(--color-danger);
}
</style>
