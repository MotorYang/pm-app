<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus', 'input'])

const isFocused = ref(false)

const inputClasses = computed(() => {
  return [
    'cartoon-input',
    {
      'cartoon-input-error': props.error,
      'cartoon-input-focused': isFocused.value
    }
  ]
})

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
  emit('input', event)
}

const handleFocus = (event) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = (event) => {
  isFocused.value = false
  emit('blur', event)
}
</script>

<template>
  <div class="cartoon-input-wrapper">
    <label v-if="label" class="cartoon-input-label">
      {{ label }}
      <span v-if="required" class="cartoon-input-required">*</span>
    </label>

    <input
      :class="inputClasses"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
    />

    <span v-if="error" class="cartoon-input-error-message">
      {{ error }}
    </span>
  </div>
</template>

<style scoped>
.cartoon-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.cartoon-input-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.cartoon-input-required {
  color: var(--color-danger);
  margin-left: var(--spacing-xs);
}

.cartoon-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  border-radius: var(--border-radius-md);
  border: var(--border-width) solid var(--color-border);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition-fast),
              box-shadow var(--transition-fast),
              transform var(--transition-fast);
}

.cartoon-input::placeholder {
  color: var(--color-text-tertiary);
}

.cartoon-input:hover:not(:disabled):not(:readonly) {
  border-color: var(--color-text-tertiary);
}

.cartoon-input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 4px rgba(255, 107, 157, 0.1);
  transform: scale(1.01);
}

.cartoon-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--color-bg-tertiary);
}

.cartoon-input:readonly {
  background-color: var(--color-bg-tertiary);
  cursor: default;
}

.cartoon-input-error {
  border-color: var(--color-danger);
}

.cartoon-input-error:focus {
  box-shadow: 0 0 0 4px rgba(255, 71, 87, 0.1);
}

.cartoon-input-error-message {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  margin-top: var(--spacing-xs);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}
</style>
