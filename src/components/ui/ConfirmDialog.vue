<script setup>
import { watch, onMounted, onUnmounted } from 'vue'
import { Close } from '@icon-park/vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '确认' },
  cancelText: { type: String, default: '取消' },
  danger: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  closeOnEsc: { type: Boolean, default: true },
  closeOnClickOutside: { type: Boolean, default: true }
})

const emit = defineEmits(['update:open', 'confirm', 'cancel'])

const close = () => emit('update:open', false)
const handleConfirm = () => emit('confirm')
const handleCancel = () => { emit('cancel'); close() }

const handleBackdropClick = () => {
  if (props.closeOnClickOutside && !props.loading) handleCancel()
}

const handleKeydown = (e) => {
  if (!props.open || props.loading) return
  if (e.key === 'Escape' && props.closeOnEsc) handleCancel()
  if (e.key === 'Enter') handleConfirm()
}

watch(() => props.open, val => { document.body.style.overflow = val ? 'hidden' : '' })

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="confirm-backdrop" @click="handleBackdropClick">
        <Transition name="slide">
          <div v-if="open" class="confirm-box" @click.stop>
            <!-- Header -->
            <div class="confirm-header">
              <h3>{{ title }}</h3>
              <button class="confirm-close" @click="handleCancel" :disabled="loading">
                <Close :size="20" theme="outline"/>
              </button>
            </div>

            <!-- Body -->
            <div class="confirm-body">
              <slot>
                <p>{{ message }}</p>
              </slot>
            </div>

            <!-- Footer -->
            <div class="confirm-footer">
              <button class="btn cancel-btn" @click="handleCancel" :disabled="loading">
                {{ cancelText }}
              </button>
              <button
                  :class="['btn', danger ? 'danger-btn' : 'confirm-btn']"
                  @click="handleConfirm"
                  :disabled="loading"
              >
                <span v-if="loading">处理中…</span>
                <span v-else>{{ confirmText }}</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 背景遮罩 */
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 0 16px;
}

/* 弹窗容器 */
.confirm-box {
  width: 100%;
  max-width: 400px;
  background-color: var(--color-bg-tertiary);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.confirm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: var(--border-width) solid var(--color-border);
}
.confirm-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.confirm-close {
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

.confirm-close:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

/* Body */
.confirm-body {
  padding: 16px;
  display: flex;
  font-size: 14px;
  font-weight: bold;
}


/* Footer */
.confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: var(--border-width) solid var(--color-border);
}

/* 按钮 */
.btn {
  min-width: 80px;
  height: 36px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.cancel-btn {
  color: var(--color-text-primary);
  border: none;
}

.confirm-btn {
  background-color: #1890ff;
  color: #fff;
  border: none;
}
.confirm-btn:hover:not(:disabled) { background-color: #40a9ff; }

.danger-btn {
  background-color: var(--color-danger);
  color: white;
  border: none;
}
.danger-btn:hover:not(:disabled) {
  box-shadow: var(--shadow-md);
}

.btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* 动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-enter-active { transition: transform 0.2s ease, opacity 0.2s; }
.slide-leave-active { transition: transform 0.2s ease, opacity 0.2s; }
.slide-enter-from { transform: translateY(-20px); opacity: 0; }
.slide-leave-to { transform: translateY(20px); opacity: 0; }
</style>
