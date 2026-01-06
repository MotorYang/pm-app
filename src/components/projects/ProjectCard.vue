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
    padding="sm"
    :class="['project-card', { 'project-card-active': active }]"
    @click="handleClick"
  >
    <div class="project-content">
      <div class="project-icon" :style="{ color: project.color }">
        <FolderOpen :size="24" theme="filled" />
      </div>
      <div class="project-info">
        <h4 class="project-name">{{ project.name }}</h4>
        <p class="project-path">{{ project.path }}</p>
      </div>
      <button
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

.project-card-active {
  border-color: var(--color-primary);
  background-color: var(--color-bg-tertiary);
}

.project-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.project-icon {
  flex-shrink: 0;
}

.project-info {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-path {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.project-card:hover .project-delete-btn {
  opacity: 1;
}

.project-delete-btn:hover {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
}
</style>
