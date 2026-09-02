import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const EDGE_EPSILON = 1

export function useScrollEdges() {
  const scrollViewport = ref<HTMLElement | null>(null)
  const scrollContent = ref<HTMLElement | null>(null)

  const canScrollUp = ref(false)
  const canScrollDown = ref(false)

  let resizeObserver: ResizeObserver | null = null

  function updateScrollEdges(): void {
    const viewport = scrollViewport.value

    if (viewport === null) {
      canScrollUp.value = false
      canScrollDown.value = false
      return
    }

    const maximumScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight)

    canScrollUp.value = viewport.scrollTop > EDGE_EPSILON
    canScrollDown.value = maximumScrollTop - viewport.scrollTop > EDGE_EPSILON
  }

  function observeScrollElements(): void {
    resizeObserver?.disconnect()

    const viewport = scrollViewport.value
    const content = scrollContent.value

    if (viewport !== null) {
      resizeObserver?.observe(viewport)
    }

    if (content !== null && content !== viewport) {
      resizeObserver?.observe(content)
    }

    void nextTick(updateScrollEdges)
  }

  watch([scrollViewport, scrollContent], observeScrollElements, {
    flush: 'post',
  })

  onMounted(() => {
    resizeObserver = new ResizeObserver(updateScrollEdges)
    observeScrollElements()
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
  })

  return {
    scrollViewport,
    scrollContent,
    canScrollUp,
    canScrollDown,
    updateScrollEdges,
  }
}
