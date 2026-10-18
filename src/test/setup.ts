import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest does not enable globals here, so React Testing Library cannot register its automatic
// cleanup; unmount rendered trees explicitly to keep tests isolated.
afterEach(() => {
  cleanup();
});
