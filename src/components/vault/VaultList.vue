<script setup>
import { ref, computed } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { Plus, Search } from '@icon-park/vue-next'
import CartoonCard from '@/components/ui/CartoonCard.vue'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import VaultItem from '@/components/vault/VaultItem.vue'
import VaultEntryForm from '@/components/vault/VaultEntryForm.vue'

const vaultStore = useVaultStore()

const searchQuery = ref('')
const selectedCategory = ref('all')
const showEntryForm = ref(false)
const editingEntry = ref(null)

const categories = [
  { value: 'all', label: '全部' },
  { value: 'general', label: '通用' },
  { value: 'api_key', label: 'API密钥' },
  { value: 'database', label: '数据库' },
  { value: 'ssh', label: 'SSH' }
]

const filteredEntries = computed(() => {
  let filtered = vaultStore.entries

  // Filter by category
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(entry => entry.category === selectedCategory.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(entry =>
      entry.title.toLowerCase().includes(query) ||
      (entry.username && entry.username.toLowerCase().includes(query)) ||
      (entry.url && entry.url.toLowerCase().includes(query))
    )
  }

  return filtered
})

const handleAddNew = () => {
  editingEntry.value = null
  showEntryForm.value = true
}

const handleEdit = (entry) => {
  editingEntry.value = entry
  showEntryForm.value = true
}

const handleDelete = async (entryId) => {
  if (confirm('确定要删除此条目吗？此操作无法撤销！')) {
    try {
      await vaultStore.deleteEntry(entryId)
    } catch (err) {
      console.error('Failed to delete entry:', err)
    }
  }
}

const handleFormClose = () => {
  showEntryForm.value = false
  editingEntry.value = null
}

const handleFormSaved = () => {
  showEntryForm.value = false
  editingEntry.value = null
}
</script>

<template>
  <div class="vault-list">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <Search :size="18" theme="outline" />
        <CartoonInput
          v-model="searchQuery"
          placeholder="搜索条目..."
          class="search-input"
        />
      </div>

      <div class="category-filters">
        <button
          v-for="cat in categories"
          :key="cat.value"
          class="category-btn"
          :class="{ active: selectedCategory === cat.value }"
          @click="selectedCategory = cat.value"
        >
          {{ cat.label }}
        </button>
      </div>

      <CartoonButton variant="primary" @click="handleAddNew">
        <Plus :size="18" theme="outline" />
        添加条目
      </CartoonButton>
    </div>

    <!-- Entries List -->
    <div v-if="filteredEntries.length === 0" class="no-entries">
      <p v-if="vaultStore.entries.length === 0">
        暂无条目，点击"添加条目"创建第一个条目
      </p>
      <p v-else>
        没有找到匹配的条目
      </p>
    </div>

    <div v-else class="entries-grid">
      <VaultItem
        v-for="entry in filteredEntries"
        :key="entry.id"
        :entry="entry"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>

    <!-- Entry Form Modal -->
    <VaultEntryForm
      v-if="showEntryForm"
      :entry="editingEntry"
      @close="handleFormClose"
      @saved="handleFormSaved"
    />
  </div>
</template>

<style scoped>
.vault-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0;
}

.search-input :deep(input) {
  border: none;
  background: transparent;
  padding: 0;
}

.category-filters {
  display: flex;
  gap: var(--spacing-xs);
}

.category-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.category-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.category-btn.active {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.no-entries {
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-text-secondary);
}

.entries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-md);
}
</style>
