import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlatformSelector } from '../platform-selector';

// Mock lucide-react icons so each renders a uniquely identifiable element.
// This lets us assert exactly which icon component was rendered for each platform.
jest.mock('lucide-react', () => {
  const React = require('react');
  const makeIcon = (name: string) => {
    const Icon = React.forwardRef((props: any, ref: any) => (
      <span data-testid={`icon-${name}`} ref={ref} {...props} />
    ));
    Icon.displayName = name;
    return Icon;
  };

  return {
    __esModule: true,
    Instagram: makeIcon('Instagram'),
    Facebook: makeIcon('Facebook'),
    Twitter: makeIcon('Twitter'),
    Search: makeIcon('Search'),
    Layers: makeIcon('Layers'),
    BookOpen: makeIcon('BookOpen'),
    BookMarked: makeIcon('BookMarked'),
    Mail: makeIcon('Mail'),
    Globe: makeIcon('Globe'),
    Building2: makeIcon('Building2'),
    Home: makeIcon('Home'),
    FileText: makeIcon('FileText'),
    Radio: makeIcon('Radio'),
    Check: makeIcon('Check'),
  };
});

describe('PlatformIcon – radioAds case', () => {
  test('Radio Ads card renders the Radio icon, not the Globe fallback', () => {
    render(<PlatformSelector selected={[]} onChange={jest.fn()} />);

    // The Radio icon must be rendered (one for the radioAds platform button)
    const radioIcons = screen.queryAllByTestId('icon-Radio');
    expect(radioIcons.length).toBeGreaterThanOrEqual(1);

    // Globe should appear exactly once — for Zillow, which legitimately uses Globe.
    // If radioAds fell through to the default case, this count would be 2.
    const globeIcons = screen.queryAllByTestId('icon-Globe');
    expect(globeIcons).toHaveLength(1);
  });
});
