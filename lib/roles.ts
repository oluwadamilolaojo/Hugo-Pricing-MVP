const adminEmails    = (process.env.NEXT_PUBLIC_ADMIN_EMAILS    ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const reviewerEmails = (process.env.NEXT_PUBLIC_REVIEWER_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
export function isAdmin(email: string | null | undefined): boolean    { return adminEmails.includes((email ?? '').toLowerCase()) }
export function isReviewer(email: string | null | undefined): boolean { return reviewerEmails.includes((email ?? '').toLowerCase()) }
