// Ingesta de la base de conocimiento (AI_ARCHITECTURE.md §4): contenido y actividades publicados → fragmentos
// por títulos → embeddings (Voyage, si hay VOYAGE_API_KEY) → kb_documents / kb_chunks.
//
//   pnpm kb:ingest            → indexa lo nuevo o cambiado (idempotente: compara un hash)
//   pnpm kb:ingest --force    → vuelve a indexar todo (por ejemplo, al cambiar de modelo)
//
// Sin VOYAGE_API_KEY los fragmentos quedan sin embedding y la búsqueda usa solo texto completo.
// Lo que dejó de estar publicado se retira (no se borra).

import { createHash } from 'node:crypto';

import { chunkMarkdown } from '@crecer/domain';
import { type Database } from '@crecer/shared';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const env = z
  .object({
    APP_ENV: z.string().default('local'),
    SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: z.string().min(1),
    VOYAGE_API_KEY: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
    AI_EMBEDDING_MODEL: z.string().default('voyage-3.5'),
  })
  .parse(process.env);
const force = process.argv.includes('--force');
if (env.APP_ENV === 'prod' && !process.argv.includes('--allow-prod')) {
  throw new Error('En prod la ingesta se dispara desde la administración (kb.manage).');
}

const db = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const embeddingModel = env.VOYAGE_API_KEY ? env.AI_EMBEDDING_MODEL : null;

function must<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/** Ruta de la app donde se lee el documento (la cita lleva ahí). */
function urlPath(type: string, slug: string): string | null {
  switch (type) {
    case 'age_stage':
      return `/etapas/${slug}`;
    case 'situation_card':
      return `/situaciones/${slug}`;
    case 'when_to_consult':
      return '/cuando-consultar';
    default:
      return null;
  }
}

async function embed(texts: string[]): Promise<number[][] | null> {
  if (!env.VOYAGE_API_KEY || texts.length === 0) return null;
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 64) {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_EMBEDDING_MODEL,
        input: texts.slice(i, i + 64),
        input_type: 'document',
        output_dimension: 1024,
      }),
    });
    if (!response.ok) throw new Error(`Voyage respondió ${String(response.status)}`);
    const body = (await response.json()) as { data: { embedding: number[]; index: number }[] };
    out.push(...body.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
  }
  return out;
}

const contentItems = must(
  await db
    .from('content_items')
    .select(
      'id, slug, type, title, summary, body_md, evidence_label, age_min_months, age_max_months',
    )
    .eq('status', 'published'),
);
const activities = must(
  await db
    .from('activities')
    .select(
      'id, slug, title, summary, objective, materials, variants, safety_notes, duration_min, evidence_label, age_min_months, age_max_months, activity_steps (position, body)',
    )
    .eq('status', 'published'),
);

interface Source {
  key: { content_item_id: string } | { activity_id: string };
  sourceId: string;
  slug: string;
  type: string;
  title: string;
  summary: string;
  markdown: string;
  evidenceLabel: string;
  ageMin: number | null;
  ageMax: number | null;
  urlPath: string | null;
}

// Una actividad se indexa como una ficha breve: para qué sirve, qué hace falta y el paso a paso.
function activityMarkdown(a: (typeof activities)[number]): string {
  const steps = [...a.activity_steps].sort((x, y) => x.position - y.position);
  const list = (items: string[]) => items.map((item) => `- ${item}`).join('\n');
  return [
    `## Para qué sirve\n\n${a.objective}\n\nDura unos ${String(a.duration_min)} minutos.`,
    `## Qué hace falta\n\n${a.materials.length > 0 ? list(a.materials) : 'No hacen falta materiales.'}`,
    `## Paso a paso\n\n${steps.map((s) => `${String(s.position)}. ${s.body}`).join('\n')}`,
    a.variants.length > 0 ? `## Variantes\n\n${list(a.variants)}` : '',
    a.safety_notes ? `## Seguridad\n\n${a.safety_notes}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

const sources: Source[] = [
  ...contentItems.map((item) => ({
    key: { content_item_id: item.id },
    sourceId: item.id,
    slug: item.slug,
    type: item.type,
    title: item.title,
    summary: item.summary,
    markdown: item.body_md,
    evidenceLabel: item.evidence_label,
    ageMin: item.age_min_months,
    ageMax: item.age_max_months,
    urlPath: urlPath(item.type, item.slug),
  })),
  ...activities.map((a) => ({
    key: { activity_id: a.id },
    sourceId: a.id,
    slug: a.slug,
    type: 'activity',
    title: `Actividad: ${a.title}`,
    summary: a.summary,
    markdown: activityMarkdown(a),
    evidenceLabel: a.evidence_label,
    ageMin: a.age_min_months,
    ageMax: a.age_max_months,
    urlPath: `/actividades/${a.slug}`,
  })),
];

const existing = must(
  await db.from('kb_documents').select('id, content_item_id, activity_id, source_hash, status'),
);
const bySource = new Map(existing.map((d) => [d.content_item_id ?? d.activity_id ?? '', d]));

let indexed = 0;
let skipped = 0;
let chunksTotal = 0;
for (const source of sources) {
  const hash = createHash('sha256')
    .update(
      JSON.stringify([
        source.title,
        source.summary,
        source.markdown,
        source.evidenceLabel,
        source.ageMin,
        source.ageMax,
        embeddingModel,
      ]),
    )
    .digest('hex');
  const current = bySource.get(source.sourceId);
  if (!force && current?.source_hash === hash && current.status === 'indexed') {
    skipped++;
    continue;
  }

  const chunks = chunkMarkdown(source.title, source.markdown, source.summary);
  const vectors = await embed(chunks.map((c) => `${c.headingPath}\n${c.body}`));
  const document = must(
    await db
      .from('kb_documents')
      .upsert(
        {
          ...source.key,
          slug: source.slug,
          type: source.type,
          title: source.title,
          url_path: source.urlPath,
          evidence_label: source.evidenceLabel,
          age_min_months: source.ageMin,
          age_max_months: source.ageMax,
          source_hash: hash,
          embedding_model: embeddingModel,
          status: 'indexed',
          indexed_at: new Date().toISOString(),
        },
        { onConflict: 'content_item_id' in source.key ? 'content_item_id' : 'activity_id' },
      )
      .select('id')
      .single(),
  );
  must(await db.from('kb_chunks').delete().eq('document_id', document.id));
  must(
    await db.from('kb_chunks').insert(
      chunks.map((c, i) => ({
        document_id: document.id,
        ordinal: c.ordinal,
        heading_path: c.headingPath,
        body: c.body,
        token_estimate: c.tokenEstimate,
        embedding: vectors ? `[${(vectors[i] ?? []).join(',')}]` : null,
      })),
    ),
  );
  indexed++;
  chunksTotal += chunks.length;
}

// Lo que ya no está publicado se retira de la búsqueda.
const published = new Set(sources.map((s) => s.sourceId));
const retire = existing.filter(
  (d) => d.status === 'indexed' && !published.has(d.content_item_id ?? d.activity_id ?? ''),
);
if (retire.length > 0) {
  must(
    await db
      .from('kb_documents')
      .update({ status: 'retired' })
      .in(
        'id',
        retire.map((d) => d.id),
      ),
  );
}

console.log(
  `Base de conocimiento: ${String(indexed)} documentos indexados (${String(chunksTotal)} fragmentos), ` +
    `${String(skipped)} sin cambios, ${String(retire.length)} retirados. ` +
    (embeddingModel
      ? `Embeddings: ${embeddingModel}.`
      : 'Sin VOYAGE_API_KEY: solo texto completo.'),
);
