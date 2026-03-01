import React from 'react';
import { render } from '@testing-library/react';
import { PlatformBar } from '../platform-bar';

describe('PlatformBar', () => {
  test('section background uses bg-background so gradient overlays blend seamlessly', () => {
    const { container } = render(<PlatformBar />);
    const section = container.querySelector('section');

    // The section must use bg-background to match the gradient overlays
    // (which use from-background). Using bg-teal-muted/20 creates visible
    // rectangular patches at the marquee edges.
    expect(section?.className).toContain('bg-background');
    expect(section?.className).not.toContain('bg-teal-muted');
  });
});
