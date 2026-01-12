<script setup>
import { ref, computed, useSlots } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: null
  },
  title: {
    type: String,
    default: ''
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
    <!-- Tabs Header -->
    <div class="tabs-header">
      <div v-if="title || $slots.headerLeft" class="tabs-header-left">
        <template v-if="$slots.headerLeft">
          <slot name="headerLeft" />
        </template>
        <template v-else>
          <span class="tabs-title">{{ title }}</span>
        </template>
      </div>

      <div class="tabs-header-right">
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
    </div>

    <!-- Tabs Content with transition -->
    <div class="tabs-content">
      <Transition name="tab-fade" mode="out-in">
        <!-- 保证只有一个直接子元素 -->
        <div class="tab-panel-wrapper" :key="activeTab">
          <component :is="tabs.find(t => t.name === activeTab)?.vnode" />
        </div>
      </Transition>
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
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-bottom: var(--border-width) solid var(--color-border);
  height: 38px;
}

.tabs-header-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.tabs-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  white-space: nowrap;
  line-height: 1;
}

.tabs-header-right {
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  gap: var(--spacing-xs);
  overflow-x: auto;
  flex: 1;
  min-width: 0;
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
  line-height: 1;
  flex-shrink: 0;
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

/* 保证动画元素覆盖父元素 */
.tab-panel-wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

/* Transition Animation */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: all 0.3s ease;
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.tab-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.tab-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
