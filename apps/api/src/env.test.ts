import { describe, expect, it } from 'vitest';

import { loadEnv } from './env';

const base = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'pk' };

describe('loadEnv', () => {
  it('permite el modelo de ensayo fuera de prod (tests y demo)', () => {
    for (const APP_ENV of ['local', 'preview', 'demo']) {
      expect(loadEnv({ ...base, APP_ENV, AI_LLM_PROVIDER: 'fake' }).AI_LLM_PROVIDER).toBe('fake');
    }
  });

  it('no arranca en prod con el modelo de ensayo', () => {
    expect(() => loadEnv({ ...base, APP_ENV: 'prod', AI_LLM_PROVIDER: 'fake' })).toThrow(
      /no se permite en prod/,
    );
  });
});
