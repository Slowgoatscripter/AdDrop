import { getFeedback } from './actions'
import { FeedbackTable } from '@/components/admin/feedback-table'

export default async function FeedbackPage() {
  const { data, totalCount } = await getFeedback({ page: 1 })

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Feedback</h1>
      <FeedbackTable initialData={data} initialTotalCount={totalCount} />
    </div>
  )
}
