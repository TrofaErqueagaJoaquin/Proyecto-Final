import { ageInMonths } from '@crecer/domain';
import { Link, Redirect, useRouter } from 'expo-router';
import { ClipboardList, Info, Plus } from 'lucide-react-native';
import { useId, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BAND_LABELS } from '@/features/assessments/labels';
import { TextLink } from '@/features/auth/components';
import {
  useCurrentQuestionnaire,
  useFamilyAttempts,
  useQuestionnaireVersion,
  useStartAssessment,
} from '@/features/assessments/queries';
import { BroteEmptyState } from '@/features/brote/Brote';
import { memberAge } from '@/features/families/labels';
import { canManage, useActiveFamily, useMembers } from '@/features/families/queries';
import {
  Badge,
  Banner,
  Button,
  Card,
  ErrorBanner,
  ErrorScreen,
  EvidenceChip,
  LoadingScreen,
  makeStyles,
  Screen,
  Sheet,
  Text,
  useOverlayTurn,
  useTheme,
} from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

const useStyles = makeStyles((t) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  info: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surfaceSunken,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
}));

/** Historial de chequeos: una tarjeta por integrante con su último resultado y un botón. */
export default function AssessmentsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { isPending, family } = useActiveFamily();
  const manage = canManage(family?.role);
  const members = useMembers(family?.id);
  const attempts = useFamilyAttempts(manage ? family?.id : undefined);
  const questionnaire = useCurrentQuestionnaire();
  const definition = useQuestionnaireVersion(questionnaire.data?.id ?? undefined);
  const start = useStartAssessment();
  const [infoOpen, setInfoOpen] = useState(false);
  const infoId = useId();
  const infoVisible = useOverlayTurn(`que-es-el-chequeo-${infoId}`, infoOpen);

  if (isPending) return <LoadingScreen />;
  if (!family) return <Redirect href="/bienvenida" />;
  if (!manage) {
    // ROLES_AND_PERMISSIONS.md §3: la caregiver no ve los chequeos.
    return (
      <Screen>
        <BroteEmptyState
          title="Los chequeos son de los responsables"
          description="Los hacen y los ven los responsables de la familia."
        />
      </Screen>
    );
  }
  if (members.isPending || attempts.isPending || questionnaire.isPending) {
    return <LoadingScreen />;
  }
  if (members.isError || attempts.isError || questionnaire.isError) {
    return (
      <ErrorScreen
        error={members.error ?? attempts.error ?? questionnaire.error}
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
  const themeTitle = (code: string) =>
    definition.data?.definition.sections.find((s) => s.code === code)?.title ?? null;
  const begin = (memberId: string) => {
    if (!version) return;
    start.mutate(
      { memberId, versionId: version.id },
      {
        onSuccess: (attemptId) => {
          router.push(`/evaluaciones/${attemptId}/responder`);
        },
      },
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
          Historial de chequeos
        </Text>
        <Pressable
          style={styles.info}
          accessibilityRole="button"
          accessibilityLabel="Qué es el chequeo"
          onPress={() => {
            setInfoOpen(true);
          }}
        >
          <Info color={colors.ink} size={24} aria-hidden />
        </Pressable>
      </View>

      {!version ? <Banner tone="info">Todavía no hay un chequeo para hacer.</Banner> : null}
      <ErrorBanner error={start.error} />

      {active.length === 0 ? (
        <BroteEmptyState
          title="Primero agregá a quien acompañás"
          action={
            <Link href="/familia/integrante/nuevo" asChild>
              <Button label="Agregar integrante" icon={Plus} />
            </Link>
          }
        />
      ) : (
        active.map((member) => {
          const own = attempts.data.filter((a) => a.member_id === member.id);
          const open = own.find((a) => a.status === 'in_progress');
          const last = own.find((a) => a.status === 'submitted');
          const age = ageInMonths(member.birth_month, now);
          const fits =
            version !== null && age >= version.min_age_months && age <= version.max_age_months;
          const starting = start.isPending && start.variables.memberId === member.id;
          return (
            <Card key={member.id}>
              <View style={styles.who}>
                <View style={styles.avatar} aria-hidden>
                  <Text variant="heading" tone="primary">
                    {member.alias.trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="subheading">{member.alias}</Text>
                  <Text variant="small" tone="muted">
                    {last
                      ? `${memberAge(member.birth_month)} · último: ${new Date(last.submitted_at ?? '').toLocaleDateString('es-AR')}`
                      : memberAge(member.birth_month)}
                  </Text>
                </View>
              </View>
              {last && last.assessment_dimension_scores.length > 0 ? (
                <View style={styles.badges}>
                  {last.assessment_dimension_scores.map((s) => {
                    const band = BAND_LABELS[s.band as keyof typeof BAND_LABELS];
                    const theme = themeTitle(s.dimension_code);
                    return (
                      <Badge
                        key={s.dimension_code}
                        tone={s.band === 'strength' ? 'primary' : 'neutral'}
                      >
                        {theme ? `${theme}: ${band}` : band}
                      </Badge>
                    );
                  })}
                </View>
              ) : null}
              {open ? (
                <Link href={`/evaluaciones/${open.id}/responder`} asChild>
                  <Button label="Seguir el chequeo" icon={ClipboardList} fullWidth />
                </Link>
              ) : last ? (
                <>
                  <Link href={`/evaluaciones/${last.id}/resultado`} asChild>
                    <Button label="Ver el resultado" icon={ClipboardList} fullWidth />
                  </Link>
                  {fits ? (
                    <Button
                      label="Hacer uno nuevo"
                      variant="ghost"
                      loading={starting}
                      onPress={() => {
                        begin(member.id);
                      }}
                    />
                  ) : null}
                </>
              ) : fits ? (
                <Button
                  label="Hacer el chequeo"
                  icon={ClipboardList}
                  fullWidth
                  loading={starting}
                  onPress={() => {
                    begin(member.id);
                  }}
                />
              ) : (
                <Text variant="small" tone="muted">
                  Todavía no hay un chequeo para esta edad.
                </Text>
              )}
            </Card>
          );
        })
      )}

      <Sheet
        visible={infoVisible}
        title="Qué es el chequeo"
        onClose={() => {
          setInfoOpen(false);
        }}
      >
        {version ? (
          <>
            <Text>{version.questionnaires.description}</Text>
            <Text tone="muted">
              {`Unos ${String(version.estimated_minutes)} minutos. Se guarda solo y podés seguir después.`}
            </Text>
            <EvidenceChip label={version.evidence_label} showHelp />
          </>
        ) : null}
        <Text>
          Es una orientación, no un diagnóstico. Si algo te preocupa, mirá{' '}
          <TextLink href="/cuando-consultar">cuándo consultar</TextLink>.
        </Text>
        <Button
          label="Entendido"
          fullWidth
          onPress={() => {
            setInfoOpen(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}
