import { reactive, readonly } from 'vue'

export type ToastColor = 'success' | 'error' | 'info' | 'warning'

interface ToastState {
  visible: boolean
  message: string
  color: ToastColor
}

const state = reactive<ToastState>({
  visible: false,
  message: '',
  color: 'success',
})

let timer: ReturnType<typeof setTimeout> | undefined

function show(message: string, color: ToastColor = 'success'): void {
  state.message = message
  state.color = color
  state.visible = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    state.visible = false
  }, 3500)
}

function hide(): void {
  state.visible = false
}

export function useToast() {
  return {
    state: readonly(state),
    show,
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error'),
    info: (message: string) => show(message, 'info'),
    warning: (message: string) => show(message, 'warning'),
    hide,
  }
}
