import { useState, type MouseEvent } from 'react';
import { Button, type ButtonProps } from '../../../../../shared';

/** Props for {@link Toggle}. */
export interface ToggleProps extends Omit<ButtonProps, 'variant' | 'aria-pressed'> {
  /** Pressed state when controlled. Leave undefined to let the Toggle manage its own state. */
  pressed?: boolean;
  /** Initial pressed state when uncontrolled. */
  defaultPressed?: boolean;
  /** Called with the next pressed state whenever the user toggles it. */
  onPressedChange?: (pressed: boolean) => void;
}

/**
 * A two-state button that exposes its state through `aria-pressed`.
 *
 * Works controlled (`pressed` + `onPressedChange`) or uncontrolled (`defaultPressed`). Calling
 * `event.preventDefault()` in `onClick` cancels the toggle.
 */
export function Toggle({
  pressed,
  defaultPressed = false,
  onPressedChange,
  onClick,
  ...props
}: ToggleProps) {
  const [uncontrolledPressed, setUncontrolledPressed] = useState(defaultPressed);
  const isControlled = pressed !== undefined;
  const isPressed = isControlled ? pressed : uncontrolledPressed;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }
    const next = !isPressed;
    if (!isControlled) {
      setUncontrolledPressed(next);
    }
    onPressedChange?.(next);
  };

  return (
    <Button
      {...props}
      variant={isPressed ? 'primary' : 'secondary'}
      aria-pressed={isPressed}
      onClick={handleClick}
    />
  );
}
