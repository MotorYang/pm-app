<script setup>
import {computed} from 'vue'
import {FolderOpen, Down, Right} from '@icon-park/vue-next'

const props = defineProps({
  folder: {
    type: Object,
    required: true
  },
  depth: {
    type: Number,
    default: 0
  },
  collapsedFolders: {
    type: Set,
    required: true
  },
  activeDocumentId: {
    type: [String, Number],
    default: null
  },
  hasUnsavedChanges: {
    type: Boolean,
    default: false
  },
  getFileIcon: {
    type: Function,
    required: true
  },
  getFileIconColor: {
    type: Function,
    required: true
  }
})

const emit = defineEmits([
  'toggle-collapse',
  'folder-context-menu',
  'document-click',
  'document-context-menu'
])

const isCollapsed = computed(() => {
  return props.collapsedFolders.has(props.folder.path)
})

const paddingLeft = computed(() => {
  return `${8 + props.depth * 16}px`
})

const documentPaddingLeft = computed(() => {
  return `${28 + props.depth * 16}px`
})

const handleToggle = () => {
  emit('toggle-collapse', props.folder.path)
}

const handleFolderContextMenu = (event) => {
  console.log('FolderTreeItem emitting folder-context-menu:', props.folder.path)
  emit('folder-context-menu', props.folder.path, event)
}

const handleDocumentClick = (doc) => {
  emit('document-click', doc)
}

const handleDocumentContextMenu = (doc, event) => {
  console.log('FolderTreeItem emitting document-context-menu:', doc?.path)
  emit('document-context-menu', doc, event)
}

// 子文件夹事件处理 - 直接转发
const handleChildFolderContextMenu = (folderPath, event) => {
  console.log('FolderTreeItem forwarding child folder-context-menu:', folderPath)
  emit('folder-context-menu', folderPath, event)
}

const handleChildDocumentContextMenu = (doc, event) => {
  emit('document-context-menu', doc, event)
}
</script>

<template>
  <div class="folder-tree-item">
    <!-- 文件夹头部 -->
    <div
        class="folder-header"
        :style="{ paddingLeft }"
        @click="handleToggle"
        @contextmenu.prevent.stop="handleFolderContextMenu"
    >
      <Right v-if="isCollapsed" :size="12" theme="outline" class="folder-arrow"/>
      <Down v-else :size="12" theme="outline" class="folder-arrow"/>
      <FolderOpen :size="14" theme="outline" class="folder-icon"/>
      <span class="folder-name">{{ folder.name }}</span>
    </div>

    <!-- 展开的内容 -->
    <div v-if="!isCollapsed" class="folder-content">
      <!-- 文件夹内的文档 -->
      <div
          v-for="doc in folder.docs"
          :key="doc.id"
          class="document-item"
          :class="{ active: doc.id === activeDocumentId }"
          :style="{ paddingLeft: documentPaddingLeft }"
          @click="handleDocumentClick(doc)"
          @contextmenu.prevent.stop="handleDocumentContextMenu(doc, $event)"
      >
        <component
            :is="getFileIcon(doc)"
            :size="14"
            theme="outline"
            class="file-icon"
            :style="{ color: getFileIconColor(doc) }"
        />
        <span class="document-name">{{ doc.title }}.{{ doc.file_ext || 'md' }}</span>
        <span
            v-if="hasUnsavedChanges && doc.id === activeDocumentId"
            class="unsaved-indicator"
        >
          ●
        </span>
      </div>

      <!-- 子文件夹 -->
      <FolderTreeItem
          v-for="child in folder.children"
          :key="child.path"
          :folder="child"
          :depth="depth + 1"
          :collapsed-folders="collapsedFolders"
          :active-document-id="activeDocumentId"
          :has-unsaved-changes="hasUnsavedChanges"
          :get-file-icon="getFileIcon"
          :get-file-icon-color="getFileIconColor"
          @toggle-collapse="(path) => $emit('toggle-collapse', path)"
          @folder-context-menu="handleChildFolderContextMenu"
          @document-click="(doc) => $emit('document-click', doc)"
          @document-context-menu="handleChildDocumentContextMenu"
      />
    </div>
  </div>
</template>

<style scoped>
.folder-tree-item {
  display: flex;
  flex-direction: column;
}

.folder-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color 0.1s;
  user-select: none;
}

.folder-header:hover {
  background-color: var(--color-bg-tertiary);
}

.folder-arrow {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.folder-icon {
  color: var(--color-secondary);
  flex-shrink: 0;
}

.folder-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-content {
  display: flex;
  flex-direction: column;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 28px;
  cursor: pointer;
  transition: background-color 0.1s;
  color: var(--color-text-primary);
  font-size: 13px;
  user-select: none;
}

.document-item:hover {
  background-color: var(--color-bg-tertiary);
}

.document-item.active {
  background-color: rgba(var(--color-primary-rgb, 59, 130, 246), 0.15);
  color: var(--color-primary);
}

.document-item.active:hover {
  background-color: rgba(var(--color-primary-rgb, 59, 130, 246), 0.2);
}

.file-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.document-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unsaved-indicator {
  color: var(--color-warning);
  font-size: 10px;
  line-height: 1;
  margin-left: 4px;
}

.document-item.active .unsaved-indicator {
  color: var(--color-primary);
}
</style>
