<script setup>
import SplitPane from '@/components/ui/SplitPane.vue'
import DocumentEditor from './DocumentEditor.vue'
import DocumentPreview from './DocumentPreview.vue'
</script>

<template>
  <div class="document-split-view">
    <SplitPane :default-split="50" :min-size="20" direction="horizontal">
      <template #first>
        <DocumentEditor />
      </template>

      <template #second>
        <DocumentPreview />
      </template>
    </SplitPane>
  </div>
</template>

<style scoped>
.document-split-view {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
