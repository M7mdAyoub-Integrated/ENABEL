import { Navigate, useParams } from 'react-router-dom'

/**
 * The public site's paths before 0120 -- `/opportunity/:id`, `/apply/:id`,
 * `/linkage`, `/my-applications` -- each become `/sahel-horan/...`.
 *
 * Every one of those links was printed, sent or bookmarked before Ramtha
 * existed on this platform, so every one of them is Sahel Horan's. This is a
 * fact about the past, not about the table, which is why the slug is a
 * constant here and nowhere else: a Ramtha link has never had the old shape.
 */
export const LEGACY_PUBLIC_SLUG = 'sahel-horan'

export function LegacyPublicRedirect({
  to,
}: {
  to: 'opportunity' | 'apply' | 'linkage' | 'my-applications'
}) {
  const { id } = useParams()
  const tail = id ? `/${to}/${id}` : `/${to}`
  return <Navigate to={`/${LEGACY_PUBLIC_SLUG}${tail}`} replace />
}
