// Dev sanity check to ensure React resolves correctly
import * as ReactNS from 'react';

if (!ReactNS || typeof ReactNS.useState !== 'function' || typeof ReactNS.useEffect !== 'function') {
  // eslint-disable-next-line no-console
  console.error('[React sanity check] Invalid React import:', ReactNS);
  throw new Error('React is not resolving correctly (hooks missing). Check Vite aliases and duplicate React copies.');
}
