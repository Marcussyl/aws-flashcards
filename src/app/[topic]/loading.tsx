import { DeckShuffling } from '@/components/DeckShuffling'

export default function TopicDashboardLoading() {
  return (
    <DeckShuffling
      badge="Loading topic"
      title="Shuffling deck"
      subtitle="Lining up cards for this topic so you can dive in."
      footer="Preparing your topic"
    />
  )
}