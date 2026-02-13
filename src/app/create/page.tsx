import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCampaignUsage } from '@/lib/usage/campaign-limits'
import { MlsInputForm } from '@/components/mls-input-form'
import { AppHeader } from '@/components/nav/app-header'
import { BackLink } from '@/components/nav/back-link'
import { BetaLimitReached } from '@/components/create/beta-limit-reached'
import { FeedbackShell } from '@/components/feedback/feedback-shell'
import { Footer } from '@/components/nav/footer'

export default async function CreatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signup?next=/create')

  const usage = await getCampaignUsage(supabase, user.id)

  return (
    <FeedbackShell>
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader variant="app" />
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-3xl mx-auto">
            <div className="mb-8">
              <BackLink href="/dashboard" label="Back to Dashboard" />
            </div>

            {usage.isLimited ? (
              <BetaLimitReached resetsAt={usage.resetsAt} />
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                      Create Your Campaign
                    </h1>
                    {!usage.isExempt && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {usage.used} of {usage.limit} this week
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Enter your property details and we&apos;ll generate ads for selected platforms.
                  </p>
                </div>

                <MlsInputForm />
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </FeedbackShell>
  )
}
