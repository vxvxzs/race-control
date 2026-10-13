import type { Access, FieldAccess } from 'payload'
export const adminOnly: Access = ({ req }) => req.user?.role === 'admin'
export const adminField: FieldAccess = ({ req }) =>
  req.user?.role === 'admin' && !req.user.reviewerAccess
export const privateField: FieldAccess = ({ req, doc }) =>
  req.user?.role === 'admin' || Boolean(req.user && String(req.user.id) === String(doc?.id))
export const ownDocuments: Access = ({ req }) =>
  req.user ? { recipient: { equals: req.user.id } } : false
