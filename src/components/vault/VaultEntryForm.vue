<script setup>
import { ref, onMounted } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { Close, Check, Refresh } from '@icon-park/vue-next'
import CartoonModal from '@/components/ui/CartoonModal.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import CartoonTextarea from '@/components/ui/CartoonTextarea.vue'
import CartoonButton from '@/components/ui/CartoonButton.vue'

const props = defineProps({
  entry: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const vaultStore = useVaultStore()

const formData = ref({
  title: '',
  paramKey: '',
  paramValue: '',
  notes: '',
  url: '',
  category: 'general'
})

const loading = ref(false)
const errorMessage = ref('')

// Password generator options
const passwordLength = ref(16)
const includeUppercase = ref(true)
const includeLowercase = ref(true)
const includeNumbers = ref(true)
const includeSymbols = ref(true)

const categories = [
  { value: 'general', label: '通用' },
  { value: 'api_key', label: 'API密钥' },
  { value: 'database', label: '数据库' },
  { value: 'ssh', label: 'SSH' }
]

onMounted(async () => {
  if (props.entry) {
    // Load and decrypt existing entry
    try {
      const decrypted = await vaultStore.decryptEntry(props.entry)
      console.log(decrypted)
      formData.value = {
        title: decrypted.title,
        paramKey: decrypted.paramKey || '',
        paramValue: decrypted.paramValue,
        notes: decrypted.notes || '',
        url: decrypted.url || '',
        category: decrypted.category
      }
    } catch (err) {
      errorMessage.value = '加载条目失败: ' + err.message
    }
  }
})

const handleGeneratePassword = async () => {
  try {
    const password = await vaultStore.generatePassword({
      length: passwordLength.value,
      includeUppercase: includeUppercase.value,
      includeLowercase: includeLowercase.value,
      includeNumbers: includeNumbers.value,
      includeSymbols: includeSymbols.value
    })
    formData.value.paramValue = password
  } catch (err) {
    errorMessage.value = '生成值失败: ' + err.message
  }
}

const handleSubmit = async () => {
  // Validation
  if (!formData.value.title) {
    errorMessage.value = '请输入标题'
    return
  }

  if (!formData.value.paramValue) {
    errorMessage.value = '请输入或生成值'
    return
  }

  try {
    loading.value = true
    errorMessage.value = ''

    if (props.entry) {
      // Update existing entry
      await vaultStore.updateEntry(props.entry.id, formData.value)
    } else {
      // Create new entry
      await vaultStore.createEntry(formData.value)
    }

    emit('saved')
  } catch (err) {
    errorMessage.value = err.message || '保存失败'
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <CartoonModal
    :open="true"
    :title="entry ? '编辑条目' : '添加条目'"
    size="lg"
    @close="handleClose"
  >
    <div class="entry-form">
      <!-- Title -->
      <div class="form-group">
        <label class="form-label">标题 *</label>
        <CartoonInput
          v-model="formData.title"
          placeholder="例如: GitHub账号, 数据库连接"
        />
      </div>

      <!-- Category -->
      <div class="form-group">
        <label class="form-label">分类</label>
        <select v-model="formData.category" class="category-select">
          <option v-for="cat in categories" :key="cat.value" :value="cat.value">
            {{ cat.label }}
          </option>
        </select>
      </div>

      <!-- Username -->
      <div class="form-group">
        <label class="form-label">键（可选）</label>
        <CartoonInput
          v-model="formData.paramKey"
          placeholder="键名称，如: username, api_key 等"
        />
      </div>

      <!-- Password with Generator -->
      <div class="form-group">
        <label class="form-label">值 *</label>
        <div class="password-input-group">
          <CartoonInput
            v-model="formData.paramValue"
            type="text"
            placeholder="输入或生成值"
          />
          <CartoonButton variant="secondary" @click="handleGeneratePassword">
            <Refresh :size="14" theme="outline" />
            生成
          </CartoonButton>
        </div>

        <!-- Password Generator Options -->
        <div class="generator-options">
          <div class="option-row">
            <label class="option-label">
              长度:
              <input
                v-model.number="passwordLength"
                type="number"
                min="8"
                max="64"
                class="length-input"
              />
            </label>
          </div>
          <div class="option-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="includeUppercase" />
              大写字母 (A-Z)
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="includeLowercase" />
              小写字母 (a-z)
            </label>
          </div>
          <div class="option-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="includeNumbers" />
              数字 (0-9)
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="includeSymbols" />
              符号 (!@#$...)
            </label>
          </div>
        </div>
      </div>

      <!-- URL -->
      <div class="form-group">
        <label class="form-label">网址</label>
        <CartoonInput
          v-model="formData.url"
          type="url"
          placeholder="https://example.com"
        />
      </div>

      <!-- Notes -->
      <div class="form-group">
        <label class="form-label">备注</label>
        <CartoonTextarea
          v-model="formData.notes"
          placeholder="其他信息..."
          :rows="4"
        />
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <CartoonButton variant="secondary" @click="handleClose">
          <Close :size="14" theme="outline" />
          取消
        </CartoonButton>
        <CartoonButton variant="primary" @click="handleSubmit" :loading="loading" :disabled="loading">
          <Check :size="14" theme="outline" />
          {{ entry ? '更新' : '创建' }}
        </CartoonButton>
      </div>
    </div>
  </CartoonModal>
</template>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.category-select {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-bg-secondary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.category-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.password-input-group {
  display: flex;
  gap: var(--spacing-xs);
}

.generator-options {
  padding: var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.option-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  flex-wrap: wrap;
}

.option-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.length-input {
  width: 50px;
  padding: 2px var(--spacing-xs);
  background-color: var(--color-bg-secondary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-sm);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
  width: 12px;
  height: 12px;
}

.error-message {
  padding: var(--spacing-sm);
  background-color: rgba(255, 71, 87, 0.1);
  border: var(--border-width) solid var(--color-danger);
  border-radius: var(--border-radius-md);
  color: var(--color-danger);
  font-size: var(--font-size-xs);
  text-align: center;
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  padding-top: var(--spacing-sm);
  border-top: var(--border-width) solid var(--color-border);
}
</style>
