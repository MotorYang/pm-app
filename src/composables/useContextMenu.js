import { ref, shallowRef } from 'vue'

// 单例状态
const visible = ref(false)
const position = ref({ x: 0, y: 0 })
const items = shallowRef([])

export function useContextMenu() {
  const show = (event, menuItems) => {
    event.preventDefault()
    event.stopPropagation()

    items.value = menuItems
    position.value = { x: event.clientX, y: event.clientY }
    visible.value = true
  }

  const hide = () => {
    visible.value = false
    items.value = []
  }

  return {
    visible,
    position,
    items,
    show,
    hide
  }
}
