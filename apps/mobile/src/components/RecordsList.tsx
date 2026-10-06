import type { ReactNode } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { EvidenceRecord } from '@/features/evidence/schema';

import { Card } from './Card';
import { EmptyCard, LoadGate, PageHeader, RecordRow } from './Dashboard';
import { TAB_BAR_SPACE } from './RoleTabBar';
import { colors, spacing } from './theme';

/** Full-screen list of papers (FlatList, pull to refresh) for a tab. */
export function RecordsList({
  title,
  subtitle,
  records,
  error,
  loading,
  reload,
  showStudent = false,
  header,
  emptyBody = 'Papers you upload will be listed here.',
}: {
  title: string;
  subtitle?: string;
  records: EvidenceRecord[] | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
  showStudent?: boolean;
  header?: ReactNode;
  emptyBody?: string;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={records ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + spacing.lg }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageHeader title={title} subtitle={subtitle} />
            {header}
            <LoadGate loading={loading} error={error} hasData={records !== undefined} onRetry={reload}>
              {records?.length === 0 ? <EmptyCard icon="folder-open-outline" title="No records yet" body={emptyBody} /> : null}
            </LoadGate>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.item}>
            <RecordRow record={item} showStudent={showStudent} />
          </Card>
        )}
        refreshing={loading && records !== undefined}
        onRefresh={reload}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md + 4, gap: spacing.sm + 2, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { gap: spacing.md, marginBottom: spacing.xs },
  item: { paddingVertical: spacing.xs },
});
