<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  hoverable: {
    type: Boolean,
    default: false
  },
  shadow: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'none'].includes(value)
  },
  padding: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'none'].includes(value)
  }
})

const emit = defineEmits(['click'])

const handleClick = (event) => {
  emit('click', event)
}
</script>

<template>
  <div
    :class="[
      'cartoon-card',
      {
        'cartoon-card-hoverable': hoverable,
        [`cartoon-card-shadow-${shadow}`]: shadow !== 'none',
        [`cartoon-card-padding-${padding}`]: padding !== 'none'
      }
    ]"
    @click="handleClick"
  >
    <div v-if="title || $slots.header" class="cartoon-card-header">
      <slot name="header">
        <h3 class="cartoon-card-title">{{ title }}</h3>
      </slot>
    </div>

    <div class="cartoon-card-body">
      <slot></slot>
    </div>

    <div v-if="$slots.footer" class="cartoon-card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<style scoped>
.cartoon-card {
  background-color: var(--color-bg-secondary);
  border-radius: var(--border-radius-lg);
  border: var(--border-width) solid var(--color-border);
  transition: transform var(--transition-normal),
              box-shadow var(--transition-normal);
}

.cartoon-card-hoverable {
  cursor: pointer;
}

.cartoon-card-hoverable:hover {
  transform: translateY(-2px);
}

/* Shadow variants */
.cartoon-card-shadow-sm {
  box-shadow: var(--shadow-sm);
}

.cartoon-card-shadow-md {
  box-shadow: var(--shadow-md);
}

.cartoon-card-shadow-lg {
  box-shadow: var(--shadow-lg);
}

.cartoon-card-hoverable.cartoon-card-shadow-sm:hover {
  box-shadow: var(--shadow-md);
}

.cartoon-card-hoverable.cartoon-card-shadow-md:hover {
  box-shadow: var(--shadow-lg);
}

.cartoon-card-hoverable.cartoon-card-shadow-lg:hover {
  box-shadow: var(--shadow-xl);
}

/* Padding variants */
.cartoon-card-padding-sm {
  padding: var(--spacing-sm);
}

.cartoon-card-padding-md {
  padding: var(--spacing-lg);
}

.cartoon-card-padding-lg {
  padding: var(--spacing-xl);
}

.cartoon-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: var(--border-width) solid var(--color-border);
}

.cartoon-card-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.cartoon-card-body {
  color: var(--color-text-secondary);
}

.cartoon-card-footer {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: var(--border-width) solid var(--color-border);
}
</style>
