import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacebookCard } from '../facebook-card';

// Facebook uses tone-keyed content: { casual: string, professional: string, luxury: string }

test('renders EditableText for post text when onEditText is provided', async () => {
  const user = userEvent.setup();
  const onEditText = jest.fn();
  render(
    <FacebookCard
      content={{ casual: 'My post' }}
      photos={['/photo1.jpg']}
      onEditText={onEditText}
    />
  );
  const postTexts = screen.getAllByText(/My post/);
  await user.click(postTexts[0]);
  expect(screen.getByRole('textbox')).toBeInTheDocument();
});
