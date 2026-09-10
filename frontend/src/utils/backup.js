import { api } from '../api/client'

export async function downloadBackup() {
  const data = await api.get('/backup/export/')
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `backup-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return data.length
}

export async function restoreBackup(file) {
  const fd = new FormData()
  fd.append('file', file)
  await api.post('/backup/restore/', fd)
}