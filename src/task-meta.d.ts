import 'vite-plus/test'

declare module 'vite-plus/test' {
  // crush reads these off a test's options: the question it answers and the steps it takes.
  interface TaskMeta {
    answers?: string
    steps?: number
  }
}
