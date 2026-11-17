import { ActivityCatalog } from '@/features/library/ActivityCatalog';

/**
 * El catálogo dentro del espacio de la familia: la misma pantalla que la pública, pero sin salir
 * de las pestañas. Arranca con la edad del integrante más chico.
 */
export default function FamilyCatalogScreen() {
  return <ActivityCatalog kidFilter />;
}
