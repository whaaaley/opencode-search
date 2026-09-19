type SafeSuccess<T> = {
  data: T
  error: null
}

type SafeError = {
  data: null
  error: Error
}

export type SafeResult<T> = SafeSuccess<T> | SafeError

export const safe = <T>(fn: () => T): SafeResult<T> => {
  try {
    return { data: fn(), error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
  }
}

export const safeAsync = async <T>(fn: () => Promise<T>): Promise<SafeResult<T>> => {
  try {
    return { data: await fn(), error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
  }
}
