// Valida content/ y lo sincroniza con la base (ADR-014). Idempotente: se puede correr siempre.
//
//   pnpm content:check   → solo valida (CI)
//   pnpm content:sync    → valida y carga en el proyecto de apps/api/.env (clave secreta)
//
// Lo que ya no está en content/ se archiva (no se borra: puede tener favoritos o registros).

import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import {
  ActivityFileSchema,
  ContentFrontmatterSchema,
  SafeMarkdownSchema,
  SourceFileSchema,
  type ActivityFile,
  type ContentFrontmatter,
  type Database,
  type SourceFile,
} from '@crecer/shared';
import { createClient } from '@supabase/supabase-js';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const ROOT = join(import.meta.dirname, '..', 'content');
// Mismas categorías que inserta la migración 20261027000400_content_activities.sql.
const CATEGORIES = new Set([
  'movimiento',
  'creatividad',
  'lenguaje',
  'calma',
  'juego_social',
  'exploracion',
  'autonomia',
  'vinculo',
]);

interface LibraryItem {
  file: string;
  meta: ContentFrontmatter;
  body: string;
}

const errors: string[] = [];
function fail(where: string, message: string) {
  errors.push(`${where}: ${message}`);
}

function parseWith<T>(schema: z.ZodType<T>, value: unknown, where: string): T | null {
  const result = schema.safeParse(value);
  if (!result.success) {
    fail(where, z.prettifyError(result.error).replaceAll('\n', ' | '));
    return null;
  }
  return result.data;
}

function splitFrontmatter(raw: string, file: string): { data: unknown; body: string } | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match?.[1] || match[2] === undefined) {
    fail(file, 'falta el bloque de frontmatter (--- … ---)');
    return null;
  }
  return { data: parseYaml(match[1]) as unknown, body: match[2].trim() };
}

async function loadContent() {
  const sources = (parseWith(
    z.array(SourceFileSchema),
    parseYaml(await readFile(join(ROOT, 'sources.yaml'), 'utf8')),
    'sources.yaml',
  ) ?? []) satisfies SourceFile[];
  const sourceSlugs = new Set(sources.map((s) => s.slug));
  if (sourceSlugs.size !== sources.length) fail('sources.yaml', 'hay slugs repetidos');

  const library: LibraryItem[] = [];
  for (const file of (await readdir(join(ROOT, 'library')))
    .filter((f) => f.endsWith('.md'))
    .sort()) {
    const where = `library/${file}`;
    const split = splitFrontmatter(await readFile(join(ROOT, 'library', file), 'utf8'), where);
    if (!split) continue;
    const meta = parseWith(ContentFrontmatterSchema, split.data, where);
    const body = parseWith(SafeMarkdownSchema, split.body, where);
    if (!meta || body === null) continue;
    if (basename(file, '.md') !== meta.slug)
      fail(where, `el archivo debe llamarse ${meta.slug}.md`);
    for (const ref of meta.sources) {
      if (!sourceSlugs.has(ref.slug)) fail(where, `fuente desconocida "${ref.slug}"`);
    }
    library.push({ file, meta, body });
  }

  const activities = (parseWith(
    z.array(ActivityFileSchema),
    parseYaml(await readFile(join(ROOT, 'activities.yaml'), 'utf8')),
    'activities.yaml',
  ) ?? []) satisfies ActivityFile[];
  const activitySlugs = new Set<string>();
  for (const activity of activities) {
    const where = `activities.yaml#${activity.slug}`;
    if (activitySlugs.has(activity.slug)) fail(where, 'slug repetido');
    activitySlugs.add(activity.slug);
    for (const code of activity.categories) {
      if (!CATEGORIES.has(code)) fail(where, `categoría desconocida "${code}"`);
    }
    for (const ref of activity.sources) {
      if (!sourceSlugs.has(ref.slug)) fail(where, `fuente desconocida "${ref.slug}"`);
    }
  }

  return { sources, library, activities };
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error || result.data === null) {
    throw new Error(`${what}: ${result.error?.message ?? 'sin datos'}`);
  }
  return result.data;
}

