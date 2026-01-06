<script setup>
import { ref } from 'vue'
import { Branch, Check } from '@icon-park/vue-next'
import { useGitStore } from '@/stores/git'
import CartoonCard from '@/components/ui/CartoonCard.vue'
import CartoonButton from '@/components/ui/CartoonButton.vue'

const gitStore = useGitStore()
const switching = ref(false)
const showBranchList = ref(false)

const handleCheckout = async (branchName) => {
  if (branchName === gitStore.currentBranch) {
    showBranchList.value = false
    return
  }

  switching.value = true

  try {
    await gitStore.checkoutBranch(branchName)
    showBranchList.value = false
  } catch (e) {
    alert(e.message || '切换分支失败')
  } finally {
    switching.value = false
  }
}
</script>

<template>
  <CartoonCard class="branch-panel">
    <div class="panel-header">
      <div class="current-branch">
        <Branch :size="20" theme="filled" :fill="['var(--color-primary)', 'var(--color-primary)']" />
        <span class="branch-name">{{ gitStore.currentBranch || 'Unknown' }}</span>
        <span class="branch-label">当前分支</span>
      </div>
      <CartoonButton
        size="sm"
        variant="secondary"
        @click="showBranchList = !showBranchList"
      >
        {{ showBranchList ? '收起' : '切换分支' }}
      </CartoonButton>
    </div>

    <div v-if="showBranchList" class="branch-list">
      <div class="branch-section">
        <h4 class="section-title">本地分支</h4>
        <div class="branches">
          <div
            v-for="branch in gitStore.localBranches"
            :key="branch.name"
            class="branch-item"
            :class="{ active: branch.is_head }"
            @click="handleCheckout(branch.name)"
          >
            <div class="branch-info">
              <Branch :size="16" theme="outline" />
              <span class="name">{{ branch.name }}</span>
              <Check v-if="branch.is_head" :size="16" theme="filled" class="check-icon" />
            </div>
            <span v-if="branch.upstream" class="upstream">
              ← {{ branch.upstream }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="gitStore.remoteBranches.length > 0" class="branch-section">
        <h4 class="section-title">远程分支</h4>
        <div class="branches">
          <div
            v-for="branch in gitStore.remoteBranches"
            :key="branch.name"
            class="branch-item remote"
          >
            <div class="branch-info">
              <Branch :size="16" theme="outline" />
              <span class="name">{{ branch.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="switching" class="switching-overlay">
      <div class="spinner"></div>
      <span>正在切换分支...</span>
    </div>
  </CartoonCard>
</template>

<style scoped>
.branch-panel {
  padding: var(--spacing-md);
  position: relative;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.current-branch {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
}

.branch-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.branch-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-left: auto;
}

.branch-list {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  max-height: 400px;
  overflow-y: auto;
}

.branch-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.branches {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.branch-item {
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.branch-item:not(.remote):hover {
  background-color: var(--color-bg-tertiary);
  transform: translateX(2px);
}

.branch-item.active {
  background-color: var(--color-primary);
  color: white;
}

.branch-item.remote {
  opacity: 0.7;
  cursor: default;
}

.branch-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  flex: 1;
}

.check-icon {
  color: white;
  margin-left: auto;
}

.upstream {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-left: calc(var(--spacing-sm) + 16px);
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
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  border-radius: var(--border-radius-md);
  z-index: 10;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--color-border);
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
