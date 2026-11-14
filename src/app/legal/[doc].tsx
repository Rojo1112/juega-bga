import { Stack, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { EmptyState, Screen, Section } from '@/components/ui';
import { LEGAL_DOCS, type LegalDocId } from '@/constants/legal';

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const content = LEGAL_DOCS[doc as LegalDocId];

  if (!content) {
    return (
      <Screen>
        <EmptyState icon="document-text-outline" title="Documento no encontrado" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: content.title }} />
      <ThemedText type="subtitle">{content.title}</ThemedText>
      {content.sections.map((section) => (
        <Section key={section.heading} title={section.heading}>
          <ThemedText>{section.body}</ThemedText>
        </Section>
      ))}
    </Screen>
  );
}
