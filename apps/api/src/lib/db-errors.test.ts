import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { DomainErrorCodeSchema } from '@crecer/shared';
import { describe, expect, it } from 'vitest';

import { toHttpError } from './db-errors';

describe('toHttpError', () => {
  it('traduce errores de dominio a estado y código estables', () => {
    const error = toHttpError({ code: 'P0001', message: 'INVITATION_EXPIRED' });
    expect(error.status).toBe(410);
    expect(error.message).toBe('La invitación venció. Pedí una nueva.');
  });

  it('traduce violaciones de RLS a 403', () => {
    expect(
      toHttpError({ code: '42501', message: 'new row violates row-level security' }).status,
    ).toBe(403);
  });

  it('nunca reenvía mensajes internos de la base', () => {
    const error = toHttpError({ code: 'XX000', message: 'relation "secreta" does not exist' });
    expect(error.status).toBe(500);
    expect(error.message).not.toContain('secreta');
  });

  it('un P0001 con un mensaje desconocido no se trata como error de dominio', () => {
    expect(toHttpError({ code: 'P0001', message: 'algo raro' }).status).toBe(500);
  });
});

describe('catálogo de errores de dominio', () => {
  it('incluye todos los códigos que lanzan las migraciones', async () => {
    const dir = join(import.meta.dirname, '..', '..', '..', '..', 'supabase', 'migrations');
    const files = await readdir(dir);
    const sql = (await Promise.all(files.map((f) => readFile(join(dir, f), 'utf8')))).join('\n');
    const raised = new Set([...sql.matchAll(/raise_domain_error\('([A-Z_]+)'/g)].map((m) => m[1]));
    raised.add('AUDIT_LOG_IMMUTABLE'); // se lanza con RAISE directo en el trigger de auditoría

    expect(raised.size).toBeGreaterThan(5);
    for (const code of raised) {
      expect(DomainErrorCodeSchema.options, `falta ${String(code)} en packages/shared`).toContain(
        code,
      );
    }
  });
});
