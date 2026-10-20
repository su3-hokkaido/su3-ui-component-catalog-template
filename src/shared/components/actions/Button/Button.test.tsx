import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders a button with its label as the accessible name', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('defaults to type="button" so it does not submit forms', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('allows overriding the type', () => {
    render(<Button type="submit">Save</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Save
      </Button>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('lets className override conflicting variant utilities', () => {
    render(
      <Button size="md" className="uic:px-8">
        Save
      </Button>,
    );

    const { classList } = screen.getByRole('button');
    expect(classList).toContain('uic:px-8');
    expect(classList).not.toContain('uic:px-4');
  });

  it('forwards the ref to the native button', () => {
    let element: HTMLButtonElement | null = null;
    render(
      <Button
        ref={(node) => {
          element = node;
        }}
      >
        Save
      </Button>,
    );

    expect(element).toBe(screen.getByRole('button'));
  });
});
