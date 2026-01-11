<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Branch, Down, Check } from '@icon-park/vue-next'
import { useGitStore } from '@/stores/git'

const gitStore = useGitStore()
const switching = ref(false)
const showDropdown = ref(false)
const dropdownRef = ref(null)

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const closeDropdown = () => {
  showDropdown.value = false
}

const handleCheckout = async (branchName) => {
  if (branchName === gitStore.currentBranch) {
    closeDropdown()
    return
  }

  switching.value = true

  try {
    await gitStore.checkoutBranch(branchName)
    closeDropdown()
  } catch (e) {
    alert(e.message || '切换分支失败')
  } finally {
    switching.value = false
  }
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="branch-select" ref="dropdownRef">
    <div
      class="branch-trigger"
      :class="{ active: showDropdown }"
      @click="toggleDropdown"
    >
      <Branch class="branch-icon" :size="16" theme="filled" :fill="['var(--color-primary)', 'var(--color-primary)']" />
      <span class="branch-name">{{ gitStore.currentBranch || 'Unknown' }}</span>
      <Down :size="14" class="arrow-icon" :class="{ rotate: showDropdown }" />
    </div>

    <div v-if="showDropdown" class="branch-dropdown">
      <div class="dropdown-content">
        <div class="branch-section">
          <div class="section-title">本地分支</div>
          <div class="branches">
            <div
              v-for="branch in gitStore.localBranches"
              :key="branch.name"
              class="branch-item"
              :class="{ active: branch.name === gitStore.currentBranch }"
              @click="handleCheckout(branch.name)"
            >
              <div class="branch-info">
                <Branch :size="14" theme="outline" />
                <span class="name">{{ branch.name }}</span>
                <Check v-if="branch.name === gitStore.currentBranch" :size="14" theme="filled" class="check-icon" />
              </div>
              <span v-if="branch.upstream" class="upstream">
                ← {{ branch.upstream }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="gitStore.remoteBranches.length > 0" class="branch-section">
          <div class="section-title">远程分支</div>
          <div class="branches">
            <div
              v-for="branch in gitStore.remoteBranches"
              :key="branch.name"
              class="branch-item remote"
            >
              <div class="branch-info">
                <Branch :size="14" theme="outline" />
                <span class="name">{{ branch.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="switching" class="switching-overlay">
      <div class="spinner"></div>
      <span>切换中...</span>
    </div>
  </div>
</template>

<style scoped>
.branch-select {
  position: relative;
  display: inline-block;
}

.branch-trigger {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-md);
  height: 36px;
  background-color: var(--color-bg-primary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
  min-width: 150px;
}

.branch-trigger:hover {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-primary);
}

.branch-trigger:hover .arrow-icon {
  color: var(--color-primary);
}

.branch-trigger.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
}

.branch-icon {
  flex-shrink: 0;
}

.branch-name {
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.arrow-icon {
  transition: all var(--transition-fast);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.arrow-icon.rotate {
  transform: rotate(180deg);
}

.branch-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-xs));
  left: 0;
  right: 0;
  background-color: var(--color-bg-primary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-content {
  max-height: 400px;
  overflow-y: auto;
  padding: var(--spacing-sm);
}

.branch-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.branch-section + .branch-section {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 var(--spacing-sm);
}

.branches {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.branch-item {
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.branch-item:not(.remote):hover {
  background-color: var(--color-bg-tertiary);
}

.branch-item.active {
  background-color: var(--color-primary);
  color: white;
}

.branch-item.remote {
  opacity: 0.6;
  cursor: default;
}

.branch-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-icon {
  color: white;
  margin-left: auto;
  flex-shrink: 0;
}

.upstream {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-left: calc(var(--spacing-sm) + 14px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.branch-item.active .upstream {
  color: rgba(255, 255, 255, 0.8);
}

.switching-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  border-radius: var(--border-radius-md);
  z-index: 10;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
