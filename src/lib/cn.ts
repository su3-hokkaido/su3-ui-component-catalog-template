import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import { CLASS_PREFIX } from './prefix';

const twMerge = extendTailwindMerge({ prefix: CLASS_PREFIX });

/**
 * Joins class names with clsx and resolves conflicting Tailwind utilities with tailwind-merge,
 * so that a `className` passed by the caller overrides the component's defaults.
 *
 * @example
 * cn('uic:px-4 uic:bg-primary', isActive && 'uic:bg-muted') // 'uic:px-4 uic:bg-muted'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
