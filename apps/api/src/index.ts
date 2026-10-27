// Entrada para Vercel (Hono zero-config: exportación por defecto de la app).
import { createApp, createDefaultDeps } from './app';
import { loadEnv } from './env';

const env = loadEnv();

export default createApp(env, createDefaultDeps(env));
