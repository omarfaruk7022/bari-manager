export const isAdmin = (req) => req.user?.role === 'admin'

export const getRequestedLandlordId = (req) => (
  req.query.landlordId
  || req.body.landlordId
  || req.params.landlordId
  || null
)

export const getScopedLandlordId = (req, options = {}) => {
  const requested = getRequestedLandlordId(req)
  if (isAdmin(req)) {
    if (requested) return requested
    if (options.allowAllForAdmin) return null
  }
  if (req.user?.role === 'tenant') return req.user?.landlordId || null
  return req.user?._id || null
}

export const withScopedFilter = (req, baseFilter = {}, options = {}) => {
  const landlordId = getScopedLandlordId(req, options)
  if (landlordId) return { ...baseFilter, landlordId }
  return { ...baseFilter }
}
