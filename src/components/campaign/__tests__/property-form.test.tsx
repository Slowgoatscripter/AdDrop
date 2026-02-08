import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PropertyForm } from '../property-form';

describe('PropertyForm', () => {
  const mockSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all required fields', () => {
    render(<PropertyForm onSubmit={mockSubmit} />);

    expect(screen.getByPlaceholderText('123 Main St')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Missoula')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('MT')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('59801')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('450,000')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('3')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('2')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('1,800')).toBeInTheDocument();
  });

  test('pre-fills form with initial data', () => {
    render(
      <PropertyForm
        initialData={{
          address: { street: '456 Oak Ave', city: 'Helena', state: 'MT', zip: '59601' },
          price: 325000,
          beds: 4,
          baths: 3,
          sqft: 2200,
        }}
        onSubmit={mockSubmit}
      />
    );

    expect(screen.getByDisplayValue('456 Oak Ave')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Helena')).toBeInTheDocument();
    expect(screen.getByDisplayValue('325000')).toBeInTheDocument();
  });

  test('calls onSubmit with listing data', async () => {
    const user = userEvent.setup();
    render(<PropertyForm onSubmit={mockSubmit} />);

    await user.type(screen.getByPlaceholderText('123 Main St'), '789 Elm St');
    await user.type(screen.getByPlaceholderText('Missoula'), 'Bozeman');
    await user.clear(screen.getByPlaceholderText('MT'));
    await user.type(screen.getByPlaceholderText('MT'), 'MT');
    await user.type(screen.getByPlaceholderText('59801'), '59715');
    await user.type(screen.getByPlaceholderText('450,000'), '500000');
    await user.type(screen.getByPlaceholderText('3'), '3');
    await user.type(screen.getByPlaceholderText('2'), '2');
    await user.type(screen.getByPlaceholderText('1,800'), '2000');

    await user.click(screen.getByRole('button', { name: /generate campaign/i }));

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const submitted = mockSubmit.mock.calls[0][0];
    expect(submitted.address.street).toBe('789 Elm St');
    expect(submitted.address.city).toBe('Bozeman');
    expect(submitted.price).toBe(500000);
    expect(submitted.beds).toBe(3);
  });

  test('shows loading state', () => {
    render(<PropertyForm onSubmit={mockSubmit} loading />);

    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
  });
});
