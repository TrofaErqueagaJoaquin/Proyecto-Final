import type { RequestIdVariables } from 'hono/request-id';

/** Identidad verificada del JWT de Supabase (nunca se toma del cuerpo del pedido). */
export interface AuthContext {
  userId: string;
  email: string | null;
  /** aal2 = sesión con segundo factor (MFA). */
  aal: 'aal1' | 'aal2';
  /** JWT original: se reenvía a Supabase para que RLS evalúe como esta persona. */
  token: string;
}

export interface AppBindings {
  Variables: RequestIdVariables & { auth: AuthContext };
}
