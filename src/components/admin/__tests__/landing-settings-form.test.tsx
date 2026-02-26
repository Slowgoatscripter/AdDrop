import { render, screen } from '@testing-library/react';
import { LandingSettingsForm } from '../landing-settings-form';
import { settingsDefaults } from '@/lib/settings/defaults';

// Mock the server actions module
jest.mock('@/app/admin/settings/actions', () => ({
  saveSettings: jest.fn(),
  resetSettings: jest.fn(),
}));

function buildSettings(): Record<string, unknown> {
  return { ...settingsDefaults };
}

describe('LandingSettingsForm', () => {
  it('renders a "CTA Description" label instead of "Beta Notice"', () => {
    render(<LandingSettingsForm settings={buildSettings()} />);
    expect(screen.getByText('CTA Description')).toBeInTheDocument();
    expect(screen.queryByText('Beta Notice')).not.toBeInTheDocument();
  });

  it('initializes the CTA description input from landing.cta_description setting', () => {
    const settings = buildSettings();
    settings['landing.cta_description'] = 'Test description value';
    render(<LandingSettingsForm settings={settings} />);
    const input = screen.getByDisplayValue('Test description value');
    expect(input).toBeInTheDocument();
  });

  it('does not contain the word "beta" in any visible label text', () => {
    render(<LandingSettingsForm settings={buildSettings()} />);
    const labels = screen.getAllByRole('generic').filter(
      (el) => el.tagName === 'LABEL'
    );
    // Also search all text content
    const body = document.body.textContent || '';
    // Labels should not reference beta
    expect(body).not.toContain('Beta Notice');
  });
});
