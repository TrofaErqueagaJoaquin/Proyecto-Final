import { ActivityCatalog } from '@/features/library/ActivityCatalog';

/** El catálogo público: sin filtro por edad (ver `/catalogo` para el de la familia). */
export default function ActivitiesScreen() {
  return <ActivityCatalog edges={['bottom']} />;
}
