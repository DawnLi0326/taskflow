export function formatDate(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateShort(date) {
  const d = new Date(date)
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${m}月${day}日`
}
