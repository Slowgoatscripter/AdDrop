import { createClient } from '@/lib/supabase/server'
import { QATabs } from '@/components/admin/compliance-qa/qa-tabs'

export default async function ComplianceQAPage() {
  const supabase = await createClient()

  const [{ data: ads }, { data: runs }] = await Promise.all([
    supabase
      .from('compliance_test_ads')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('compliance_test_runs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Compliance QA</h1>
      <QATabs initialAds={ads || []} initialRuns={runs || []} />
    </div>
  )
}
