<script setup>
import { FolderOpen, Delete } from '@icon-park/vue-next'
import CartoonCard from '@/components/ui/CartoonCard.vue'

const props = defineProps({
  project: {
    type: Object,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  },
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click', 'delete'])

const handleClick = () => {
  emit('click', props.project)
}

const handleDelete = (e) => {
  e.stopPropagation()
  emit('delete', props.project)
}
</script>

<template>
  <CartoonCard
      hoverable
      shadow="sm"
      :padding="collapsed ? 'none' : 'sm'"
      :class="['project-card', { 'project-card-active': active, 'project-card-collapsed': collapsed }]"
      @click="handleClick"
  >
    <div class="project-content" :class="{ collapsed }">
      <div class="project-icon" :style="{ color: project.color }" :title="collapsed ? project.name : ''">
        <FolderOpen :size="collapsed ? 20 : 24" theme="filled" />
      </div>
      <div v-if="!collapsed" class="project-info">
        <h4 class="project-name">{{ project.name }}</h4>
        <p class="project-path">{{ project.path }}</p>
      </div>
      <button
          v-if="!collapsed"
          class="project-delete-btn"
          @click="handleDelete"
          title="删除项目"
      >
        <Delete :size="16" theme="outline" />
      </button>
    </div>
  </CartoonCard>
</template>

<style scoped>
.project-card {
  cursor: pointer;
  transition: all var(--transition-fast);
  border-radius: 5px;
}

.project-card-collapsed {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-card-active {
  border-color: var(--color-primary);
  background-color: var(--color-bg-tertiary);
}

.project-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.project-content.collapsed {
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  gap: 0;
}

.project-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0; /* 移除行高影响 */
}

/* 修正图标垂直对齐 */
.project-icon :deep(svg) {
  display: block;
  vertical-align: middle;
}

.project-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.project-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.project-path {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.project-delete-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--border-radius-sm);
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--transition-fast),
  background-color var(--transition-fast),
  color var(--transition-fast);
}

.project-delete-btn :deep(svg) {
  display: block;
}

.project-card:hover .project-delete-btn {
  opacity: 1;
}

.project-delete-btn:hover {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
}
</style>