// Graba la conversación precargada de la demo con una respuesta REAL del asistente
// (EXPOTEC_DEMO.md §3: "no se escribe a mano").
//
//   pnpm demo:reset     (primero: hacen falta Laura, Tomi y la base de conocimiento)
//   pnpm demo:capture
//   pnpm demo:reset     (de nuevo: carga la conversación grabada)
//
// Corre el asistente de la API en este proceso, con la cuenta de Laura, contra el proyecto demo.

import { writeFile } from 'node:fs/promises';

import { AssistantEventSchema } from '@crecer/shared';

import { createApp, createDefaultDeps } from '../../apps/api/src/app.ts';
import { loadEnv } from '../../apps/api/src/env.ts';
import { type ConversationFixture } from './fixtures.ts';
import { demoId, enforceGuards, must, service, sessionFor } from './lib.ts';
import { CAPTURE_QUESTION, email } from './scenario.ts';

const apiEnv = loadEnv();
const deps = createDefaultDeps(apiEnv);
if (!deps.llm || deps.llm.id === 'fake') {
  console.error(
    'demo:capture necesita el modelo real: ANTHROPIC_API_KEY y AI_LLM_PROVIDER=anthropic.',
  );
  process.exit(1);
}

await enforceGuards('Se va a usar el asistente real (costo menor a 1 centavo de dólar)');

const laura = await sessionFor(email('laura'));
const conversation = must(
  await laura.db
    .from('conversations')
    .insert({
      family_id: demoId('family:garcia'),
      user_id: demoId('user:laura'),
      member_id: demoId('member:tomi'),
      use_personal_context: true,
    })
    .select('id')
    .single(),
  'conversations',
).id;

try {
  const response = await createApp(apiEnv, deps).request(
    `/v1/assistant/conversations/${conversation}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${laura.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: CAPTURE_QUESTION }),
    },
  );
  const stream = await response.text();
  if (!response.ok) throw new Error(`El asistente respondió ${String(response.status)}: ${stream}`);
  const done = stream
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => AssistantEventSchema.parse(JSON.parse(line.slice(6))))
    .find((event) => event.type === 'done');
  if (!done) throw new Error('El asistente no terminó la respuesta');
  if (done.message.outcome !== 'answered' || done.message.citations.length === 0) {
    throw new Error(
      `Respuesta no apta para la demo (${done.message.outcome}): ${done.message.body}`,
    );
  }

  const [saved, messages] = await Promise.all([
    service.from('conversations').select('title').eq('id', conversation).single(),
    service
      .from('assistant_messages')
      .select('role, body, citations, risk_level, outcome, prompt_version, model')
      .eq('conversation_id', conversation)
      .order('created_at'),
  ]);
  const rows = must(messages, 'assistant_messages');
  const answer = rows.find((m) => m.role === 'assistant');
  const fixture: ConversationFixture = {
    capturedAt: new Date().toISOString(),
    model: answer?.model ?? deps.llm.model,
    promptVersion: answer?.prompt_version ?? '',
    title: must(saved, 'conversations').title,
    messages: rows.map((m) => ({
      role: m.role as 'user' | 'assistant',
      body: m.body,
      citations: m.citations as ConversationFixture['messages'][number]['citations'],
      riskLevel: m.risk_level as ConversationFixture['messages'][number]['riskLevel'],
      outcome: m.outcome as ConversationFixture['messages'][number]['outcome'],
    })),
  };
  await writeFile(
    new URL('./fixtures/conversation.json', import.meta.url),
    `${JSON.stringify(fixture, null, 2)}\n`,
  );
  console.log(`\nGrabada con ${fixture.model}:\n\n${done.message.body}\n`);
  console.log(
    'Revisala, commiteá scripts/demo/fixtures/conversation.json y corré pnpm demo:reset.',
  );
} finally {
  // La conversación de ensayo no queda en la cuenta: la carga demo:reset desde el archivo.
  await service.from('conversations').delete().eq('id', conversation);
}
