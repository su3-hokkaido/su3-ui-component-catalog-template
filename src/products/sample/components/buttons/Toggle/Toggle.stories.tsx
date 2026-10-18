import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Toggle } from './Toggle';

const meta = {
  title: 'Buttons/Toggle',
  component: Toggle,
  args: {
    children: 'Bold',
    onPressedChange: fn(),
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Required: clean URLs (`/{productId}/c/buttons/toggle`) point at this story. */
export const Default: Story = {};

export const Pressed: Story = {
  args: { defaultPressed: true },
};

export const Controlled: Story = {
  render: function ControlledToggle(args) {
    const [pressed, setPressed] = useState(false);
    return (
      <div className="uic:flex uic:items-center uic:gap-4 uic:font-sans uic:text-sm">
        <Toggle
          {...args}
          pressed={pressed}
          onPressedChange={(next) => {
            setPressed(next);
            args.onPressedChange?.(next);
          }}
        />
        <span>{pressed ? 'On' : 'Off'}</span>
      </div>
    );
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
