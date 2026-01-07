<script setup>
import { ref, watch, computed } from 'vue'
import { Close } from '@icon-park/vue-next'
import { useGitStore } from '@/stores/git'
import GitChanges from './GitChanges.vue'

const gitStore = useGitStore()

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show', 'close'])

// 计算工作区更改数量
const changesCount = computed(() => {
  if (!gitStore.status || !gitStore.status.files) return 0
  return gitStore.status.files.length
})

const handleClose = () => {
  emit('update:show', false)
  emit('close')
}

// ESC 键关闭
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.show) {
    handleClose()
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    document.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-mask">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">
              工作区更改
              <span v-if="changesCount > 0" class="title-count">({{ changesCount }})</span>
            </h3>
            <button class="close-button" @click="handleClose">
              <Close :size="18" theme="outline" />
            </button>
          </div>
          <div class="modal-body">
            <GitChanges />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: var(--spacing-xl);
}

.modal-container {
  background-color: var(--color-bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-xl);
  max-width: 600px;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 400px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: var(--border-width) solid var(--color-border);
  flex-shrink: 0;
}

.modal-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.title-count {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.close-button {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.close-button:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.modal-body :deep(.git-changes-card) {
  border-radius: 0;
  border: none;
  box-shadow: none;
}

.modal-body :deep(.cartoon-card-body) {
  padding: 0;
}

.modal-body :deep(.changes-content) {
  padding-top: var(--spacing-md);
}

.modal-body :deep(.commit-section) {
  padding: var(--spacing-sm) var(--spacing-md);
}

/* 动画效果 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}
</style>
