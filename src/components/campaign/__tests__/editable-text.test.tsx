import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableText } from '../editable-text';

describe('EditableText', () => {
  test('renders text in view mode by default', () => {
    render(<EditableText value="Hello world" onChange={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  test('shows pencil icon on hover', () => {
    const { container } = render(
      <EditableText value="Hover me" onChange={jest.fn()} onSave={jest.fn()} />
    );
    const pencilIcon = container.querySelector('[data-testid="edit-pencil"]');
    expect(pencilIcon).toBeInTheDocument();
  });

  test('switches to edit mode on click', async () => {
    const user = userEvent.setup();
    render(<EditableText value="Click me" onChange={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByText('Click me'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('shows Save and Cancel buttons in edit mode', async () => {
    const user = userEvent.setup();
    render(<EditableText value="Edit me" onChange={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByText('Edit me'));
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('calls onSave with new value when Save is clicked', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const onChange = jest.fn();
    render(<EditableText value="Original" onChange={onChange} onSave={onSave} />);
    await user.click(screen.getByText('Original'));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Updated text');
    await user.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith('Updated text');
  });

  test('reverts on Cancel', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<EditableText value="Original" onChange={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByText('Original'));
    await user.click(screen.getByText('Cancel'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  test('shows character count when maxLength is provided', async () => {
    const user = userEvent.setup();
    render(
      <EditableText value="Hello" onChange={jest.fn()} onSave={jest.fn()} maxLength={280} />
    );
    await user.click(screen.getByText('Hello'));
    expect(screen.getByText(/5 \/ 280/)).toBeInTheDocument();
  });

  test('handles Escape to cancel', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<EditableText value="Press Escape" onChange={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByText('Press Escape'));
    await user.keyboard('{Escape}');
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Press Escape')).toBeInTheDocument();
  });
});
