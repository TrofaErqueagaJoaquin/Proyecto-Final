// Entrada para Vercel (Hono zero-config: exportación por defecto de la app).
import { createApp } from './app';
import { loadEnv } from './env';

export default createApp(loadEnv());
