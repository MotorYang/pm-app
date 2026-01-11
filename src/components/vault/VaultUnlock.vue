<script setup>
import { ref } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { useVaultStore } from '@/stores/vault'
import { Lock, Unlock, Key } from '@icon-park/vue-next'
import CartoonCard from '@/components/ui/CartoonCard.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import CartoonButton from '@/components/ui/CartoonButton.vue'

const props = defineProps({
  isInitialized: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['unlocked', 'initialized'])

const projectsStore = useProjectsStore()
const vaultStore = useVaultStore()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMessage = ref('')

const handleUnlock = async () => {
  if (!password.value) {
    errorMessage.value = '请输入密码'
    return
  }

  try {
    loading.value = true
    errorMessage.value = ''

    await vaultStore.unlockVault(projectsStore.activeProject.id, password.value)

    password.value = ''
    emit('unlocked')
  } catch (err) {
    errorMessage.value = err.message || '解锁失败'
  } finally {
    loading.value = false
  }
}

const handleInitialize = async () => {
  if (!password.value) {
    errorMessage.value = '请输入密码'
    return
  }

  if (password.value.length < 8) {
    errorMessage.value = '密码长度至少8位'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  try {
    loading.value = true
    errorMessage.value = ''

    await vaultStore.initVault(projectsStore.activeProject.id, password.value)

    password.value = ''
    confirmPassword.value = ''
    emit('initialized')
  } catch (err) {
    errorMessage.value = err.message || '初始化失败'
  } finally {
    loading.value = false
  }
}

const handleKeyPress = (event) => {
  if (event.key === 'Enter') {
    if (props.isInitialized) {
      handleUnlock()
    } else {
      handleInitialize()
    }
  }
}
</script>

<template>
  <div class="vault-unlock">
    <CartoonCard class="unlock-card">
      <div class="unlock-content">
        <!-- Lock Icon -->
        <div class="lock-icon">
          <Lock v-if="isInitialized" :size="48" theme="outline" />
          <Key v-else :size="48" theme="outline" />
        </div>

        <!-- Title -->
        <h2 class="unlock-title">
          {{ isInitialized ? '解锁保险箱' : '初始化保险箱' }}
        </h2>

        <p class="unlock-description">
          {{ isInitialized
            ? '请输入主密码以解锁保险箱'
            : '为此项目创建保险箱主密码（至少8位）'
          }}
        </p>

        <!-- Password Input -->
        <div class="input-group">
          <label class="input-label">主密码</label>
          <CartoonInput
            v-model="password"
            type="password"
            placeholder="输入主密码"
            @keypress="handleKeyPress"
            :disabled="loading"
          />
        </div>

        <!-- Confirm Password (only for initialization) -->
        <div v-if="!isInitialized" class="input-group">
          <label class="input-label">确认密码</label>
          <CartoonInput
            v-model="confirmPassword"
            type="password"
            placeholder="再次输入密码"
            @keypress="handleKeyPress"
            :disabled="loading"
          />
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <!-- Warning for initialization -->
        <div v-if="!isInitialized" class="warning-box">
          <p>⚠️ 警告</p>
          <p>请妥善保管您的主密码，一旦丢失将无法恢复保险箱中的数据！</p>
        </div>

        <!-- Unlock/Initialize Button -->
        <CartoonButton
          variant="primary"
          @click="isInitialized ? handleUnlock() : handleInitialize()"
          :loading="loading"
          :disabled="loading"
          class="unlock-button"
        >
          <Unlock :size="16" theme="outline" />
          {{ isInitialized ? '解锁' : '创建保险箱' }}
        </CartoonButton>
      </div>
    </CartoonCard>
  </div>
</template>

<style scoped>
.vault-unlock {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: var(--spacing-md);
}

.unlock-card {
  max-width: 400px;
  width: 100%;
}

.unlock-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.lock-icon {
  color: var(--color-primary);
}

.unlock-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
  text-align: center;
}

.unlock-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: center;
  margin: 0;
}

.input-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.input-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.error-message {
  width: 100%;
  padding: var(--spacing-sm);
  background-color: rgba(255, 71, 87, 0.1);
  border: var(--border-width) solid var(--color-danger);
  border-radius: var(--border-radius-md);
  color: var(--color-danger);
  font-size: var(--font-size-xs);
  text-align: center;
}

.warning-box {
  width: 100%;
  padding: var(--spacing-sm);
  background-color: rgba(255, 217, 61, 0.1);
  border: var(--border-width) solid var(--color-warning);
  border-radius: var(--border-radius-md);
  color: var(--color-text-primary);
}

.warning-box p {
  margin: 0;
  font-size: var(--font-size-xs);
  line-height: 1.4;
}

.warning-box p:first-child {
  font-weight: var(--font-weight-bold);
  margin-bottom: 2px;
}

.unlock-button {
  width: 100%;
  margin-top: var(--spacing-xs);
}
</style>
