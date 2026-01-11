<script setup>
import { Sun, Moon } from '@icon-park/vue-next'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()

const handleToggle = () => {
  toggleTheme()
}
</script>

<template>
  <button
    class="theme-toggle"
    :class="{ 'theme-toggle-dark': isDark }"
    @click="handleToggle"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <div class="theme-toggle-track">
      <div class="theme-toggle-thumb">
        <Sun
          v-if="!isDark"
          :size="16"
          :theme="'outline'"
          :fill="'currentColor'"
          class="theme-toggle-icon"
        />
        <Moon
          v-else
          :size="16"
          :theme="'outline'"
          :fill="'currentColor'"
          class="theme-toggle-icon"
        />
      </div>
    </div>
  </button>
</template>

<style scoped>
.theme-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xs);
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: var(--border-radius-md);
  transition: background-color var(--transition-fast);
}

.theme-toggle:hover {
  background-color: var(--color-bg-tertiary);
}

.theme-toggle-track {
  position: relative;
  width: 48px;
  height: 24px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius-full);
  border: var(--border-width) solid var(--color-border);
  box-shadow: inset 0 2px 4px var(--color-shadow);
  transition: background-color var(--transition-normal);
}

.theme-toggle-dark .theme-toggle-track {
  background-color: var(--color-bg-secondary);
}

.theme-toggle-thumb {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: var(--color-warning);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-normal) var(--ease-bounce),
              background-color var(--transition-normal);
}

.theme-toggle-dark .theme-toggle-thumb {
  transform: translateX(24px) translateY(-50%);
  background-color: var(--color-info);
}

.theme-toggle-icon {
  color: var(--color-text-inverse);
  transition: transform var(--transition-normal);
}

.theme-toggle:hover .theme-toggle-thumb {
  transform: translateY(-50%) scale(1.1);
}

.theme-toggle-dark:hover .theme-toggle-thumb {
  transform: translateX(24px) translateY(-50%) scale(1.1);
}

.theme-toggle:active .theme-toggle-thumb {
  transform: translateY(-50%) scale(0.95);
}

.theme-toggle-dark:active .theme-toggle-thumb {
  transform: translateX(24px) translateY(-50%) scale(0.95);
}
</style>
