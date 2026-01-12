<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useContextMenu } from '@/composables/useContextMenu'

const { visible, position, items, hide } = useContextMenu()

const menuRef = ref(null)

// 调整位置确保不超出视口
watch([visible, position], async ([isVisible]) => {
  if (isVisible) {
    await nextTick()
    if (menuRef.value) {
      const menu = menuRef.value
      const rect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (position.value.x + rect.width > viewportWidth) {
        position.value = { ...position.value, x: viewportWidth - rect.width - 8 }
      }
      if (position.value.y + rect.height > viewportHeight) {
        position.value = { ...position.value, y: viewportHeight - rect.height - 8 }
      }
    }
  }
})

const handleItemClick = (item) => {
  if (item.disabled || item.divider) return
  hide()
  if (item.action) {
    item.action()
  }
}

const handleClickOutside = (event) => {
  if (visible.value && menuRef.value && !menuRef.value.contains(event.target)) {
    hide()
  }
}

const handleKeydown = (event) => {
  if (event.key === 'Escape' && visible.value) {
    hide()
  }
}

// 右键其他地方时关闭当前菜单
const handleContextMenu = (event) => {
  if (visible.value && menuRef.value && !menuRef.value.contains(event.target)) {
    hide()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('contextmenu', handleContextMenu)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('contextmenu', handleContextMenu)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="context-menu"
      :style="{ left: position.x + 'px', top: position.y + 'px' }"
    >
      <template v-for="(item, index) in items" :key="index">
        <div v-if="item.divider" class="context-menu-divider" />
        <div
          v-else
          class="context-menu-item"
          :class="{ danger: item.danger, disabled: item.disabled }"
          @click="handleItemClick(item)"
        >
          <component v-if="item.icon" :is="item.icon" :size="16" theme="outline" />
          <span class="context-menu-label">{{ item.label }}</span>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 10000;
  min-width: 160px;
  background-color: var(--color-bg-primary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-xs);
  animation: contextMenuFadeIn 0.15s ease-out;
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  transition: background-color var(--transition-fast);
}

.context-menu-item:deep(svg) {
  display: block;
  vertical-align: middle;
}

.context-menu-item:hover {
  background-color: var(--color-bg-tertiary);
}

.context-menu-item.danger {
  color: var(--color-danger);
}

.context-menu-item.danger:hover {
  background-color: rgba(255, 71, 87, 0.1);
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-item.disabled:hover {
  background-color: transparent;
}

.context-menu-label {
  flex: 1;
}

.context-menu-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: var(--spacing-xs) 0;
}
</style>
