import { createSseParser } from './sse';

const START = { type: 'start', userMessageId: '00000000-0000-4000-8000-000000000001' };

describe('createSseParser', () => {
  it('arma los eventos aunque lleguen cortados en varios trozos', () => {
    const parse = createSseParser();
    const raw = `data: ${JSON.stringify(START)}\n\ndata: ${JSON.stringify({ type: 'delta', text: 'Hola' })}\n\n`;
    const first = parse(raw.slice(0, 20));
    const rest = parse(raw.slice(20));
    expect(first).toEqual([]);
    expect(rest).toEqual([START, { type: 'delta', text: 'Hola' }]);
  });

  it('ignora eventos inválidos o desconocidos', () => {
    const parse = createSseParser();
    expect(parse('data: {roto\n\ndata: {"type":"otro"}\n\n')).toEqual([]);
  });

  it('acepta finales de línea de Windows', () => {
    const parse = createSseParser();
    expect(parse(`data: ${JSON.stringify(START)}\r\n\r\n`)).toEqual([START]);
  });
});
