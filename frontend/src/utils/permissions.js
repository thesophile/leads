export function can(user, key) {
  if (!user) return false
  if (user.is_superuser) return true
  return Array.isArray(user.permissions) && user.permissions.includes(key)
}

export function roleName(user) {
  return user?.role?.name || ''
}