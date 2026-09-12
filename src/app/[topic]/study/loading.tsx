import { Suspense } from 'react'
import { StudyBootFallback } from '@/components/StudyBootFallback'
import { StudySessionsSkeleton } from '@/components/StudySessionsSkeleton'

export default function StudyRouteLoading() {
  return (
    <Suspense fallback={<StudySessionsSkeleton />}>
      <StudyBootFallback />
    </Suspense>
  )
}
