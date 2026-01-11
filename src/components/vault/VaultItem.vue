<script setup>
import { ref, computed } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { Lock, User, Link, Edit, Delete, Copy, PreviewOpen, PreviewClose } from '@icon-park/vue-next'
import CartoonCard from '@/components/ui/CartoonCard.vue'

const props = defineProps({
  entry: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit', 'delete'])

const vaultStore = useVaultStore()

const decryptedData = ref(null)
const showPassword = ref(false)
const loading = ref(false)

const categoryInfo = computed(() => {
  const categories = {
    general: { label: '通用', color: 'var(--color-primary)' },
    api_key: { label: 'API密钥', color: 'var(--color-accent)' },
    database: { label: '数据库', color: 'var(--color-success)' },
    ssh: { label: 'SSH', color: 'var(--color-secondary)' }
  }
  return categories[props.entry.category] || categories.general
})

const loadDecryptedData = async () => {
  if (decryptedData.value) return

  try {
    loading.value = true
    decryptedData.value = await vaultStore.decryptEntry(props.entry)
  } catch (err) {
    console.error('Failed to decrypt entry:', err)
  } finally {
    loading.value = false
  }
}

const handleCopyPassword = async () => {
  await loadDecryptedData()
  if (decryptedData.value) {
    try {
      await navigator.clipboard.writeText(decryptedData.value.paramValue)
      alert('值已复制到剪贴板')
    } catch (err) {
      console.error('Failed to copy value:', err)
    }
  }
}

const handleCopyKey = async () => {
  if (props.entry.param_key) {
    try {
      await navigator.clipboard.writeText(props.entry.param_key)
      alert('键已复制到剪贴板')
    } catch (err) {
      console.error('Failed to copy key:', err)
    }
  }
}

const togglePasswordVisibility = async () => {
  if (!showPassword.value) {
    await loadDecryptedData()
  }
  showPassword.value = !showPassword.value
}

const handleEdit = () => {
  emit('edit', props.entry)
}

const handleDelete = () => {
  emit('delete', props.entry.id)
}
</script>

<template>
  <CartoonCard class="vault-item" hoverable>
    <div class="item-content">
      <!-- Header -->
      <div class="item-header">
        <div class="item-title">
          <Lock :size="14" theme="outline" :style="{ color: categoryInfo.color }" />
          <h3>{{ entry.title }}</h3>
        </div>
        <span class="category-badge" :style="{ backgroundColor: categoryInfo.color }">
          {{ categoryInfo.label }}
        </span>
      </div>

      <!-- Info -->
      <div class="item-info">
        <div v-if="entry.param_key" class="info-row">
          <User :size="12" theme="outline" />
          <span class="info-label">键:</span>
          <span class="info-value">{{ entry.param_key }}</span>
          <button class="copy-btn" @click="handleCopyKey" title="复制键">
            <Copy :size="12" theme="outline" />
          </button>
        </div>

        <div class="info-row">
          <Lock :size="12" theme="outline" />
          <span class="info-label">值:</span>
          <span v-if="loading" class="info-value">加载中...</span>
          <span v-else-if="showPassword && decryptedData" class="info-value param-value">
            {{ decryptedData.paramValue }}
          </span>
          <span v-else class="info-value">••••••••</span>
          <button class="copy-btn" @click="handleCopyPassword" title="复制值">
            <Copy :size="12" theme="outline" />
          </button>
          <button class="view-btn" @click="togglePasswordVisibility" :title="showPassword ? '隐藏值' : '显示值'">
            <PreviewOpen v-if="!showPassword" :size="12" theme="outline" />
            <PreviewClose v-else :size="12" theme="outline" />
          </button>
        </div>

        <div v-if="entry.url" class="info-row">
          <Link :size="12" theme="outline" />
          <span class="info-label">网址:</span>
          <a :href="entry.url" target="_blank" class="info-value link">
            {{ entry.url }}
          </a>
        </div>
      </div>

      <!-- Notes Preview -->
      <div v-if="decryptedData && decryptedData.notes" class="notes-preview">
        <p class="notes-label">备注:</p>
        <p class="notes-text">{{ decryptedData.notes }}</p>
      </div>

      <!-- Actions -->
      <div class="item-actions">
        <button class="action-btn edit-btn" @click="handleEdit">
          <Edit :size="12" theme="outline" />
          编辑
        </button>
        <button class="action-btn delete-btn" @click="handleDelete">
          <Delete :size="12" theme="outline" />
          删除
        </button>
      </div>
    </div>
  </CartoonCard>
</template>

<style scoped>
.vault-item {
  height: 100%;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-xs);
}

.item-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex: 1;
  min-width: 0;
}

.item-title h3 {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-badge {
  padding: 1px 6px;
  border-radius: var(--border-radius-sm);
  color: white;
  font-size: 10px;
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.info-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.info-label {
  min-width: 28px;
  font-weight: var(--font-weight-medium);
}

.info-value {
  flex: 1;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-value.param-value {
  font-family: 'Consolas', 'Monaco', monospace;
}

.info-value.link {
  color: var(--color-accent);
  text-decoration: none;
}

.info-value.link:hover {
  text-decoration: underline;
}

.copy-btn,
.view-btn {
  padding: 2px;
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-fast);
}

.copy-btn:hover,
.view-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-primary);
}

.notes-preview {
  padding: var(--spacing-xs);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
}

.notes-label {
  margin: 0 0 2px 0;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.notes-text {
  margin: 0;
  color: var(--color-text-primary);
  line-height: 1.4;
  max-height: 42px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.item-actions {
  display: flex;
  gap: var(--spacing-xs);
  padding-top: var(--spacing-xs);
  border-top: var(--border-width) solid var(--color-border);
}

.action-btn {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background-color: var(--color-bg-tertiary);
}

.edit-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.delete-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
</style>
