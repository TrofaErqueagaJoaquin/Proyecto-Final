import { ageInMonths } from '@crecer/domain';
import { Link, Redirect, useRouter } from 'expo-router';
import { ClipboardList, History } from 'lucide-react-native';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { BAND_LABELS } from '@/features/assessments/labels';
import { TextLink } from '@/features/auth/components';
import {
  useCurrentQuestionnaire,
  useFamilyAttempts,
  useStartAssessment,
} from '@/features/assessments/queries';
import { memberAge } from '@/features/families/labels';
import { canManage, useActiveFamily, useMembers } from '@/features/families/queries';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  EvidenceChip,
  Screen,
  Skeleton,
  Text,
} from '@/ui';

export default function AssessmentsScreen() {
  const router = useRouter();
  const { isPending, family } = useActiveFamily();
  const manage = canManage(family?.role);
  const members = useMembers(family?.id);
  const attempts = useFamilyAttempts(manage ? family?.id : undefined);
  const questionnaire = useCurrentQuestionnaire();
  const start = useStartAssessment();

  if (isPending) return <Skeleton height={300} />;
  if (!family) return <Redirect href="/familia/nueva" />;
  if (!manage) {
    // ROLES_AND_PERMISSIONS.md §3: la caregiver no ve evaluaciones.
    return (
      <Screen>
        <EmptyState
          icon={ClipboardList}
          title="Las evaluaciones son de los responsables"
          description="Las responden y las ven los responsables principales de la familia."
        />
      </Screen>
    );
  }
  if (members.isPending || attempts.isPending || questionnaire.isPending) {
    return <Skeleton height={300} />;
  }
  if (members.isError || attempts.isError || questionnaire.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void members.refetch();
          void attempts.refetch();
          void questionnaire.refetch();
        }}
      />
    );
  }

  const version = questionnaire.data;
  const active = members.data.filter((m) => m.archived_at === null);
  const now = new Date();

  return (
    <Screen>
      <Text variant="title">Evaluaciones</Text>
      {version ? (
        <Card>
          <Text variant="subheading">{version.questionnaires.title}</Text>
          <Text tone="muted">{version.questionnaires.description}</Text>
          <Text variant="small" tone="muted">
            {`Unos ${String(version.estimated_minutes)} minutos · se guarda solo y podés seguir después.`}
          </Text>
          <EvidenceChip label={version.evidence_label} showHelp />
        </Card>
      ) : (
        <Banner tone="info">Todavía no hay un cuestionario publicado.</Banner>
      )}
      {start.error ? <Banner tone="danger">{friendlyError(start.error)}</Banner> : null}

      {active.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="Primero agregá a quien acompañás"
            description="La evaluación se responde sobre un integrante de la familia."
            action={
              <Link href="/familia/integrante/nuevo" asChild>
                <Button label="Agregar integrante" variant="secondary" />
              </Link>
            }
          />
        </Card>
      ) : (
        active.map((member) => {
          const own = attempts.data.filter((a) => a.member_id === member.id);
          const open = own.find((a) => a.status === 'in_progress');
          const last = own.find((a) => a.status === 'submitted');
          const age = ageInMonths(member.birth_month, now);
          const fits =
            version !== null && age >= version.min_age_months && age <= version.max_age_months;
          return (
            <Card key={member.id}>
              <Text variant="subheading">{member.alias}</Text>
              <Text variant="small" tone="muted">
                {memberAge(member.birth_month)}
              </Text>
              {last ? (
                <View style={{ gap: 6 }}>
                  <Text variant="small">
                    {`Última evaluación: ${new Date(last.submitted_at ?? '').toLocaleDateString('es-AR')}`}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {last.assessment_dimension_scores.map((s) => (
                      <Badge
                        key={s.dimension_code}
                        tone={s.band === 'strength' ? 'primary' : 'neutral'}
                      >
                        {BAND_LABELS[s.band as keyof typeof BAND_LABELS]}
                      </Badge>
                    ))}
                  </View>
                  <TextLink href={`/evaluaciones/${last.id}/resultado`}>Ver el resultado</TextLink>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {open ? (
                  <Link href={`/evaluaciones/${open.id}/responder`} asChild>
                    <Button label="Continuar" icon={ClipboardList} />
                  </Link>
                ) : fits ? (
                  <Button
                    label={last ? 'Hacer otra' : 'Empezar'}
                    icon={ClipboardList}
                    variant={last ? 'secondary' : 'primary'}
                    loading={start.isPending && start.variables.memberId === member.id}
                    onPress={() => {
                      start.mutate(
                        { memberId: member.id, versionId: version.id },
                        {
                          onSuccess: (attemptId) => {
                            router.push(`/evaluaciones/${attemptId}/responder`);
                          },
                        },
                      );
                    }}
                  />
                ) : null}
                {own.some((a) => a.status === 'submitted') ? (
                  <Link href={`/evaluaciones/historial/${member.id}`} asChild>
                    <Button label="Historial" icon={History} variant="ghost" />
                  </Link>
                ) : null}
              </View>
            </Card>
          );
        })
      )}

      <Text variant="small" tone="muted">
        Es una orientación, no un diagnóstico. Si algo te preocupa, mirá{' '}
        <TextLink href="/cuando-consultar">cuándo consultar</TextLink>.
      </Text>
    </Screen>
  );
}
