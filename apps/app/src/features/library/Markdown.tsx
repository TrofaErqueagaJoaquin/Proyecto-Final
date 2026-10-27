import { View } from 'react-native';

import { makeStyles, Text } from '@/ui';

import { parseMarkdown, type Inline } from './parse-markdown';

const useStyles = makeStyles((t) => ({
  root: { gap: t.space.md },
  list: { gap: t.space.sm },
  item: { flexDirection: 'row', gap: t.space.sm },
  bullet: { width: 16 },
  itemText: { flex: 1 },
}));

function Inlines({ content }: { content: Inline[] }) {
  return content.map((part, i) =>
    part.bold ? (
      <Text key={i} variant="bodyStrong">
        {part.text}
      </Text>
    ) : (
      part.text
    ),
  );
}

/** Muestra el Markdown seguro de la biblioteca con la tipografía de la app. */
export function Markdown({ source }: { source: string }) {
  const styles = useStyles();
  return (
    <View style={styles.root}>
      {parseMarkdown(source).map((block, i) => {
        if (block.type === 'heading') {
          return (
            <Text key={i} variant={block.level === 2 ? 'heading' : 'subheading'}>
              <Inlines content={block.content} />
            </Text>
          );
        }
        if (block.type === 'list') {
          return (
            <View key={i} style={styles.list} role="list">
              {block.items.map((item, j) => (
                <View key={j} style={styles.item} role="listitem">
                  <Text style={styles.bullet} aria-hidden>
                    •
                  </Text>
                  <Text style={styles.itemText}>
                    <Inlines content={item} />
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={i}>
            <Inlines content={block.content} />
          </Text>
        );
      })}
    </View>
  );
}
