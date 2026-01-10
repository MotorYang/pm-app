import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'

export const useGitStore = defineStore('git', () => {
  const loading = ref(false)
  const error = ref(null)
  const currentBranch = ref('')
  const branches = ref([])
  const commits = ref([])
  const currentCommit = ref(null)
  const status = ref(null)
  const remotes = ref([])

  // 当前项目路径
  const projectPath = ref('')

  // 本地分支列表
  const localBranches = computed(() => {
    return branches.value.filter(b => !b.is_remote)
  })

  // 远程分支列表
  const remoteBranches = computed(() => {
    return branches.value.filter(b => b.is_remote)
  })

  // 检查是否为Git仓库
  async function isGitRepository(path) {
    try {
      return await invoke('git_is_repository', { path })
    } catch (e) {
      console.error('Failed to check git repository:', e)
      return false
    }
  }

  // 获取当前分支
  async function getCurrentBranch() {
    if (!projectPath.value) return

    try {
      const branch = await invoke('git_get_current_branch', { path: projectPath.value })
      currentBranch.value = branch
      return branch
    } catch (e) {
      console.error('Failed to get current branch:', e)
      currentBranch.value = ''
      return ''
    }
  }

  // 获取所有分支
  async function getAllBranches() {
    if (!projectPath.value) return []

    try {
      const branchList = await invoke('git_get_branches', { path: projectPath.value })
      branches.value = branchList
      return branchList
    } catch (e) {
      console.error('Failed to get branches:', e)
      branches.value = []
      return []
    }
  }

  // 获取提交历史
  async function getCommitHistory(limit = 100) {
    if (!projectPath.value) return []

    try {
      const commitList = await invoke('git_get_commits', {
        path: projectPath.value,
        limit
      })
      commits.value = commitList

      // 默认展开第一个commit的提交详情
      if (commitList.length > 0) {
        await getCommitDetail(commitList[0].hash)
      }

      return commitList
    } catch (e) {
      console.error('Failed to get commit history:', e)
      commits.value = []
      return []
    }
  }

  // 获取提交详情
  async function getCommitDetail(hash) {
    if (!projectPath.value) return null

    try {
      const detail = await invoke('git_get_commit_detail', {
        path: projectPath.value,
        hash
      })
      currentCommit.value = detail
      return detail
    } catch (e) {
      console.error('Failed to get commit detail:', e)
      return null
    }
  }

  // 切换分支
  async function checkoutBranch(branchName) {
    if (!projectPath.value) {
      throw new Error('No project path set')
    }

    loading.value = true
    error.value = null

    try {
      await invoke('git_checkout_branch', {
        path: projectPath.value,
        branchName
      })

      // 刷新数据
      await Promise.all([
        getCurrentBranch(),
        getCommitHistory()
      ])

      return true
    } catch (e) {
      error.value = e || '切换分支失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  // 获取仓库状态
  async function getStatus() {
    if (!projectPath.value) return null

    try {
      const statusData = await invoke('git_get_status', { path: projectPath.value })
      status.value = statusData
      return statusData
    } catch (e) {
      console.error('Failed to get status:', e)
      return null
    }
  }

  // 获取远程仓库
  async function getRemotes() {
    if (!projectPath.value) return []

    try {
      const remoteList = await invoke('git_get_remotes', { path: projectPath.value })
      remotes.value = remoteList
      return remoteList
    } catch (e) {
      console.error('Failed to get remotes:', e)
      remotes.value = []
      return []
    }
  }

  // 初始化Git数据
  async function initGitData(path) {
    if (!path) {
      error.value = 'Project path is required'
      return false
    }

    projectPath.value = path
    loading.value = true
    error.value = null

    try {
      // 检查是否为Git仓库
      const isRepo = await isGitRepository(path)
      if (!isRepo) {
        error.value = '该项目不是Git仓库'
        return false
      }

      // 并行获取所有Git信息
      await Promise.all([
        getCurrentBranch(),
        getAllBranches(),
        getCommitHistory(),
        getStatus(),
        getRemotes()
      ])

      return true
    } catch (e) {
      error.value = e.message || 'Failed to load Git data'
      console.error('Failed to init git data:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  // 清除数据
  function clearData() {
    currentBranch.value = ''
    branches.value = []
    commits.value = []
    currentCommit.value = null
    status.value = null
    remotes.value = []
    error.value = null
    projectPath.value = ''
  }

  // 暂存文件
  async function stageFiles(files) {
    if (!projectPath.value) {
      throw new Error('No project path set')
    }

    try {
      await invoke('git_stage_files', {
        path: projectPath.value,
        files
      })

      // 刷新状态
      await getStatus()
      return true
    } catch (e) {
      console.error('Failed to stage files:', e)
      throw e
    }
  }

  // 取消暂存文件
  async function unstageFiles(files) {
    if (!projectPath.value) {
      throw new Error('No project path set')
    }

    try {
      await invoke('git_unstage_files', {
        path: projectPath.value,
        files
      })

      // 刷新状态
      await getStatus()
      return true
    } catch (e) {
      console.error('Failed to unstage files:', e)
      throw e
    }
  }

  // 提交更改
  async function commit(message) {
    if (!projectPath.value) {
      throw new Error('No project path set')
    }

    if (!message || message.trim() === '') {
      throw new Error('Commit message is required')
    }

    loading.value = true
    try {
      const commitId = await invoke('git_commit', {
        path: projectPath.value,
        message
      })

      // 刷新数据
      await Promise.all([
        getStatus(),
        getCommitHistory()
      ])

      return commitId
    } catch (e) {
      console.error('Failed to commit:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // 格式化日期
  function formatDate(timestamp) {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diff = now - date

    // 少于1天
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      if (hours < 1) {
        const minutes = Math.floor(diff / 60000)
        return `${minutes}分钟前`
      }
      return `${hours}小时前`
    }

    // 少于30天
    if (diff < 2592000000) {
      const days = Math.floor(diff / 86400000)
      return `${days}天前`
    }

    // 返回完整日期
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return {
    // State
    loading,
    error,
    currentBranch,
    branches,
    commits,
    currentCommit,
    status,
    remotes,
    projectPath,

    // Computed
    localBranches,
    remoteBranches,

    // Actions
    initGitData,
    getCurrentBranch,
    getAllBranches,
    getCommitHistory,
    getCommitDetail,
    checkoutBranch,
    getStatus,
    getRemotes,
    stageFiles,
    unstageFiles,
    commit,
    clearData,
    formatDate,
  }
})
