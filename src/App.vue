<script setup>
import { ref, computed } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import ProjectView from '@/views/ProjectView.vue'
import ShortcutCard from '@/components/shortcuts/ShortcutCard.vue'
import ShortcutDialog from '@/components/shortcuts/ShortcutDialog.vue'
import { useProjectsStore } from '@/stores/projects'
import { useShortcutsStore } from '@/stores/shortcuts'
import { useConfirm } from '@/composables/useConfirm'
import { FolderPlus, FileText, Github, SolidStateDisk, Lock, Plus } from '@icon-park/vue-next'
import CartoonButton from '@/components/ui/CartoonButton.vue'

const projectsStore = useProjectsStore()
const shortcutsStore = useShortcutsStore()
const confirmDialog = useConfirm()

const showShortcutDialog = ref(false)
const editingShortcut = ref(null)

const features = [
  {
    icon: FolderPlus,
    title: '项目管理',
    description: '从本地加载和管理多个项目'
  },
  {
    icon: FileText,
    title: 'Markdown文档库',
    description: '支持分栏预览的Markdown编辑器'
  },
  {
    icon: Github,
    title: 'Git集成',
    description: '查看项目的Git状态和提交历史'
  },
  {
    icon: SolidStateDisk,
    title: '文件统计',
    description: '分析和可视化项目文件占用情况'
  },
  {
    icon: Lock,
    title: '安全保险箱',
    description: '加密存储账号密码等敏感信息'
  }
]

const hasActiveProject = computed(() => projectsStore.activeProject !== null)

// 快捷方式处理
const handleAddShortcut = () => {
  editingShortcut.value = null
  showShortcutDialog.value = true
}

const handleEditShortcut = (shortcut) => {
  editingShortcut.value = shortcut
  showShortcutDialog.value = true
}

const handleDeleteShortcut = async (id) => {
  const confirm = await confirmDialog(
      {
        title: '删除快捷方式',
        message: '该操作不可撤销，是否继续？',
        danger: true,
        confirmText: '删除',
        cancelText: '取消'
      }
  )

  if (confirm) {
    try {
      await shortcutsStore.deleteShortcut(id);
    } catch (e) {
      alert('删除失败: ' + (e.message || '未知错误'))
    }
  }
}

const handleSaveShortcut = (data) => {
  if (data.id) {
    // 编辑模式
    shortcutsStore.updateShortcut(data.id, data)
  } else {
    // 新建模式
    shortcutsStore.addShortcut(data)
  }
}
</script>

<template>
  <div class="app">
    <AppHeader />
    <AppLayout>
      <!-- Welcome screen when no project is selected -->
      <div v-if="!hasActiveProject" class="welcome-section animate-fade-in">
        <h1 class="welcome-title">
          欢迎使用 PM-App
        </h1>
        <p class="welcome-subtitle">
          功能丰富的本地项目管理应用
        </p>

        <!-- 快捷方式区域 -->
        <div class="shortcuts-section">
          <div class="section-header">
            <h2 class="section-title">快捷方式</h2>
            <CartoonButton @click="handleAddShortcut">
              <Plus :size="16" theme="outline" />
              添加
            </CartoonButton>
          </div>

          <div v-if="shortcutsStore.shortcuts.length > 0" class="shortcuts-grid">
            <ShortcutCard
              v-for="shortcut in shortcutsStore.shortcuts"
              :key="shortcut.id"
              :shortcut="shortcut"
              @edit="handleEditShortcut"
              @delete="handleDeleteShortcut"
            />
          </div>

          <div v-else class="no-shortcuts">
            <p>暂无快捷方式，点击右上角按钮添加</p>
          </div>
        </div>

<!--        <div class="features-grid">-->
<!--          <CartoonCard-->
<!--            v-for="(feature, index) in features"-->
<!--            :key="index"-->
<!--            hoverable-->
<!--            shadow="md"-->
<!--            class="feature-card animate-bounce-in"-->
<!--            :style="{ animationDelay: `${index * 0.1}s` }"-->
<!--          >-->
<!--            <div class="feature-content">-->
<!--              <component-->
<!--                :is="feature.icon"-->
<!--                :size="48"-->
<!--                :theme="'outline'"-->
<!--                :fill="'var(&#45;&#45;color-primary)'"-->
<!--                class="feature-icon"-->
<!--              />-->
<!--              <h3 class="feature-title">{{ feature.title }}</h3>-->
<!--              <p class="feature-description">{{ feature.description }}</p>-->
<!--            </div>-->
<!--          </CartoonCard>-->
<!--        </div>-->

        <div class="info-section">
          <p class="info-text">
            左侧点击"添加"按钮开始添加项目。
          </p>
        </div>
      </div>

      <!-- Project view when a project is selected -->
      <ProjectView v-else />
    </AppLayout>

    <!-- 快捷方式对话框 -->
    <ShortcutDialog
      v-model:show="showShortcutDialog"
      :edit-data="editingShortcut"
      @save="handleSaveShortcut"
    />
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.welcome-section {
  padding: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.welcome-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  text-align: center;
  margin-bottom: var(--spacing-sm);
}

.welcome-subtitle {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: var(--spacing-2xl);
}

.shortcuts-section {
  margin-bottom: var(--spacing-2xl);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--border-radius-lg);
  border: var(--border-width) solid var(--color-border);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.section-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.no-shortcuts {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-2xl);
}

.feature-card {
  transition: all var(--transition-normal);
}

.feature-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--spacing-md);
}

.feature-icon {
  transition: transform var(--transition-normal);
}

.feature-card:hover .feature-icon {
  transform: scale(1.1) rotate(5deg);
}

.feature-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.feature-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.info-section {
  text-align: center;
  margin-top: var(--spacing-2xl);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius-lg);
  border: var(--border-width) solid var(--color-border);
}

.info-text {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  margin: var(--spacing-sm) 0;
}
</style>
