import { useEffect, useState } from 'react'

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      try {
        const d = await fn()
        if (alive) setData(d)
      } catch (err) {
        console.error(err)
        if (alive) setData(null)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, loading }
}
