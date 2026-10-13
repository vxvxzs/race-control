import NextLink from 'next/link'
import type { ComponentProps } from 'react'
// Dynamic league pages query the CMS. Fetch on navigation, not for every visible link.
export default function AppLink({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} prefetch={prefetch} />
}
