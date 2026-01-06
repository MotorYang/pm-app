<script setup>
import { computed } from 'vue'
import { useFilesStore } from '@/stores/files'
import CartoonCard from '@/components/ui/CartoonCard.vue'

const props = defineProps({
  stats: {
    type: Array,
    required: true
  }
})

const filesStore = useFilesStore()

// 为不同文件类型生成颜色
const colors = [
  '#FF6B9D', '#FFA94D', '#4ECDC4', '#95E1D3', '#9B59B6',
  '#3498DB', '#E74C3C', '#F39C12', '#1ABC9C', '#2ECC71',
  '#E67E22', '#16A085', '#C0392B', '#8E44AD', '#2980B9'
]

function getColor(index) {
  return colors[index % colors.length]
}

// 显示前10个类型
const topStats = computed(() => {
  return props.stats.slice(0, 10)
})
</script>

<template>
  <CartoonCard class="file-type-stats">
    <h3 class="section-title">文件类型分布</h3>

    <div v-if="stats.length === 0" class="no-data">
      <p>暂无数据</p>
    </div>

    <div v-else class="stats-list">
      <div
        v-for="(stat, index) in topStats"
        :key="stat.type"
        class="stat-item"
      >
        <div class="stat-header">
          <div class="stat-info">
            <div
              class="stat-color"
              :style="{ backgroundColor: getColor(index) }"
            ></div>
            <span class="stat-type">{{ stat.type }}</span>
            <span class="stat-count">({{ stat.count }} 个文件)</span>
          </div>
          <div class="stat-size">
            {{ filesStore.formatSize(stat.size) }}
          </div>
        </div>

        <div class="stat-bar">
          <div
            class="stat-bar-fill"
            :style="{
              width: stat.percentage + '%',
              backgroundColor: getColor(index)
            }"
          ></div>
        </div>

        <div class="stat-percentage">
          {{ stat.percentage }}%
        </div>
      </div>

      <div v-if="stats.length > 10" class="more-types">
        还有 {{ stats.length - 10 }} 种其他文件类型
      </div>
    </div>
  </CartoonCard>
</template>

<style scoped>
.file-type-stats {
  padding: var(--spacing-lg);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-lg) 0;
}

.no-data {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.stat-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
  min-width: 0;
}

.stat-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stat-type {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.stat-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.stat-size {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.stat-bar {
  height: 8px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  transition: width var(--transition-normal);
  border-radius: var(--border-radius-sm);
}

.stat-percentage {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  text-align: right;
}

.more-types {
  text-align: center;
  padding: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  border-top: 1px dashed var(--color-border);
}
</style>
