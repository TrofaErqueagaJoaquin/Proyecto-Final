import { Link } from 'expo-router';
import { Target } from 'lucide-react-native';

import { useActiveFamily } from '@/features/families/queries';
import { Button } from '@/ui';

import { useCreateGoal } from './queries';

/** "Convertir una recomendación en objetivo" (F7): queda en Objetivos para anotar avances. */
export function ToGoalButton({
  title,
  reason,
  memberId,
}: {
  title: string;
  reason: string;
  memberId: string;
}) {
  const { family } = useActiveFamily();
  const create = useCreateGoal(family?.id);
  if (create.isSuccess) {
    return (
      <Link href="/objetivos" asChild>
        <Button label="Ver en Objetivos" variant="ghost" icon={Target} />
      </Link>
    );
  }
  return (
    <Button
      label="Convertir en objetivo"
      variant="ghost"
      icon={Target}
      loading={create.isPending}
      onPress={() => {
        create.mutate({
          title: title.slice(0, 120),
          description: `Por qué: ${reason}`,
          memberId,
          source: 'recommendation',
          targetDate: null,
        });
      }}
    />
  );
}
