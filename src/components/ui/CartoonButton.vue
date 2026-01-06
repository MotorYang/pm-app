<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'success', 'danger', 'ghost'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const classes = computed(() => {
  return [
    'cartoon-btn',
    `cartoon-btn-${props.variant}`,
    `cartoon-btn-${props.size}`,
    {
      'cartoon-btn-block': props.block,
      'cartoon-btn-loading': props.loading
    }
  ]
})

const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    :class="classes"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="cartoon-loading"></span>
    <span v-else class="cartoon-btn-content">
      <slot></slot>
    </span>
  </button>
</template>

<style scoped>
.cartoon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--border-radius-md);
  border: var(--border-width) solid transparent;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform var(--transition-fast),
              box-shadow var(--transition-fast),
              background-color var(--transition-fast);
  position: relative;
  overflow: hidden;
  white-space: nowrap;

  line-height: 1;
  vertical-align: middle;
}

.cartoon-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.cartoon-btn-content {
  display: inline-flex;
  align-items: center;
  gap: inherit;
}

.cartoon-btn svg,
.cartoon-btn i {
  display: block;
}

.cartoon-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.02);
  box-shadow: var(--shadow-md);
}

.cartoon-btn:hover:not(:disabled)::before {
  opacity: 1;
}

.cartoon-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
  box-shadow: var(--shadow-sm);
}

.cartoon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Variants */
.cartoon-btn-primary {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.cartoon-btn-secondary {
  background-color: var(--color-secondary);
  color: var(--color-text-inverse);
  border-color: var(--color-secondary);
}

.cartoon-btn-success {
  background-color: var(--color-success);
  color: var(--color-text-primary);
  border-color: var(--color-success);
}

.cartoon-btn-danger {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
  border-color: var(--color-danger);
}

.cartoon-btn-ghost {
  background-color: transparent;
  border-color: var(--color-border);
}

.cartoon-btn-ghost:hover:not(:disabled) {
  background-color: var(--color-bg-tertiary);
}

/* Sizes */
.cartoon-btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.cartoon-btn-md {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--font-size-md);
}

.cartoon-btn-lg {
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--font-size-lg);
}

/* Block */
.cartoon-btn-block {
  width: 100%;
}

/* Loading state */
.cartoon-btn-loading {
  pointer-events: none;
}

.cartoon-loading {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
