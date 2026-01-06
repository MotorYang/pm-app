// useTauri Composable - Tauri API helpers
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

export function useTauri() {
  const invokeCommand = async (command, args = {}) => {
    try {
      return await invoke(command, args)
    } catch (error) {
      console.error(`Tauri command '${command}' failed:`, error)
      throw error
    }
  }

  const selectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择项目文件夹',
      })
      return selected
    } catch (error) {
      console.error('Failed to select folder:', error)
      return null
    }
  }

  const selectFile = async (filters = []) => {
    try {
      const selected = await open({
        multiple: false,
        filters,
        title: '选择文件',
      })
      return selected
    } catch (error) {
      console.error('Failed to select file:', error)
      return null
    }
  }

  return {
    invokeCommand,
    selectFolder,
    selectFile
  }
}
