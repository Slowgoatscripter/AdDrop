import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Settings</h1>
      <div className="rounded-lg border border-border border-dashed bg-card/50 p-12 flex flex-col items-center justify-center text-center">
        <Settings className="w-10 h-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-foreground">Landing Page Settings</p>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
          Control landing page sections, headlines, and CTAs from here. Coming soon.
        </p>
      </div>
    </div>
  )
}
