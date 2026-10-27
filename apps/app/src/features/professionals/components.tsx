import { BadgeCheck, CircleAlert, Clock, MapPin, Video } from 'lucide-react-native';
import { View } from 'react-native';

import { LinkCard } from '@/features/library/LinkCard';
import { Badge, makeStyles, Text, useTheme } from '@/ui';

import { MODALITY_LABELS, VERIFICATION_LABELS, type VerificationStatus } from './labels';
import type { ProfessionalProfile } from './queries';

const useStyles = makeStyles((t) => ({
  verification: { flexDirection: 'row', alignItems: 'center', gap: t.space.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

/** El estado de verificación siempre a la vista (UX_AND_NAVIGATION.md §1.2). */
export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const verified = status === 'verified';
  const Icon = verified ? BadgeCheck : status === 'pending' ? Clock : CircleAlert;
  return (
    <View style={styles.verification}>
      <Icon color={verified ? colors.success : colors.caution} size={16} aria-hidden />
      <Text variant="small" tone={verified ? 'success' : 'muted'}>
        {VERIFICATION_LABELS[status]}
      </Text>
    </View>
  );
}

/** Iniciales para el avatar (sin fotos: minimización). */
export function initials(name: string): string {
  const words = name
    .replace(/^(lic|dr|dra|prof)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function ProfessionalAvatar({ name }: { name: string }) {
  const styles = useStyles();
  return (
    <View style={styles.avatar} aria-hidden>
      <Text variant="bodyStrong" tone="primary">
        {initials(name)}
      </Text>
    </View>
  );
}

export function ProfessionalCard({
  professional,
  specialtyLabels,
}: {
  professional: ProfessionalProfile;
  specialtyLabels: Map<string, string>;
}) {
  const styles = useStyles();
  const place = [professional.city, professional.province].filter(Boolean).join(', ');
  return (
    <LinkCard
      href={`/directorio/${professional.user_id}`}
      title={professional.display_name}
      description={professional.specialties
        .map((code) => specialtyLabels.get(code) ?? code)
        .join(' · ')}
      leading={<ProfessionalAvatar name={professional.display_name} />}
      footer={
        <View style={{ gap: 6 }}>
          <View style={styles.badges}>
            {professional.modalities.map((m) => (
              <Badge key={m} icon={m === 'virtual' ? Video : MapPin}>
                {MODALITY_LABELS[m]}
              </Badge>
            ))}
            {place ? <Badge icon={MapPin}>{place}</Badge> : null}
          </View>
          <VerificationBadge status={professional.verification_status} />
        </View>
      }
    />
  );
}
