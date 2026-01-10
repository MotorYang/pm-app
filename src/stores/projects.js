// Projects Store - Manage project list and active project
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Database from '@tauri-apps/plugin-sql'

export const useProjectsStore = defineStore('projects', () => {
  // State
  const projects = ref([])
  const activeProjectId = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const activeProject = computed(() => {
    return projects.value.find(p => p.id === activeProjectId.value) || null
  })

  const projectCount = computed(() => projects.value.length)

  const activeProjectName = computed(() => activeProject.value?.name || '未选择项目')

  // Database connection
  let db = null
  async function getDb() {
    if (!db) {
      db = await Database.load('sqlite:pm-app.db')
    }
    return db
  }

  // Actions
  async function loadProjects() {
    loading.value = true
    error.value = null
    try {
      const database = await getDb()
      const result = await database.select('SELECT * FROM projects ORDER BY last_accessed DESC')

      // 应用自定义排序
      const savedOrder = localStorage.getItem('pm-app-projects-order')
      if (savedOrder) {
        try {
          const orderIds = JSON.parse(savedOrder)
          // 按保存的顺序排序，未在列表中的放到最后
          result.sort((a, b) => {
            const indexA = orderIds.indexOf(a.id)
            const indexB = orderIds.indexOf(b.id)
            if (indexA === -1 && indexB === -1) return 0
            if (indexA === -1) return 1
            if (indexB === -1) return -1
            return indexA - indexB
          })
        } catch {
          // 忽略解析错误
        }
      }

      projects.value = result
    } catch (e) {
      error.value = e.message || 'Failed to load projects'
      console.error('Failed to load projects:', e)
    } finally {
      loading.value = false
    }
  }

  // 重新排序项目
  function reorderProjects(fromIndex, toIndex) {
    if (fromIndex === toIndex) return

    const items = [...projects.value]
    const [movedItem] = items.splice(fromIndex, 1)
    items.splice(toIndex, 0, movedItem)
    projects.value = items

    // 保存排序到 localStorage
    const orderIds = items.map(p => p.id)
    localStorage.setItem('pm-app-projects-order', JSON.stringify(orderIds))
  }

  async function addProject(projectData) {
    loading.value = true
    error.value = null
    try {
      const database = await getDb()
      const color = projectData.color || '#FF6B9D'
      const description = projectData.description || ''

      const result = await database.execute(
        'INSERT INTO projects (name, path, description, color) VALUES (?, ?, ?, ?)',
        [projectData.name, projectData.path, description, color]
      )

      await loadProjects() // Reload to get the full project data
      return result.lastInsertId
    } catch (e) {
      error.value = e.message || 'Failed to add project'
      console.error('Failed to add project:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteProject(id) {
    loading.value = true
    error.value = null
    try {
      const database = await getDb()
      await database.execute('DELETE FROM projects WHERE id = ?', [id])
      projects.value = projects.value.filter(p => p.id !== id)
      if (activeProjectId.value === id) {
        activeProjectId.value = null
      }
    } catch (e) {
      error.value = e.message || 'Failed to delete project'
      console.error('Failed to delete project:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateProject(id, projectData) {
    loading.value = true
    error.value = null
    try {
      const database = await getDb()
      const fields = []
      const values = []

      if (projectData.name !== undefined) {
        fields.push('name = ?')
        values.push(projectData.name)
      }
      if (projectData.path !== undefined) {
        fields.push('path = ?')
        values.push(projectData.path)
      }
      if (projectData.description !== undefined) {
        fields.push('description = ?')
        values.push(projectData.description)
      }
      if (projectData.color !== undefined) {
        fields.push('color = ?')
        values.push(projectData.color)
      }

      if (fields.length > 0) {
        values.push(id)
        await database.execute(
          `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
          values
        )

        // 更新本地数据
        const project = projects.value.find(p => p.id === id)
        if (project) {
          Object.assign(project, projectData)
        }
      }
    } catch (e) {
      error.value = e.message || 'Failed to update project'
      console.error('Failed to update project:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function setActiveProject(id) {
    activeProjectId.value = id
    if (id) {
      try {
        const database = await getDb()
        await database.execute(
            'UPDATE projects SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        )
        // 只更新当前项目的 last_accessed，不重新排序整个列表
        const project = projects.value.find(p => p.id === id)
        if (project) {
          project.last_accessed = new Date().toISOString()
        }
      } catch (e) {
        console.error('Failed to update access time:', e)
      }
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    projects,
    activeProjectId,
    activeProjectName,
    loading,
    error,

    // Getters
    activeProject,
    projectCount,

    // Actions
    loadProjects,
    addProject,
    deleteProject,
    updateProject,
    reorderProjects,
    setActiveProject,
    clearError
  }
})
