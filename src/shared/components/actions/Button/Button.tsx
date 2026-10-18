import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithRef } from 'react';
import { cn } from '../../../../lib/cn';

/** Class variants for {@link Button}. Exported so other components can share the styling. */
export const buttonVariants = cva(
  [
    'uic:inline-flex uic:cursor-pointer uic:items-center uic:justify-center uic:gap-2',
    'uic:rounded-md uic:border uic:border-solid uic:border-transparent',
    'uic:font-sans uic:font-medium uic:whitespace-nowrap uic:transition-colors',
    'uic:focus-visible:outline-2 uic:focus-visible:outline-offset-2 uic:focus-visible:outline-ring',
    'uic:disabled:cursor-not-allowed uic:disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'uic:bg-primary uic:text-primary-foreground uic:enabled:hover:bg-primary-hover',
        secondary:
          'uic:border-border uic:bg-surface uic:text-foreground uic:enabled:hover:bg-muted',
        ghost: 'uic:bg-transparent uic:text-foreground uic:enabled:hover:bg-muted',
      },
      size: {
        sm: 'uic:h-8 uic:px-3 uic:text-sm',
        md: 'uic:h-10 uic:px-4 uic:text-sm',
        lg: 'uic:h-12 uic:px-6 uic:text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

/** Props for {@link Button}. Accepts every native `<button>` attribute. */
export interface ButtonProps extends ComponentPropsWithRef<'button'>, ButtonVariantProps {
  /**
   * Visual emphasis: `primary` for the main action, `secondary` for alternatives, `ghost` for
   * low-emphasis actions.
   * @default 'primary'
   */
  variant?: ButtonVariantProps['variant'];
  /**
   * Height, horizontal padding and font size.
   * @default 'md'
   */
  size?: ButtonVariantProps['size'];
}

/**
 * A native button with the catalog's visual variants.
 *
 * `type` defaults to `"button"` so that a Button placed inside a form never submits it by accident.
 */
export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
