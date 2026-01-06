<script setup>
import { ref, computed, useSlots } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const slots = useSlots()
const activeTab = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Extract tab items from slots
const tabs = computed(() => {
  const defaultSlot = slots.default?.()
  if (!defaultSlot) return []

  return defaultSlot
    .filter(vnode => vnode.type?.name === 'CartoonTab' || vnode.props?.name)
    .map(vnode => ({
      name: vnode.props?.name,
      label: vnode.props?.label || vnode.props?.name,
      icon: vnode.props?.icon,
      disabled: vnode.props?.disabled || false,
      vnode
    }))
})

// Auto-select first tab if none is selected
if (!activeTab.value && tabs.value.length > 0) {
  activeTab.value = tabs.value[0].name
}

const selectTab = (tabName) => {
  if (tabName && !tabs.value.find(t => t.name === tabName)?.disabled) {
    activeTab.value = tabName
  }
}
</script>

<template>
  <div class="cartoon-tabs">
    <div class="tabs-header">
      <div
        v-for="tab in tabs"
        :key="tab.name"
        class="tab-item"
        :class="{ active: activeTab === tab.name, disabled: tab.disabled }"
        @click="selectTab(tab.name)"
      >
        <component v-if="tab.icon" :is="tab.icon" :size="16" theme="outline" />
        <span class="tab-label">{{ tab.label }}</span>
      </div>
    </div>

    <div class="tabs-content">
      <template v-for="tab in tabs" :key="tab.name">
        <div v-if="activeTab === tab.name" class="tab-panel">
          <component :is="tab.vnode" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.cartoon-tabs {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.tabs-header {
  display: flex;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-bottom: var(--border-width) solid var(--color-border);
  overflow-x: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  user-select: none;
}

.tab-item:hover:not(.disabled) {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.tab-item.active {
  background-color: var(--color-primary);
  color: white;
}

.tab-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-label {
  line-height: 1;
}

.tabs-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.tab-panel {
  width: 100%;
  height: 100%;
  overflow: auto;
}
</style>
