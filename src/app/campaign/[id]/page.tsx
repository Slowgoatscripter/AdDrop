import { AppHeader } from '@/components/nav/app-header';
import { CampaignShell } from '@/components/campaign/campaign-shell';
import { FeedbackShell } from '@/components/feedback/feedback-shell';
import { Footer } from '@/components/nav/footer';

export default function CampaignPage() {
  return (
    <FeedbackShell>
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader variant="app" />
        <div className="flex-1">
          <CampaignShell />
        </div>
        <Footer />
      </div>
    </FeedbackShell>
  );
}
