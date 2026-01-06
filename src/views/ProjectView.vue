<script setup>
import { ref } from 'vue'
import { FileText, Github, SolidStateDisk, Lock } from '@icon-park/vue-next'
import CartoonTabs from '@/components/ui/CartoonTabs.vue'
import CartoonTab from '@/components/ui/CartoonTab.vue'
import DocumentsView from './DocumentsView.vue'

const activeTab = ref('documents')
</script>

<template>
  <div class="project-view">
    <CartoonTabs v-model="activeTab">
      <CartoonTab name="documents" label="文档库" :icon="FileText">
        <DocumentsView />
      </CartoonTab>

      <CartoonTab name="git" label="Git" :icon="Github">
        <div class="placeholder">
          <h2>Git 集成</h2>
          <p>查看项目的Git状态和提交历史</p>
          <p class="hint">将在阶段4实现</p>
        </div>
      </CartoonTab>

      <CartoonTab name="files" label="文件统计" :icon="SolidStateDisk">
        <div class="placeholder">
          <h2>文件统计</h2>
          <p>分析和可视化项目文件占用情况</p>
          <p class="hint">将在阶段5实现</p>
        </div>
      </CartoonTab>

      <CartoonTab name="vault" label="保险箱" :icon="Lock">
        <div class="placeholder">
          <h2>安全保险箱</h2>
          <p>加密存储账号密码等敏感信息</p>
          <p class="hint">将在阶段6实现</p>
        </div>
      </CartoonTab>
    </CartoonTabs>
  </div>
</template>

<style scoped>
.project-view {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--spacing-2xl);
  text-align: center;
}

.placeholder h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--spacing-md);
}

.placeholder p {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.placeholder .hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  font-style: italic;
}
</style>
