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
      projects.value = result
    } catch (e) {
      error.value = e.message || 'Failed to load projects'
      console.error('Failed to load projects:', e)
    } finally {
      loading.value = false
    }
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
    setActiveProject,
    clearError
  }
})
