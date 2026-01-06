import { h, createVNode, render } from 'vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

export function useConfirm() {
    return function confirm(options = {}) {
        return new Promise((resolve) => {
            // 创建挂载容器
            const container = document.createElement('div')
            document.body.appendChild(container)

            const close = () => {
                render(null, container)
                container.remove()
            }

            const vnode = createVNode(ConfirmDialog, {
                open: true,
                title: options.title || '',
                message: options.message || '',
                confirmText: options.confirmText || '确认',
                cancelText: options.cancelText || '取消',
                danger: !!options.danger,
                'onUpdate:open': (val) => {
                    if (!val) close()
                },
                onConfirm: () => {
                    resolve(true)
                    close()
                },
                onCancel: () => {
                    resolve(false)
                    close()
                }
            })

            render(vnode, container)
        })
    }
}
