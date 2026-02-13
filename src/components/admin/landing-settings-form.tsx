'use client'

import { useState, useTransition } from 'react'
import { Plus, Minus } from 'lucide-react'
import { saveSettings, resetSettings } from '@/app/admin/settings/actions'
import type { LandingStat, FAQItem } from '@/lib/types/settings'

interface LandingSettingsFormProps {
  settings: Record<string, unknown>
}

export function LandingSettingsForm({ settings }: LandingSettingsFormProps) {
  // Hero
  const [heroPrefix, setHeroPrefix] = useState(settings['landing.hero_title_prefix'] as string)
  const [heroAccent, setHeroAccent] = useState(settings['landing.hero_title_accent'] as string)
  const [heroTagline, setHeroTagline] = useState(settings['landing.hero_tagline'] as string)
  const [heroDesc, setHeroDesc] = useState(settings['landing.hero_description'] as string)
  const [heroCta, setHeroCta] = useState(settings['landing.hero_cta'] as string)

  // Stats
  const [stats, setStats] = useState<LandingStat[]>(settings['landing.stats'] as LandingStat[])

  // FAQ
  const [faqs, setFaqs] = useState<FAQItem[]>(settings['landing.faq'] as FAQItem[])

  // CTA Footer
  const [ctaHeadline, setCtaHeadline] = useState(settings['landing.cta_headline'] as string)
  const [ctaText, setCtaText] = useState(settings['landing.cta_text'] as string)
  const [ctaBeta, setCtaBeta] = useState(settings['landing.cta_beta'] as string)

  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function updateStat(index: number, field: keyof LandingStat, value: string) {
    setStats((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  function updateFaq(index: number, field: keyof FAQItem, value: string) {
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)))
  }

  function addFaq() {
    setFaqs((prev) => [...prev, { question: '', answer: '' }])
  }

  function removeFaq(index: number) {
    setFaqs((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveSettings({
          'landing.hero_title_prefix': heroPrefix,
          'landing.hero_title_accent': heroAccent,
          'landing.hero_tagline': heroTagline,
          'landing.hero_description': heroDesc,
          'landing.hero_cta': heroCta,
          'landing.stats': stats,
          'landing.faq': faqs,
          'landing.cta_headline': ctaHeadline,
          'landing.cta_text': ctaText,
          'landing.cta_beta': ctaBeta,
        })
        setMessage({ type: 'success', text: 'Landing page settings saved.' })
        setTimeout(() => setMessage(null), 3000)
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
      }
    })
  }

  function handleReset() {
    if (!confirm('Reset all landing page settings to defaults?')) return
    startTransition(async () => {
      try {
        await resetSettings([
          'landing.hero_title_prefix', 'landing.hero_title_accent',
          'landing.hero_tagline', 'landing.hero_description', 'landing.hero_cta',
          'landing.stats', 'landing.faq',
          'landing.cta_headline', 'landing.cta_text', 'landing.cta_beta',
        ])
        window.location.reload()
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reset' })
      }
    })
  }

  const inputClass = 'w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold'
  const labelClass = 'block text-xs font-medium text-muted-foreground mb-1'
  const sectionClass = 'text-sm font-medium text-foreground mb-4 pb-2 border-b border-border'

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Hero Section */}
      <div>
        <h3 className={sectionClass}>Hero Section</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Title Prefix</label>
              <input className={inputClass} value={heroPrefix} onChange={(e) => setHeroPrefix(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Title Accent (gradient text)</label>
              <input className={inputClass} value={heroAccent} onChange={(e) => setHeroAccent(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Tagline</label>
            <input className={inputClass} value={heroTagline} onChange={(e) => setHeroTagline(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea className={`${inputClass} min-h-[60px]`} value={heroDesc} onChange={(e) => setHeroDesc(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>CTA Button Text</label>
            <input className={inputClass} value={heroCta} onChange={(e) => setHeroCta(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div>
        <h3 className={sectionClass}>Social Proof Stats (4 items)</h3>
        <div className="space-y-3">
          {stats.map((stat, i) => (
            <div key={i} className="grid grid-cols-[100px_1fr] gap-3">
              <div>
                <label className={labelClass}>Value</label>
                <input className={inputClass} value={stat.value} onChange={(e) => updateStat(i, 'value', e.target.value)} placeholder="12+" />
              </div>
              <div>
                <label className={labelClass}>Label</label>
                <input className={inputClass} value={stat.label} onChange={(e) => updateStat(i, 'label', e.target.value)} placeholder="Ad Platforms" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">FAQ Items</h3>
          <button onClick={addFaq} className="flex items-center gap-1 text-xs text-gold hover:text-gold/80 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <label className={labelClass}>Question</label>
                  <input className={inputClass} value={faq.question} onChange={(e) => updateFaq(i, 'question', e.target.value)} />
                </div>
                <button onClick={() => removeFaq(i)} className="p-1.5 text-muted-foreground hover:text-red-400 mt-4">
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <label className={labelClass}>Answer</label>
                <textarea className={`${inputClass} min-h-[60px]`} value={faq.answer} onChange={(e) => updateFaq(i, 'answer', e.target.value)} />
              </div>
            </div>
          ))}
          {faqs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No FAQ items. Click &ldquo;Add Item&rdquo; to create one.</p>
          )}
        </div>
      </div>

      {/* CTA Footer Section */}
      <div>
        <h3 className={sectionClass}>Footer CTA</h3>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Headline</label>
            <input className={inputClass} value={ctaHeadline} onChange={(e) => setCtaHeadline(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>CTA Button Text</label>
            <input className={inputClass} value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Beta Notice</label>
            <input className={inputClass} value={ctaBeta} onChange={(e) => setCtaBeta(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 rounded-md text-sm bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save Landing Page Settings'}
        </button>
        <button
          onClick={handleReset}
          disabled={isPending}
          className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
