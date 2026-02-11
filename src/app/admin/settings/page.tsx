import { SettingsTabs } from '@/components/admin/settings-tabs'
import { loadSettings } from './actions'

export default async function SettingsPage() {
  const settings = await loadSettings()

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Settings</h1>
      <SettingsTabs settings={settings} />
    </div>
  )
}
