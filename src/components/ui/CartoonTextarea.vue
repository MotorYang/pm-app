<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  rows: {
    type: Number,
    default: 3
  },
  resize: {
    type: String,
    default: 'vertical',
    validator: (value) => ['none', 'both', 'horizontal', 'vertical'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue'])

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <textarea
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :rows="rows"
    :class="['cartoon-textarea', { disabled }]"
    :style="{ resize }"
    @input="handleInput"
  />
</template>

<style scoped>
.cartoon-textarea {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  font-family: inherit;
  line-height: 1.5;
  transition: all var(--transition-fast);
}

.cartoon-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.1);
}

.cartoon-textarea:hover:not(:focus):not(.disabled) {
  border-color: var(--color-text-tertiary);
}

.cartoon-textarea.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--color-bg-tertiary);
}

.cartoon-textarea::placeholder {
  color: var(--color-text-tertiary);
}
</style>
