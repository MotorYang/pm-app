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
      await navigator.clipboard.writeText(decryptedData.value.password)
      // You could add a toast notification here
      alert('密码已复制到剪贴板')
    } catch (err) {
      console.error('Failed to copy password:', err)
    }
  }
}

const handleCopyUsername = async () => {
  if (props.entry.username) {
    try {
      await navigator.clipboard.writeText(props.entry.username)
      alert('用户名已复制到剪贴板')
    } catch (err) {
      console.error('Failed to copy username:', err)
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
          <Lock :size="20" theme="outline" :style="{ color: categoryInfo.color }" />
          <h3>{{ entry.title }}</h3>
        </div>
        <span class="category-badge" :style="{ backgroundColor: categoryInfo.color }">
          {{ categoryInfo.label }}
        </span>
      </div>

      <!-- Info -->
      <div class="item-info">
        <div v-if="entry.username" class="info-row">
          <User :size="16" theme="outline" />
          <span class="info-label">键:</span>
          <span class="info-value">{{ entry.username }}</span>
          <button class="copy-btn" @click="handleCopyUsername" title="复制键">
            <Copy :size="14" theme="outline" />
          </button>
        </div>

        <div class="info-row">
          <Lock :size="16" theme="outline" />
          <span class="info-label">值:</span>
          <span v-if="loading" class="info-value">加载中...</span>
          <span v-else-if="showPassword && decryptedData" class="info-value password">
            {{ decryptedData.password }}
          </span>
          <span v-else class="info-value">••••••••</span>
          <button class="copy-btn" @click="handleCopyPassword" title="复制值">
            <Copy :size="14" theme="outline" />
          </button>
          <button class="view-btn" @click="togglePasswordVisibility" :title="showPassword ? '隐藏密码' : '显示密码'">
            <PreviewOpen v-if="!showPassword" :size="14" theme="outline" />
            <PreviewClose v-else :size="14" theme="outline" />
          </button>
        </div>

        <div v-if="entry.url" class="info-row">
          <Link :size="16" theme="outline" />
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
          <Edit :size="16" theme="outline" />
          编辑
        </button>
        <button class="action-btn delete-btn" @click="handleDelete">
          <Delete :size="16" theme="outline" />
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
  gap: var(--spacing-md);
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

.item-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
  min-width: 0;
}

.item-title h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-badge {
  padding: 2px var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  color: white;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.info-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.info-label {
  min-width: 60px;
  font-weight: var(--font-weight-medium);
}

.info-value {
  flex: 1;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-value.password {
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
  padding: 4px;
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
  padding: var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
}

.notes-label {
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.notes-text {
  margin: 0;
  color: var(--color-text-primary);
  line-height: 1.5;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.item-actions {
  display: flex;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: var(--border-width) solid var(--color-border);
}

.action-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background-color: var(--color-bg-tertiary);
  transform: translateY(-1px);
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
