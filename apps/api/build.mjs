// Empaqueta la API en dist/ incluyendo los paquetes del monorepo (@crecer/*), que se publican
// como TypeScript fuente. Las dependencias de npm quedan externas y se instalan en el deploy.
import { build } from 'esbuild';

import pkg from './package.json' with { type: 'json' };

await build({
  entryPoints: ['src/index.ts', 'src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  outdir: 'dist',
  sourcemap: true,
  external: Object.keys(pkg.dependencies).filter((name) => !name.startsWith('@crecer/')),
  logLevel: 'info',
});
