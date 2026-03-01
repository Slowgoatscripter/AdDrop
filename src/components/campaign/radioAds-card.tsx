'use client';

import { ReactNode, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdCardWrapper } from './ad-card-wrapper';
import { ToneSwitcher } from './tone-switcher';
import { CardLayoutWrapper } from './card-layout-wrapper';
import { CardEditPanel } from './card-edit-panel';
import { EditableText } from './editable-text';
import {
  PlatformComplianceResult,
  RadioAdsContent,
  RadioScript,
  RadioTimeSlot,
  RadioTone,
} from '@/lib/types';
import type { PlatformQualityResult, QualityIssue } from '@/lib/types/quality';
import type { ListingData } from '@/lib/types/listing';
import { Clock, FileText, Lock, Mic, Music, Radio } from 'lucide-react';

// --- LockedPlatformOverlay stub ---
// Pro-and-up only. Replaced by the shared LockedPlatformOverlay in campaign-tabs.tsx.
// This stub exists for standalone use; isLocked is NOT passed from campaign-tabs.
function LockedPlatformOverlay({ children, isLocked }: { children: ReactNode; isLocked?: boolean }) {
  if (!isLocked) return <>{children}</>;
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 backdrop-blur-sm bg-background/60 rounded-xl flex items-center justify-center z-10">
        <div className="text-center space-y-2">
          <Lock className="w-6 h-6 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Upgrade to Pro</p>
        </div>
      </div>
    </div>
  );
}

// --- RadioIcon ---
function RadioIcon() {
  return (
    <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center">
      <Radio className="h-3.5 w-3.5 text-white" />
    </div>
  );
}

// --- Time slot display labels ---
const TIME_SLOT_LABELS: Record<RadioTimeSlot, string> = {
  '15s': '15 Second',
  '30s': '30 Second',
  '60s': '60 Second',
};

// --- Props ---
interface RadioAdsCardProps {
  content: RadioAdsContent;
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  onRevert?: (issue: QualityIssue) => void;
  onEditText?: (platform: string, field: string, newValue: string) => void;
  listing?: ListingData;
  isLocked?: boolean;
}

// --- MetadataRow helper ---
function MetadataRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="flex-shrink-0 mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        <p className="text-sm text-slate-700">{value}</p>
      </div>
    </div>
  );
}

