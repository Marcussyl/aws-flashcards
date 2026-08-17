import { Suspense } from 'react'
import { StudyView } from '@/components/StudyView'

export default function StudyPage() {
  return (
    <Suspense fallback={<p className="text-slate-400">Loading deck…</p>}>
      <StudyView />
    </Suspense>
  )
}
