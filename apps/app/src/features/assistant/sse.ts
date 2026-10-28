import { AssistantEventSchema, type AssistantEvent } from '@crecer/shared';

/**
 * Lector incremental de text/event-stream: recibe trozos de texto como lleguen (pueden cortar
 * un evento a la mitad) y devuelve los eventos completos y validados.
 */
export function createSseParser(): (chunk: string) => AssistantEvent[] {
  let buffer = '';
  return (chunk) => {
    buffer += chunk.replace(/\r\n/g, '\n');
    const events: AssistantEvent[] = [];
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (data) {
        try {
          const parsed = AssistantEventSchema.safeParse(JSON.parse(data));
          if (parsed.success) events.push(parsed.data);
        } catch {
          // Un evento mal formado se ignora: el `done` final trae el mensaje completo.
        }
      }
      boundary = buffer.indexOf('\n\n');
    }
    return events;
  };
}
