import { LegalDraft } from '@/features/legal/LegalDraft';

export default function PrivacyScreen() {
  return (
    <LegalDraft
      title="Política de privacidad"
      sections={[
        {
          heading: 'Datos mínimos',
          body: 'De cada integrante guardamos solo un apodo y el mes y año de nacimiento. Nunca pedimos nombre real, documento, escuela ni fotos.',
        },
        {
          heading: 'Vos decidís qué compartir',
          body: 'Cada uso de los datos requiere un consentimiento que podés revocar en cualquier momento desde la sección Privacidad. Los profesionales ven solo lo que autorizás, integrante por integrante.',
        },
        {
          heading: 'Sin publicidad ni venta de datos',
          body: 'No mostramos publicidad, no usamos rastreadores y no vendemos datos.',
        },
        {
          heading: 'Tus derechos',
          body: 'Podés acceder, rectificar y suprimir tus datos (Ley 25.326). Al borrar tu cuenta se eliminan tus datos.',
        },
      ]}
    />
  );
}
