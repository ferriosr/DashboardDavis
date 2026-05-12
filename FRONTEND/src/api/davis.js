export async function fetchLatest() {
  const res = await fetch('/api/davis?type=latest', { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchHistory() {
  const res = await fetch('/api/davis?type=history', { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