// --- Main Component ---
export function RadioAdsCard({
  content,
  complianceResult,
  qualityResult,
  onReplace,
  onRevert,
  onEditText,
  listing: _listing,
  isLocked,
}: RadioAdsCardProps) {
  const timeSlots = Object.keys(content) as RadioTimeSlot[];
  const [selectedSlot, setSelectedSlot] = useState<RadioTimeSlot>(timeSlots[0] || '15s');

  const tonesForSlot = Object.keys(content[selectedSlot] || {}) as RadioTone[];
  const [selectedTone, setSelectedTone] = useState<RadioTone>(tonesForSlot[0] || 'conversational');

  const handleSlotChange = (slot: string) => {
    const newSlot = slot as RadioTimeSlot;
    setSelectedSlot(newSlot);
    const newTones = Object.keys(content[newSlot] || {}) as RadioTone[];
    if (!newTones.includes(selectedTone)) {
      setSelectedTone(newTones[0] || 'conversational');
    }
  };

  const currentScript: RadioScript | undefined = content[selectedSlot]?.[selectedTone];
  if (!currentScript) return null;

  const platformIcon = <RadioIcon />;
  const dimensionLabel = `${TIME_SLOT_LABELS[selectedSlot]} · Radio`;

  // --- Shared inner tabs (used in both panels) ---
  const innerTabs = (
    <Tabs value={selectedSlot} onValueChange={handleSlotChange} className="w-full">
      <TabsList className="w-full">
        {timeSlots.map((slot) => (
          <TabsTrigger key={slot} value={slot} className="flex-1 text-xs">
            {TIME_SLOT_LABELS[slot]}
          </TabsTrigger>
        ))}
      </TabsList>
      {/* TabsContent stubs required by shadcn Tabs to avoid warnings */}
      {timeSlots.map((slot) => (
        <TabsContent key={slot} value={slot} />
      ))}
    </Tabs>
  );

  const toneSwitcher = (
    <ToneSwitcher
      tones={tonesForSlot}
      selected={selectedTone}
      onSelect={(t) => setSelectedTone(t as RadioTone)}
      label="Tone"
    />
  );

  // --- Mockup content (lives inside AdCardWrapper preview) ---
  const mockupContent = (
    <>
      {/* Inner time-slot tabs */}
      <div className="mb-4">{innerTabs}</div>

      {/* Script header bar */}
      <div
        className="rounded-t-lg px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: '#4c1d95' }}
      >
        <span className="text-white text-xs font-semibold tracking-wide">
          Radio Script — {TIME_SLOT_LABELS[selectedSlot]}
        </span>
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded"
          style={{ backgroundColor: '#3b0764', color: '#c4b5fd' }}
        >
          {selectedTone.charAt(0).toUpperCase() + selectedTone.slice(1)}
        </span>
      </div>

      {/* Script body */}
      <div className="bg-slate-50 border border-slate-200 border-t-0 rounded-b-lg px-4 py-4 mb-3">
        {/* Mobile: editable; Desktop: read-only */}
        <div className="lg:hidden">
          {onEditText ? (
            <EditableText
              value={currentScript.script}
              onChange={() => {}}
              onSave={(val) => onEditText('radioAds', `${selectedSlot}.${selectedTone}.script`, val)}
              className="text-sm text-slate-800 leading-relaxed"
            />
          ) : (
            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {currentScript.script}
            </p>
          )}
        </div>
        <div className="hidden lg:block">
          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
            {currentScript.script}
          </p>
        </div>
      </div>

      {/* Metadata bar: word count + duration */}
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3">
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{currentScript.wordCount}</span> words
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            ~{currentScript.estimatedDuration}
          </span>
        </div>
      </div>

      {/* Optional fields (voiceStyle, musicSuggestion, notes) */}
      {(currentScript.voiceStyle || currentScript.musicSuggestion || currentScript.notes) && (
        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 space-y-0.5">
          {currentScript.voiceStyle && (
            <MetadataRow
              icon={<Mic className="h-3.5 w-3.5" />}
              label="Voice Style"
              value={currentScript.voiceStyle}
            />
          )}
          {currentScript.musicSuggestion && (
            <MetadataRow
              icon={<Music className="h-3.5 w-3.5" />}
              label="Music"
              value={currentScript.musicSuggestion}
            />
          )}
          {currentScript.notes && (
            <MetadataRow
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Notes"
              value={currentScript.notes}
            />
          )}
        </div>
      )}
    </>
  );

  // --- Preview Panel ---
  const previewPanel = (
    <AdCardWrapper
      platform="Radio Ad Script"
      platformIcon={platformIcon}
      dimensionLabel={dimensionLabel}
      complianceResult={complianceResult}
      qualityResult={qualityResult}
      copyText={currentScript.script}
      violations={complianceResult?.violations}
      onReplace={onReplace}
      onRevert={onRevert}
      platformId="radioAds"
      charCountText={currentScript.script}
      toneSwitcher={toneSwitcher}
    >
      {mockupContent}
    </AdCardWrapper>
  );

  // --- Edit Panel ---
  const editPanel = (
    <CardEditPanel
      platform="Radio Ad Script"
      platformIcon={platformIcon}
      content={currentScript.script}
      onEditText={
        onEditText
          ? (_platform, _field, val) => {
              onEditText('radioAds', `${selectedSlot}.${selectedTone}.script`, val);
            }
          : undefined
      }
      platformId="radioAds"
      fieldName={`${selectedSlot}.${selectedTone}.script`}
      complianceResult={complianceResult}
      qualityResult={qualityResult}
    >
      {innerTabs}
      <div className="mt-3">{toneSwitcher}</div>

      {/* Metadata summary */}
      <div className="mt-4 space-y-2">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{currentScript.wordCount} words</span>
          <span>~{currentScript.estimatedDuration}</span>
        </div>
        {currentScript.voiceStyle && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Voice:</span> {currentScript.voiceStyle}
          </p>
        )}
        {currentScript.musicSuggestion && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Music:</span> {currentScript.musicSuggestion}
          </p>
        )}
        {currentScript.notes && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Notes:</span> {currentScript.notes}
          </p>
        )}
      </div>
    </CardEditPanel>
  );

  return (
    <LockedPlatformOverlay isLocked={isLocked}>
      <CardLayoutWrapper editPanel={editPanel} previewPanel={previewPanel} />
    </LockedPlatformOverlay>
  );
}
