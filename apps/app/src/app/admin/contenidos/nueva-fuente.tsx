import { useState } from 'react';

import { CreatedView } from '@/features/admin/ContentFormParts';
import { SourceForm } from '@/features/admin/SourceForm';
import { Screen, Text } from '@/ui';

/** Cargar una fuente de información para citar en actividades y fichas. */
export default function NewSourceScreen() {
  const [created, setCreated] = useState(false);

  if (created) {
    return (
      <Screen maxWidth={640}>
        <CreatedView
          title="Fuente"
          message="La fuente quedó guardada. Ya la podés citar al cargar actividades y fichas."
          published
          viewHref={null}
          anotherLabel="Cargar otra fuente"
          onAnother={() => {
            setCreated(false);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen maxWidth={720}>
      <Text variant="title">Nueva fuente</Text>
      <Text tone="muted">
        Queda disponible para citar al cargar actividades y fichas. Se marca «sin verificar» hasta
        que alguien la revise.
      </Text>
      <SourceForm
        onCreated={() => {
          setCreated(true);
        }}
      />
    </Screen>
  );
}
