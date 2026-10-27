import { LegalDraft } from '@/features/legal/LegalDraft';

export default function TermsScreen() {
  return (
    <LegalDraft
      title="Términos de uso"
      sections={[
        {
          heading: 'Qué es Crecer en Casa',
          body: 'Una herramienta de orientación para familias sobre desarrollo infantil y uso de pantallas. No hace diagnósticos ni reemplaza la consulta con profesionales de la salud.',
        },
        {
          heading: 'Uso de la cuenta',
          body: 'Las cuentas son para personas adultas. Cada persona es responsable de los datos que carga sobre su familia y de compartirlos solo con quien corresponda.',
        },
        {
          heading: 'Contenido',
          body: 'Cada contenido indica su fuente y su tipo de evidencia. Las situaciones de riesgo se derivan siempre a recursos de ayuda y a profesionales.',
        },
      ]}
    />
  );
}
