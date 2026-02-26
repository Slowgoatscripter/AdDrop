import type {
  AudioTone,
  RadioScript,
  RadioAdsContent,
  PlatformId,
  PlatformCategory,
  CampaignKit,
} from '@/lib/types/campaign';

// ---- AudioTone ----

describe('AudioTone', () => {
  it('accepts valid tone values', () => {
    const tones: AudioTone[] = ['conversational', 'authoritative', 'friendly'];
    expect(tones).toHaveLength(3);
  });

  it('is assignable from string literals', () => {
    const a: AudioTone = 'conversational';
    const b: AudioTone = 'authoritative';
    const c: AudioTone = 'friendly';
    expect([a, b, c]).toEqual(['conversational', 'authoritative', 'friendly']);
  });
});

// ---- RadioScript ----

describe('RadioScript', () => {
  it('constructs a valid RadioScript object', () => {
    const script: RadioScript = {
      script: 'Welcome to the open house at 123 Main St...',
      wordCount: 150,
      estimatedDuration: 60,
      notes: 'Upbeat intro, slow down for address',
      voiceStyle: 'warm and inviting',
      musicSuggestion: 'light acoustic background',
    };
    expect(script.script).toBeDefined();
    expect(script.wordCount).toBe(150);
    expect(script.estimatedDuration).toBe(60);
    expect(script.notes).toBe('Upbeat intro, slow down for address');
    expect(script.voiceStyle).toBe('warm and inviting');
    expect(script.musicSuggestion).toBe('light acoustic background');
  });

  it('allows optional fields to be undefined', () => {
    const script: RadioScript = {
      script: 'Short ad script',
      wordCount: 30,
      estimatedDuration: 15,
    };
    expect(script.notes).toBeUndefined();
    expect(script.voiceStyle).toBeUndefined();
    expect(script.musicSuggestion).toBeUndefined();
  });
});

// ---- RadioAdsContent ----

describe('RadioAdsContent', () => {
  it('constructs a valid RadioAdsContent with nested time slots and tones', () => {
    const content: RadioAdsContent = {
      '30s': {
        conversational: {
          script: 'Quick 30-second conversational ad',
          wordCount: 75,
          estimatedDuration: 30,
        },
        authoritative: {
          script: 'Quick 30-second authoritative ad',
          wordCount: 75,
          estimatedDuration: 30,
        },
        friendly: {
          script: 'Quick 30-second friendly ad',
          wordCount: 75,
          estimatedDuration: 30,
        },
      },
      '60s': {
        conversational: {
          script: 'Full 60-second conversational ad',
          wordCount: 150,
          estimatedDuration: 60,
          notes: 'Include address twice',
          voiceStyle: 'warm',
          musicSuggestion: 'soft piano',
        },
        authoritative: {
          script: 'Full 60-second authoritative ad',
          wordCount: 150,
          estimatedDuration: 60,
        },
        friendly: {
          script: 'Full 60-second friendly ad',
          wordCount: 150,
          estimatedDuration: 60,
        },
      },
    };
    expect(content['30s'].conversational.script).toBeDefined();
    expect(content['60s'].friendly.estimatedDuration).toBe(60);
  });
});

// ---- PlatformId includes 'radioAds' ----

describe('PlatformId', () => {
  it('accepts radioAds as a valid PlatformId', () => {
    const id: PlatformId = 'radioAds';
    expect(id).toBe('radioAds');
  });
});

// ---- PlatformCategory includes 'audio' ----

describe('PlatformCategory', () => {
  it('accepts audio as a valid PlatformCategory', () => {
    const cat: PlatformCategory = 'audio';
    expect(cat).toBe('audio');
  });
});

// ---- CampaignKit.radioAds ----

describe('CampaignKit.radioAds', () => {
  it('allows radioAds as an optional field', () => {
    const kit = {
      radioAds: {
        '30s': {
          conversational: { script: 'Ad', wordCount: 10, estimatedDuration: 30 },
          authoritative: { script: 'Ad', wordCount: 10, estimatedDuration: 30 },
          friendly: { script: 'Ad', wordCount: 10, estimatedDuration: 30 },
        },
      },
    } as Partial<CampaignKit>;
    expect(kit.radioAds).toBeDefined();
  });

  it('allows CampaignKit without radioAds', () => {
    const kit = { id: 'test' } as Partial<CampaignKit>;
    expect(kit.radioAds).toBeUndefined();
  });
});