async function sync(content: Awaited<ReturnType<typeof loadContent>>) {
  const env = z
    .object({
      APP_ENV: z.string().default('local'),
      SUPABASE_URL: z.url(),
      SUPABASE_SECRET_KEY: z.string().min(1),
    })
    .parse(process.env);
  if (env.APP_ENV === 'prod' && !process.argv.includes('--allow-prod')) {
    throw new Error(
      'En prod, la base es la fuente de verdad (ADR-014). Usá --allow-prod si es a propósito.',
    );
  }
  const db = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();

  // Fuentes
  const sourceRows = must(
    await db
      .from('sources')
      .upsert(
        content.sources.map((s) => ({
          slug: s.slug,
          citation: s.citation,
          study_type: s.study_type,
          year: s.year ?? null,
          doi: s.doi ?? null,
          url: s.url ?? null,
          confidence: s.confidence,
          verification_status: s.verification_status,
          notes: s.notes ?? null,
        })),
        { onConflict: 'slug' },
      )
      .select('id, slug'),
    'sources',
  );
  const sourceId = new Map(sourceRows.map((r) => [r.slug, r.id]));

  // Biblioteca
  const existingContent = must(
    await db.from('content_items').select('id, slug, body_md, published_at'),
    'content_items (lectura)',
  );
  const existingBySlug = new Map(existingContent.map((c) => [c.slug, c]));
  for (const { meta, body } of content.library) {
    const previous = existingBySlug.get(meta.slug);
    const row = must(
      await db
        .from('content_items')
        .upsert(
          {
            slug: meta.slug,
            type: meta.type,
            title: meta.title,
            summary: meta.summary,
            body_md: body,
            age_min_months: meta.age_min_months ?? null,
            age_max_months: meta.age_max_months ?? null,
            evidence_label: meta.evidence_label,
            sort_order: meta.sort_order,
            status: 'published',
            published_at: previous?.published_at ?? now,
          },
          { onConflict: 'slug' },
        )
        .select('id')
        .single(),
      `content_items ${meta.slug}`,
    );
    if (previous?.body_md !== body) {
      const revisions = must(
        await db.from('content_revisions').select('revision').eq('content_id', row.id),
        'content_revisions (lectura)',
      );
      const next = Math.max(0, ...revisions.map((r) => r.revision)) + 1;
      must(
        await db
          .from('content_revisions')
          .insert({ content_id: row.id, revision: next, body_md: body })
          .select('revision'),
        `content_revisions ${meta.slug}`,
      );
    }
    must(
      await db.from('content_sources').delete().eq('content_id', row.id).select('content_id'),
      'content_sources (borrado)',
    );
    if (meta.sources.length > 0) {
      must(
        await db
          .from('content_sources')
          .insert(
            meta.sources.map((ref) => ({
              content_id: row.id,
              source_id: sourceId.get(ref.slug) ?? '',
              locator: ref.locator ?? null,
            })),
          )
          .select('content_id'),
        `content_sources ${meta.slug}`,
      );
    }
  }
  const librarySlugs = new Set(content.library.map((c) => c.meta.slug));
  const toArchive = existingContent.filter((c) => !librarySlugs.has(c.slug)).map((c) => c.slug);
  if (toArchive.length > 0) {
    must(
      await db
        .from('content_items')
        .update({ status: 'archived' })
        .in('slug', toArchive)
        .select('id'),
      'content_items (archivo)',
    );
  }

  // Actividades
  const existingActivities = must(
    await db.from('activities').select('slug, published_at'),
    'activities (lectura)',
  );
  const publishedAt = new Map(existingActivities.map((a) => [a.slug, a.published_at]));
  for (const activity of content.activities) {
    const row = must(
      await db
        .from('activities')
        .upsert(
          {
            slug: activity.slug,
            title: activity.title,
            summary: activity.summary,
            objective: activity.objective,
            age_min_months: activity.age_min_months,
            age_max_months: activity.age_max_months,
            duration_min: activity.duration_min,
            participants_min: activity.participants_min,
            participants_max: activity.participants_max ?? null,
            cost_level: activity.cost_level,
            space: activity.space,
            materials: activity.materials,
            variants: activity.variants,
            accessibility_notes: activity.accessibility_notes,
            safety_notes: activity.safety_notes ?? null,
            evidence_label: activity.evidence_label,
            sort_order: 0,
            status: 'published',
            published_at: publishedAt.get(activity.slug) ?? now,
          },
          { onConflict: 'slug' },
        )
        .select('id')
        .single(),
      `activities ${activity.slug}`,
    );
    for (const table of [
      'activity_steps',
      'activity_category_links',
      'activity_sources',
    ] as const) {
      must(
        await db.from(table).delete().eq('activity_id', row.id).select('activity_id'),
        `${table} (borrado)`,
      );
    }
    must(
      await db
        .from('activity_steps')
        .insert(activity.steps.map((body, i) => ({ activity_id: row.id, position: i + 1, body })))
        .select('activity_id'),
      `activity_steps ${activity.slug}`,
    );
    must(
      await db
        .from('activity_category_links')
        .insert(activity.categories.map((code) => ({ activity_id: row.id, category_code: code })))
        .select('activity_id'),
      `activity_category_links ${activity.slug}`,
    );
    if (activity.sources.length > 0) {
      must(
        await db
          .from('activity_sources')
          .insert(
            activity.sources.map((ref) => ({
              activity_id: row.id,
              source_id: sourceId.get(ref.slug) ?? '',
              locator: ref.locator ?? null,
            })),
          )
          .select('activity_id'),
        `activity_sources ${activity.slug}`,
      );
    }
  }
  const activitySlugs = new Set(content.activities.map((a) => a.slug));
  const activitiesToArchive = existingActivities
    .filter((a) => !activitySlugs.has(a.slug))
    .map((a) => a.slug);
  if (activitiesToArchive.length > 0) {
    must(
      await db
        .from('activities')
        .update({ status: 'archived' })
        .in('slug', activitiesToArchive)
        .select('id'),
      'activities (archivo)',
    );
  }

  return { archived: toArchive.length + activitiesToArchive.length };
}

const content = await loadContent();
if (errors.length > 0) {
  console.error(`✖ content/ tiene ${String(errors.length)} error(es):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(
  `✔ content/ válido: ${String(content.sources.length)} fuentes, ${String(content.library.length)} contenidos, ${String(content.activities.length)} actividades`,
);

if (!process.argv.includes('--check')) {
  const result = await sync(content);
  console.log(`✔ Sincronizado con la base (${String(result.archived)} elemento(s) archivado(s)).`);
}
