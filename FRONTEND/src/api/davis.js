export async function fetchLatest() {
  const res = await fetch('/api_davis.php?type=latest', { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchHistory() {
  const res = await fetch('/api_davis.php?type=history', { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
