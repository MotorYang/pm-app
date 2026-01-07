<script setup>
import { ref } from 'vue'
import { FileText, Github, SolidStateDisk, Lock, Hold } from '@icon-park/vue-next'
import CartoonTabs from '@/components/ui/CartoonTabs.vue'
import CartoonTab from '@/components/ui/CartoonTab.vue'
import DocumentsView from './DocumentsView.vue'
import FilesView from './FilesView.vue'
import GitView from './GitView.vue'
import VaultView from './VaultView.vue'
import { useProjectsStore } from '@/stores/projects.js'
import HandoverView from '@/views/HandoverView.vue'

const activeTab = ref('documents')
const projectsStore = useProjectsStore()

</script>

<template>
  <div class="project-view">
    <CartoonTabs v-model="activeTab" :title="projectsStore.activeProjectName">
      <CartoonTab name="handover" label="项目交接" :icon="Hold">
        <HandoverView />
      </CartoonTab>
      <CartoonTab name="vault" label="保险箱" :icon="Lock">
        <VaultView />
      </CartoonTab>
      <CartoonTab name="files" label="文件统计" :icon="SolidStateDisk">
        <FilesView />
      </CartoonTab>
      <CartoonTab name="git" label="版本管理" :icon="Github">
        <GitView />
      </CartoonTab>
      <CartoonTab name="documents" label="文档库" :icon="FileText">
        <DocumentsView />
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
