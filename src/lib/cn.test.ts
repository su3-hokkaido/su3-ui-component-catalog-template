import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins truthy class names and drops falsy ones', () => {
    expect(cn('uic:px-4', false, undefined, null, 'uic:py-2')).toBe('uic:px-4 uic:py-2');
  });

  it('lets a later prefixed utility override a conflicting one', () => {
    expect(cn('uic:px-4 uic:py-2', 'uic:px-6')).toBe('uic:py-2 uic:px-6');
  });

  it('resolves conflicts between custom color tokens', () => {
    expect(cn('uic:bg-primary', 'uic:bg-muted')).toBe('uic:bg-muted');
    expect(cn('uic:text-primary-foreground', 'uic:text-foreground')).toBe('uic:text-foreground');
    expect(cn('uic:border-transparent', 'uic:border-border')).toBe('uic:border-border');
  });

  it('keeps border width, style and color apart', () => {
    expect(cn('uic:border uic:border-solid uic:border-transparent', 'uic:border-border')).toBe(
      'uic:border uic:border-solid uic:border-border',
    );
  });

  it('keeps font size and text color apart', () => {
    expect(cn('uic:text-sm uic:text-foreground', 'uic:text-lg')).toBe(
      'uic:text-foreground uic:text-lg',
    );
  });

  it('resolves conflicts inside variants', () => {
    expect(cn('uic:dark:bg-primary', 'uic:dark:bg-muted')).toBe('uic:dark:bg-muted');
  });

  it('does not treat unprefixed classes as Tailwind utilities', () => {
    expect(cn('uic:px-4', 'px-6')).toBe('uic:px-4 px-6');
  });
});
