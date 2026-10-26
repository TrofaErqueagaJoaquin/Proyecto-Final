// Servidor local de desarrollo (pnpm dev:api).
import { serve } from '@hono/node-server';

import { createApp } from './app';
import { loadEnv } from './env';
import { log } from './lib/logger';

const env = loadEnv();

serve({ fetch: createApp(env).fetch, port: env.PORT }, (info) => {
  log('info', 'api_started', { port: info.port, env: env.APP_ENV });
});
