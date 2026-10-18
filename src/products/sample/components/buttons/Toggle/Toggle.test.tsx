import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  describe('uncontrolled', () => {
    it('starts unpressed by default', () => {
      render(<Toggle>Bold</Toggle>);

      expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('starts pressed when defaultPressed is set', () => {
      render(<Toggle defaultPressed>Bold</Toggle>);

      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('toggles on each click and reports the next state', async () => {
      const onPressedChange = vi.fn();
      render(<Toggle onPressedChange={onPressedChange}>Bold</Toggle>);
      const toggle = screen.getByRole('button');

      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-pressed', 'true');

      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-pressed', 'false');

      expect(onPressedChange.mock.calls).toEqual([[true], [false]]);
    });

    it('toggles with the keyboard', async () => {
      render(<Toggle>Bold</Toggle>);
      const toggle = screen.getByRole('button');

      toggle.focus();
      await userEvent.keyboard('{Enter}');
      expect(toggle).toHaveAttribute('aria-pressed', 'true');

      await userEvent.keyboard(' ');
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('controlled', () => {
    it('reflects the pressed prop and does not change on its own', async () => {
      const onPressedChange = vi.fn();
      render(
        <Toggle pressed={false} onPressedChange={onPressedChange}>
          Bold
        </Toggle>,
      );
      const toggle = screen.getByRole('button');

      await userEvent.click(toggle);

      expect(onPressedChange).toHaveBeenCalledWith(true);
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('updates when the pressed prop changes', () => {
      const { rerender } = render(<Toggle pressed={false}>Bold</Toggle>);

      rerender(<Toggle pressed>Bold</Toggle>);

      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('calls onClick and cancels the toggle when the event is prevented', async () => {
    const onPressedChange = vi.fn();
    render(
      <Toggle
        onClick={(event) => {
          event.preventDefault();
        }}
        onPressedChange={onPressedChange}
      >
        Bold
      </Toggle>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    expect(onPressedChange).not.toHaveBeenCalled();
  });

  it('does not toggle when disabled', async () => {
    const onPressedChange = vi.fn();
    render(
      <Toggle disabled onPressedChange={onPressedChange}>
        Bold
      </Toggle>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    expect(onPressedChange).not.toHaveBeenCalled();
  });
});
