// Saca las capturas de la demo (docs/demo/capturas) con el diseño actual, sin contraseñas: cada
// persona entra con una sesión de enlace mágico generada con la clave de servicio (no envía correo).
//
//   pnpm demo:reset                       (primero: datos limpios y fechas de esta semana)
//   pnpm demo:screens                     (contra https://crecer-demo.vercel.app)
//   pnpm demo:screens http://localhost:8082 [carpeta]   (otra web con las variables de la demo)
//
// Usa el Chrome instalado en la compu (playwright-core no descarga navegadores). Escribe en la demo:
// arma el plan de la semana de Laura si falta y completa el chequeo de sueño de Tomi para mostrar el
// resultado. `pnpm demo:reset` lo deja todo como estaba.

import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { chromium, type Browser, type Page } from 'playwright-core';

import { demoId, env, must, service } from './lib.ts';
import { email } from './scenario.ts';

if (env.APP_ENV !== 'demo') {
  console.error('demo:screens corre solo contra el proyecto demo (APP_ENV=demo).');
  process.exit(1);
}

const BASE = (process.argv[2] ?? 'https://crecer-demo.vercel.app').replace(/\/$/, '');
const OUT = process.argv[3] ?? 'docs/demo/capturas';
const REF = new URL(env.SUPABASE_URL).hostname.split('.')[0];

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 };
const MOBILE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

type Who = 'laura' | 'paula' | null;

/** Sesión de Supabase de una persona de la demo, como la guarda la app en localStorage. */
async function sessionFor(who: string): Promise<string> {
  const link = await service.auth.admin.generateLink({ type: 'magiclink', email: email(who) });
  if (link.error) throw new Error(`Enlace para ${who}: ${link.error.message}`);
  const anon = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });
  const verified = await anon.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: 'magiclink',
  });
  if (verified.error || !verified.data.session) {
    throw new Error(`Sesión de ${who}: ${verified.error?.message ?? 'sin sesión'}`);
  }
  return JSON.stringify(verified.data.session);
}

async function openAs(browser: Browser, who: Who, device: typeof DESKTOP | typeof MOBILE) {
  const context = await browser.newContext({ ...device, locale: 'es-AR', colorScheme: 'light' });
  if (who) {
    const key = `sb-${REF}-auth-token`;
    const value = await sessionFor(who);
    await context.addInitScript(
      ([k, v]) => {
        window.localStorage.setItem(k, v);
        // Sin sonidos ni vibraciones al sacar fotos.
        window.localStorage.setItem('crecer.feedback', '{"sound":false,"vibration":false}');
      },
      [key, value] as const,
    );
  }
  const page = await context.newPage();
  // La web de desarrollo tarda en el primer armado del paquete.
  page.setDefaultNavigationTimeout(180_000);
  page.setDefaultTimeout(60_000);
  return page;
}

/** Espera a que la pantalla termine de cargar (sin esqueletos) y deja pasar las animaciones. */
async function settle(page: Page) {
  await page.waitForLoadState('load').catch(() => undefined);
  // Hasta que no quede ningún esqueleto de carga (y la app haya dibujado algo).
  await page
    .waitForFunction(
      () =>
        document.querySelectorAll('[data-testid="skeleton"]').length === 0 &&
        (document.body.innerText ?? '').trim().length > 40,
      undefined,
      { timeout: 60_000, polling: 500 },
    )
    .catch(() => console.warn('  (sigue cargando: se captura igual)'));
  await page.waitForTimeout(2500);
}

async function shot(page: Page, folder: string, name: string, path?: string) {
  if (path) await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  const dir = join(OUT, folder);
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `${name}.jpg`), quality: 85, type: 'jpeg' });
  console.log(`✔ ${folder}/${name}`);
}

/**
 * Contesta el chequeo abierto con la última opción (la que más pide trabajar) para que el resultado
 * muestre "por dónde empezar" y una actividad para hoy; "Listo" en los números.
 */
async function answerCheck(page: Page) {
  for (let i = 0; i < 30; i += 1) {
    await page.waitForTimeout(1500);
    const result = page.getByRole('button', { name: 'Ver mi resultado' });
    if (await result.isVisible().catch(() => false)) {
      await result.click();
      return;
    }
    // Varias respuestas: se marca la última y se confirma.
    const box = page.getByRole('checkbox').last();
    if (await box.isVisible().catch(() => false)) {
      await box.click();
      await page.waitForTimeout(500);
    }
    const listo = page.getByRole('button', { name: 'Listo' });
    if (await listo.isVisible().catch(() => false)) {
      await listo.click();
      continue;
    }
    const option = page.getByRole('radio').last();
    if (await option.isVisible().catch(() => false)) await option.click();
  }
  await page.screenshot({ path: join(OUT, 'movil', 'error-chequeo.jpg'), type: 'jpeg' });
  throw new Error('El chequeo no llegó al resultado (ver movil/error-chequeo.jpg)');
}

