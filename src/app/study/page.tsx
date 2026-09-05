import { redirect } from 'next/navigation'

export default async function LegacyStudyPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; mode?: string }>
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  if (params.category) {
    query.set('category', params.category)
  }
  if (params.mode) {
    query.set('mode', params.mode)
  }
  const suffix = query.toString()
  redirect(suffix ? `/aws/study?${suffix}` : '/aws/study')
}
