<script setup>
import { watch, onMounted, onUnmounted } from 'vue'
import { Close } from '@icon-park/vue-next'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value)
  },
  closeOnEsc: {
    type: Boolean,
    default: true
  },
  closeOnClickOutside: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close', 'update:open'])

const handleClose = () => {
  emit('update:open', false)
  emit('close')
}

const handleBackdropClick = () => {
  if (props.closeOnClickOutside) {
    handleClose()
  }
}

const handleEsc = (e) => {
  if (e.key === 'Escape' && props.closeOnEsc && props.open) {
    handleClose()
  }
}

watch(() => props.open, (newValue) => {
  if (newValue) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="modal-backdrop" @click="handleBackdropClick">
        <Transition name="modal-slide">
          <div
            v-if="open"
            :class="['modal-content', `modal-${size}`]"
            @click.stop
          >
            <div class="modal-header">
              <h2 class="modal-title">{{ title }}</h2>
              <button
                class="modal-close-btn"
                @click="handleClose"
                aria-label="Close"
              >
                <Close :size="20" theme="outline" />
              </button>
            </div>

            <div class="modal-body">
              <slot></slot>
            </div>

            <div v-if="$slots.footer" class="modal-footer">
              <slot name="footer"></slot>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg);
}

.modal-content {
  background-color: var(--color-bg-secondary);
  border-radius: var(--border-radius-lg);
  border: var(--border-width) solid var(--color-border);
  box-shadow: var(--shadow-xl);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-sm {
  width: 100%;
  max-width: 400px;
}

.modal-md {
  width: 100%;
  max-width: 600px;
}

.modal-lg {
  width: 100%;
  max-width: 800px;
}

.modal-xl {
  width: 100%;
  max-width: 1000px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: var(--border-width) solid var(--color-border);
}

.modal-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.modal-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
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

.modal-close-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
}

.modal-footer {
  padding: var(--spacing-lg);
  border-top: var(--border-width) solid var(--color-border);
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active {
  transition: transform var(--transition-normal) var(--ease-bounce),
              opacity var(--transition-normal);
}

.modal-slide-leave-active {
  transition: transform var(--transition-normal),
              opacity var(--transition-normal);
}

.modal-slide-enter-from {
  transform: translateY(-50px) scale(0.9);
  opacity: 0;
}

.modal-slide-leave-to {
  transform: translateY(20px) scale(0.95);
  opacity: 0;
}
</style>
