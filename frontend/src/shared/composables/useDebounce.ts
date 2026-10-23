import { onUnmounted, ref, type Ref } from 'vue'

export function useDebounce<T>(source: Ref<T>, delay = 300) {
  const debounced = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | undefined

  const stop = (): void => {
    if (timer) clearTimeout(timer)
  }

  const run = (value: T): void => {
    stop()
    timer = setTimeout(() => {
      debounced.value = value
    }, delay)
  }

  const flush = (value: T): void => {
    stop()
    debounced.value = value
  }

  onUnmounted(stop)

  return { debounced, run, flush, stop }
}
