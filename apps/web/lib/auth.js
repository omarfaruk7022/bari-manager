export const storeAuth = ({ token, user }) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bm_token', token)
    localStorage.setItem('bm_user', JSON.stringify(user))
  }
}

export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('bm_token')
    localStorage.removeItem('bm_user')
  }
}

export const getStoredUser = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('bm_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const getToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('bm_token')
}
