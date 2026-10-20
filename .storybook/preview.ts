import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview, ReactRenderer } from '@storybook/react-vite';

import '../src/styles/index.css';
import './preview.css';

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [
    // Toggles the `.dark` class on <html>, which the `dark` custom variant and the dark token
    // overrides in src/styles/index.css key off.
    withThemeByClassName<ReactRenderer>({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
