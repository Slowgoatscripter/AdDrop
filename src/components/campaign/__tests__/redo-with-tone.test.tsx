import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdCardWrapper } from '../ad-card-wrapper';

describe('AdCardWrapper Redo with Tone', () => {
  test('renders Regenerate button when onRegenerate is provided', () => {
    render(
      <AdCardWrapper
        platform="Test"
        platformIcon={<div />}
        dimensionLabel="Test"
        onRegenerate={jest.fn()}
      >
        <div>Content</div>
      </AdCardWrapper>
    );
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
  });

  test('shows tone selector when Regenerate is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AdCardWrapper
        platform="Test"
        platformIcon={<div />}
        dimensionLabel="Test"
        onRegenerate={jest.fn()}
        toneOptions={['professional', 'casual', 'luxury']}
      >
        <div>Content</div>
      </AdCardWrapper>
    );
    await user.click(screen.getByText('Regenerate'));
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Casual')).toBeInTheDocument();
    expect(screen.getByText('Luxury')).toBeInTheDocument();
  });

  test('calls onRegenerate with selected tone', async () => {
    const user = userEvent.setup();
    const onRegenerate = jest.fn();
    render(
      <AdCardWrapper
        platform="Test"
        platformIcon={<div />}
        dimensionLabel="Test"
        onRegenerate={onRegenerate}
        toneOptions={['professional', 'casual']}
      >
        <div>Content</div>
      </AdCardWrapper>
    );
    await user.click(screen.getByText('Regenerate'));
    await user.click(screen.getByText('Casual'));
    expect(onRegenerate).toHaveBeenCalledWith('casual');
  });
});