const tomi = demoId('member:tomi');
const sofi = demoId('member:sofi');
const conversation = demoId('conversation:tomi');
const lastAttempt = must(
  await service
    .from('assessment_attempts')
    .select('id')
    .eq('member_id', tomi)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single(),
  'último intento de Tomi',
).id;
const sofiCase = must(
  await service
    .from('care_assignments')
    .select('id')
    .eq('family_id', demoId('family:pereyra'))
    .eq(
      'professional_id',
      must(
        await service
          .from('professional_profiles')
          .select('user_id')
          .eq('display_name', 'Lic. Paula Ríos')
          .single(),
        'perfil de Paula',
      ).user_id,
    )
    .eq('status', 'active')
    .single(),
  'caso de Sofi',
).id;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  // Sin cuenta.
  const pub = await openAs(browser, null, DESKTOP);
  await shot(pub, 'publico', '01-inicio', '/');
  await shot(pub, 'publico', '02-etapa-3-5', '/etapas/etapa-3-5');
  await shot(pub, 'publico', '03-ficha-c', '/situaciones/ficha-c-reaccion-al-apagar');
  await shot(pub, 'publico', '04-actividades', '/actividades');
  await shot(pub, 'publico', '06-directorio', '/directorio');
  await shot(pub, 'publico', '07-registrarse', '/registrarse');
  await shot(pub, 'publico', '08-ingresar', '/ingresar');

  // Laura, en la compu.
  const laura = await openAs(browser, 'laura', DESKTOP);
  await laura.goto(`${BASE}/hoy`, { waitUntil: 'domcontentloaded' });
  await settle(laura);
  const armar = laura.getByRole('button', { name: '¡Armá mi semana!' });
  if (await armar.isVisible().catch(() => false)) {
    await armar.click();
    await laura.waitForTimeout(4000);
  }
  await shot(laura, 'laura', '01-hoy');
  await shot(laura, 'laura', '02-plan', '/plan');
  await shot(laura, 'laura', '03-familia', '/familia');
  await shot(laura, 'laura', '04-evaluaciones', '/evaluaciones');
  await shot(laura, 'laura', '05-resultado-tomi', `/evaluaciones/${lastAttempt}/resultado`);
  await shot(laura, 'laura', '06-historial-tomi', `/evaluaciones/historial/${tomi}`);
  await shot(laura, 'laura', '07-asistente', '/asistente');
  await shot(laura, 'laura', '08-conversacion', `/asistente/${conversation}`);
  await shot(laura, 'laura', '09-profesionales', '/profesionales');
  await shot(laura, 'laura', '11-objetivos', '/objetivos');
  await shot(laura, 'laura', '12-pausa', '/pausa');
  await shot(laura, 'laura', '13-perfil', '/perfil');

  // Laura, en el celular: Hoy, el chequeo por tema (pregunta y resultado) y la pausa.
  const movil = await openAs(browser, 'laura', MOBILE);
  await shot(movil, 'movil', '01-hoy', '/hoy');
  await movil.goto(`${BASE}/chequeo/${tomi}?tema=tema-sueno`, { waitUntil: 'domcontentloaded' });
  await shot(movil, 'movil', '04-chequeo-pregunta');
  await answerCheck(movil);
  await movil.waitForTimeout(3500);
  await shot(movil, 'movil', '05-chequeo-resultado');
  await shot(movil, 'movil', '06-pausa', '/pausa');
  await shot(movil, 'movil', '02-conversacion', `/asistente/${conversation}`);
  await shot(movil, 'movil', '03-historial-tomi', `/evaluaciones/historial/${tomi}`);

  // Paula, profesional.
  const paula = await openAs(browser, 'paula', DESKTOP);
  await shot(paula, 'paula', '01-casos', '/profesional');
  await shot(paula, 'paula', '02-caso-sofi', `/profesional/casos/${sofiCase}/${sofi}`);
} finally {
  await browser.close();
}
console.log(
  `Listo: capturas en ${OUT}. La administración pide verificación en dos pasos y no se recaptura.`,
);
