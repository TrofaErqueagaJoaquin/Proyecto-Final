import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Badge, makeStyles, Text, useTheme } from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

export interface SourceRef {
  locator: string | null;
  sources: {
    slug: string;
    citation: string;
    url: string | null;
    doi: string | null;
    verification_status: string;
  } | null;
}

const useStyles = makeStyles((t) => ({
  list: { gap: t.space.md },
  item: { gap: t.space.xs },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.xs,
    minHeight: minTouchTarget,
    alignSelf: 'flex-start',
  },
}));

function sourceUrl(source: NonNullable<SourceRef['sources']>): string | null {
  if (source.url) return source.url;
  if (source.doi) return `https://doi.org/${source.doi}`;
  return null;
}

/** Fuentes citadas, con su estado de verificación a la vista (nunca se presentan como verificadas si no lo están). */
export function SourceList({ refs }: { refs: SourceRef[] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const sources = refs.filter(
    (r): r is SourceRef & { sources: NonNullable<SourceRef['sources']> } => r.sources !== null,
  );
  if (sources.length === 0) return null;
  return (
    <View style={styles.list}>
      <Text variant="subheading">Fuentes</Text>
      {sources.map(({ sources: source, locator }) => {
        const url = sourceUrl(source);
        return (
          <View key={source.slug} style={styles.item}>
            <Text variant="small">
              {source.citation}
              {locator ? ` (${locator})` : ''}
            </Text>
            {source.verification_status !== 'verified' ? (
              <Badge tone="caution">Cita pendiente de verificación</Badge>
            ) : null}
            {url ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Abrir la fuente: ${source.citation}`}
                style={styles.link}
                onPress={() => void WebBrowser.openBrowserAsync(url)}
              >
                <ExternalLink color={colors.primary} size={16} aria-hidden />
                <Text variant="small" tone="primary">
                  Ver la publicación
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
