<script setup>
import {
  TextBold,
  TextItalic,
  Code,
  Quote,
  ListCheckbox,
  ListTwo,
  Link as LinkIcon,
  Pic,
  H,
  AlignTextBoth
} from '@icon-park/vue-next'
import CartoonButton from '@/components/ui/CartoonButton.vue'

const emit = defineEmits(['insert'])

const tools = [
  { icon: TextBold, label: '粗体', syntax: '**', type: 'wrap' },
  { icon: TextItalic, label: '斜体', syntax: '*', type: 'wrap' },
  { icon: Code, label: '代码', syntax: '`', type: 'wrap' },
  { icon: H, label: '标题', syntax: '# ', type: 'line-prefix' },
  { icon: Quote, label: '引用', syntax: '> ', type: 'line-prefix' },
  { icon: ListTwo, label: '列表', syntax: '- ', type: 'line-prefix' },
  { icon: ListCheckbox, label: '任务', syntax: '- [ ] ', type: 'line-prefix' },
  { icon: LinkIcon, label: '链接', syntax: '[]()', type: 'link' },
  { icon: Pic, label: '图片', syntax: '![]()', type: 'image' },
  { icon: AlignTextBoth, label: '表格', syntax: '', type: 'table' },
]

const handleToolClick = (tool) => {
  emit('insert', tool)
}
</script>

<template>
  <div class="markdown-toolbar">
    <div class="toolbar-group">
      <CartoonButton
        v-for="tool in tools"
        :key="tool.label"
        variant="ghost"
        size="sm"
        :title="tool.label"
        @click="handleToolClick(tool)"
        class="toolbar-button"
      >
        <component :is="tool.icon" :size="18" theme="outline" />
      </CartoonButton>
    </div>
  </div>
</template>

<style scoped>
.markdown-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-bottom: var(--border-width) solid var(--color-border);
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.toolbar-button {
  min-width: 32px;
  height: 32px;
  padding: var(--spacing-xs);
  transition: all var(--transition-fast);
}

.toolbar-button:hover {
  background-color: var(--color-bg-tertiary);
  transform: translateY(-1px);
}
</style>
