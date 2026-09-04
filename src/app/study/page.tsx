import { Suspense } from 'react'
import { IconShuffle } from '@/components/icons'
import { StudyView } from '@/components/StudyView'

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-1 flex-col items-center justify-center text-center">
          <IconShuffle className="h-6 w-6 text-amber-300" />
          <p className="mt-3 text-slate-400">Loading deck…</p>
        </div>
      }
    >
      <StudyView />
    </Suspense>
  )
}
