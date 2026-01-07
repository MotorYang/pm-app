<script setup>
import {onMounted, watch, ref} from 'vue'
import {useProjectsStore} from '@/stores/projects'
import {useVaultStore} from '@/stores/vault'
import {Refresh, Lock, Unlock} from '@icon-park/vue-next'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import VaultUnlock from '@/components/vault/VaultUnlock.vue'
import VaultList from '@/components/vault/VaultList.vue'

const projectsStore = useProjectsStore()
const vaultStore = useVaultStore()

const isInitialized = ref(false)
const checkingInit = ref(true)

onMounted(async () => {
  if (projectsStore.activeProject) {
    await checkVaultStatus()
  }
})

watch(() => projectsStore.activeProject, async (newProject) => {
  if (newProject) {
    await checkVaultStatus()
  } else {
    vaultStore.lockVault()
    isInitialized.value = false
  }
})

const checkVaultStatus = async () => {
  if (!projectsStore.activeProject) return

  try {
    checkingInit.value = true
    isInitialized.value = await vaultStore.isVaultInitialized(projectsStore.activeProject.id)
  } catch (err) {
    console.error('Failed to check vault status:', err)
  } finally {
    checkingInit.value = false
  }
}

const handleLock = () => {
  vaultStore.lockVault()
}

const handleUnlocked = () => {
  // Vault has been unlocked, VaultList will be shown
}

const handleInitialized = async () => {
  await checkVaultStatus()
}
</script>

<template>
  <div class="vault-view">
    <div class="vault-header">
      <button
          v-if="vaultStore.isUnlocked"
          class="header-button"
          @click="handleLock"
      >
        <Lock :size="18" theme="outline"/>
      </button>
    </div>

    <div v-if="!projectsStore.activeProject" class="vault-empty">
      <p>请先选择一个项目</p>
    </div>

    <div v-else-if="checkingInit" class="vault-loading">
      <div class="loading-spinner"></div>
      <p>正在检查保险箱状态...</p>
    </div>

    <div v-else class="vault-content">
      <!-- Unlock/Initialize Component -->
      <VaultUnlock
          v-if="!vaultStore.isUnlocked"
          :is-initialized="isInitialized"
          @unlocked="handleUnlocked"
          @initialized="handleInitialized"
      />

      <!-- Vault List (when unlocked) -->
      <VaultList v-else/>
    </div>
  </div>
</template>

<style scoped>
.vault-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-primary);
}

.vault-header {
  height: 48px;
  padding: var(--spacing-lg);
  border-bottom: var(--border-width) solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  gap: var(--spacing-md);
  background-color: var(--color-bg-secondary);
}

.vault-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.vault-empty,
.vault-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  color: var(--color-text-secondary);
  padding: var(--spacing-xl);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.header-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: var(--color-bg-primary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: 0;
}

.header-button:hover:not(:disabled) {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.header-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.header-button .badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background-color: var(--color-primary);
  color: white;
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
