/**
 * Filtro de riesgo determinista, ANTES del modelo (AI_ARCHITECTURE.md §7.1).
 *
 * El falso positivo (derivar sin necesidad) se acepta; el falso negativo no. Por eso se compara
 * contra varias formas normalizadas del texto (sin tildes, sin letras repetidas, sin espacios
 * entre letras sueltas, sin números en lugar de letras) y los patrones son amplios.
 */

export type RiskLevel = 'none' | 'clinical' | 'high';
export type HighRiskCategory = 'self_harm' | 'abuse' | 'medical_emergency' | 'grooming';
export type RiskCategory = HighRiskCategory | 'clinical';

export interface RiskResult {
  level: RiskLevel;
  category: RiskCategory | null;
}

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};

/** Minúsculas, sin tildes, con "ñ" → "n" y todo lo que no es letra como espacio. */
function base(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/[013457@$]/g, (ch) => LEET[ch] ?? ch)
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

/** "m u e r t e" → "muerte": une secuencias de 3 o más letras sueltas. */
function joinSpacedLetters(text: string): string {
  return text.replace(/\b(?:[a-z] ){2,}[a-z]\b/g, (match) => match.replace(/ /g, ''));
}

/** "moriiirrr" → "morir": colapsa letras repetidas. */
function squash(text: string): string {
  return text.replace(/([a-z])\1+/g, '$1');
}

/** Formas en las que se busca (los patrones se escriben ya "aplastados"). */
export function normalizedForms(text: string): string[] {
  const b = base(text);
  const joined = joinSpacedLetters(b);
  return [...new Set([squash(b), squash(joined), squash(joined.replace(/ /g, ''))])];
}

// Patrones sobre texto sin tildes y sin letras dobles ("matarse", "mata", "desaparecer"...).
// Se escriben "aplastados": "violacion" no cambia; "lavandina" no cambia; "llama" → "lama".
const HIGH_PATTERNS: Record<HighRiskCategory, RegExp[]> = {
  self_harm: [
    /\bsuicid/,
    /\b(se|me|te) (quiere|quiero|queres|quiera|queria) (morir|matar|lastimar|cortar)/,
    /\bquiere(n)? (morirse|matarse|lastimarse|desaparecer)/,
    /\b(me|se) quiero morir/,
    /\b(morirme|matarme|matarse|morirse)\b/,
    /\bno quiere(s)? (vivir|seguir viviendo)/,
    /\bquitarse la vida/,
    /\bse (corta|corto|cortaba|lastima|lastimo|golpea la cabeza|hace dano|hizo dano)\b(?! (la luz|el wifi|el internet|internet|la senal|la conexion|el video|la peli|la pelicula|la lamada|el pelo|las unas|con el papel))/,
    /\bautolesi/,
    // Letras separadas ("q u i e r e  m a t a r s e") quedan unidas sin espacios.
    /(quiere|quiero|queria)(morir|matar|lastimar)/,
    /\bcortes en (los brazos|el brazo|las piernas|la pierna|las munecas|la muneca)/,
    /\b(hacerse|hacerme) dano/,
    /\bse (va a|quiere) tirar (de|por) (la ventana|el balcon|un puente)/,
  ],
  abuse: [
    /\b(me|nos) (pega|pegan|pego|golpea|golpean|golpeo|maltrata)\b/,
    /\b(su|mi|el|la|un|una) (papa|padre|mama|madre|padrastro|madrastra|pareja|marido|esposo|novio|novia|tio|tia|abuelo|abuela|primo|docente|maestro|maestra|profesor|entrenador|vecino|adulto) (le|lo|la|me|nos) (pega|golpea|toca|lastima|maltrata|amenaza)\b/,
    // "abusa de las pantallas" es otra cosa: se excluye "abuso de la/las/los/el/lo".
    /\babus(o|a|aron|ando|ador|adora)\b(?! de (la|las|los|el|lo|su|sus) )/,
    /\bviola(cion|da|do|ron)\b/,
    /\bviolencia (familiar|de genero|domestica|en (la|mi|su|nuestra) casa)/,
    /\b(hay|sufre|sufrimos|vivimos|vive|viven) violencia/,
    /\bmaltrat/,
    // "le toca la tablet" (le corresponde) no: solo con un complemento inequívoco.
    /\b(lo|la|le|me) (toca|tocan|toco|tocaron|tocaba) (las partes|sus partes|en sus partes|ahi abajo|sin ropa|de forma rara|de una forma rara)/,
    /\btocamientos?\b/,
    /\bpartes intimas/,
  ],
  medical_emergency: [
    /\bno respira/,
    /\bconvulsi/,
    /\b(se tomo|tomo|trago|se trago|se comio) (pastilas|pastila|remedios|medicamentos|lavandina|detergente|una pila|pilas|un iman|veneno)/,
    /\bintoxic/,
    /\benvenen/,
    /\bse desmayo/,
    /\binconsciente\b/,
    /\bno reacciona/,
    /\bse (ahoga|esta ahogando)/,
    /\b(sangra|sangre) mucho/,
    /\bse golpeo la cabeza y/,
  ],
  grooming: [
    /\bgrom/,
    /\b(le|me) (pide|pidio|pidieron|piden) fotos/,
    /\bfotos (desnud|intimas|sin ropa)/,
    /\b(adulto|hombre|mujer|persona) (desconocid|que no conoce)/,
    /\bun desconocido (le|me) (escribe|escribio|habla|hablo|manda)/,
    /\bsextors/,
    /\b(lo|la|le|me) extorsion/,
    /\bencontrarse con (alguien|un adulto|una persona) que conocio (por|en) (internet|el juego|redes)/,
  ],
};

const CLINICAL_PATTERNS: RegExp[] = [
  /\btdah\b/,
  /\bdeficit de atencion/,
  /\bhiperactiv/,
  /\bautis/,
  /\btea\b/,
  /\bespectro/,
  /\bmedicacion\b|\bmedicamento|\bmedicar/,
  /\bdosis\b/,
  /\bmelatonina/,
  /\britalina|\bmetilfenidato|\brisperidona|\bfluoxetina|\bsertralina/,
  /\bdiagnost/,
  /\btrastorno/,
  /\bdepresi/,
  /\bansiedad\b/,
  // Patrón ya "aplastado": "adicción" llega como "adicion".
  /\badic(ion|to|ta)\b/,
  /\bpsiquiatr/,
  /\bterapia\b|\bterapeuta/,
];

const HIGH_ORDER: HighRiskCategory[] = ['self_harm', 'medical_emergency', 'grooming', 'abuse'];

export function classifyRisk(text: string): RiskResult {
  const forms = normalizedForms(text);
  const matches = (patterns: RegExp[]) =>
    forms.some((form) => patterns.some((pattern) => pattern.test(form)));
  for (const category of HIGH_ORDER) {
    if (matches(HIGH_PATTERNS[category])) return { level: 'high', category };
  }
  if (matches(CLINICAL_PATTERNS)) return { level: 'clinical', category: 'clinical' };
  return { level: 'none', category: null };
}
