// Utility function for <input type="datetime-local">
// Returns string in format "YYYY-MM-DDTHH:mm" using browser's local time
export const toDateTimeLocal = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Utility function to convert date to ISO string with local time (for backend)
// Returns string in format "YYYY-MM-DDTHH:mm:ss"
export const toLocalISOString = (dateInput) => {
  if (!dateInput) return null
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const offset = date.getTimezoneOffset() * 60000
  const localDate = new Date(date.getTime() - offset)
  return localDate.toISOString().slice(0, 19)
}

// Utility function to format date for display
export const formatDateTime = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Utility function to format time only
export const formatTime = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

// Utility function to format date only
export const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}
