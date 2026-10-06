import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AssessmentCard } from '@/components/AssessmentCard';
import { BOTTOM_BAR_SPACE } from '@/components/BottomBar';
import { Button } from '@/components/Button';
import { Card, HeroCard } from '@/components/Card';
import { IconCircle } from '@/components/IconTile';
import { Notice, Screen, SectionTitle } from '@/components/Screen';
import { colors, MIN_TOUCH, radius, spacing } from '@/components/theme';
import { createAssessment, listMyAssessments } from '@/features/assessments/api';
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPES,
  QUARTER_LABELS,
  QUARTERS,
  type AssessmentType,
  type Quarter,
} from '@/features/assessments/constants';
import { createAssessmentInputSchema, type AssessmentMatch } from '@/features/assessments/schema';

type FieldErrors = Partial<Record<'subject' | 'title' | 'assessmentType' | 'quarter' | 'totalScore', string>>;

export default function TeacherScreen() {
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('QUIZ');
  const [quarter, setQuarter] = useState<Quarter>('FIRST_QUARTER');
  const [totalScore, setTotalScore] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<AssessmentMatch | null>(null);
  const [mine, setMine] = useState<AssessmentMatch[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const refreshMine = useCallback(() => {
    listMyAssessments().then(setMine, () => setMine([]));
  }, []);
  useEffect(refreshMine, [refreshMine]);

  // Show a newly created code, which renders at the top of the screen.
  useEffect(() => {
    if (created) scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [created]);

  async function submit() {
    setError(null);
    const parsed = createAssessmentInputSchema.safeParse({ subject, title, assessmentType, quarter, totalScore });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        errors[key] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      setCreated(await createAssessment(parsed.data));
      setSubject('');
      setTitle('');
      setTotalScore('');
      refreshMine();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the assessment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen topInset bottomSpace={BOTTOM_BAR_SPACE} scrollRef={scrollRef}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Teacher Prototype</Text>
        <Text style={styles.title}>Create an assessment</Text>
        <Text style={styles.subtitle}>Get a 5-digit code your students write on their paper.</Text>
      </View>

      {created ? (
        <>
          <HeroCard style={styles.codeHero}>
            <Text style={styles.codeLabel}>Assessment code</Text>
            <Text style={styles.code} accessibilityLabel={`Assessment code ${created.code.split('').join(' ')}`}>
              {created.code}
            </Text>
            <Text style={styles.codeHint}>
              Tell students: “Write {created.code} clearly in a box in the upper-right corner of your paper.”
            </Text>
          </HeroCard>
          <AssessmentCard assessment={created} showCode={false} />
        </>
      ) : null}

      <Card style={styles.form}>
        <Text style={styles.formTitle}>{created ? 'Create another' : 'Assessment details'}</Text>
        <Field label="Subject" error={fieldErrors.subject}>
          <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="Mathematics" placeholderTextColor={colors.textMuted} maxLength={80} />
        </Field>
        <Field label="Assessment title" error={fieldErrors.title}>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Fractions Quiz" placeholderTextColor={colors.textMuted} maxLength={120} />
        </Field>
        <Field label="Assessment type" error={fieldErrors.assessmentType}>
          <Chips options={ASSESSMENT_TYPES} labels={ASSESSMENT_TYPE_LABELS} value={assessmentType} onChange={setAssessmentType} />
        </Field>
        <Field label="Quarter" error={fieldErrors.quarter}>
          <Chips options={QUARTERS} labels={QUARTER_LABELS} value={quarter} onChange={setQuarter} />
        </Field>
        <Field label="Total score" error={fieldErrors.totalScore}>
          <TextInput
            style={styles.input}
            value={totalScore}
            onChangeText={(t) => setTotalScore(t.replace(/[^0-9]/g, ''))}
            placeholder="20"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={4}
          />
        </Field>
        {error ? <Notice tone="danger" title="Something went wrong">{error}</Notice> : null}
        <Button label="Create Assessment & Get Code" icon="sparkles" onPress={submit} loading={submitting} />
      </Card>

      {mine.length > 0 ? (
        <>
          <SectionTitle>Your assessments</SectionTitle>
          <Card style={styles.list}>
            {mine.map((a, i) => (
              <View key={a.id} style={[styles.listRow, i > 0 && styles.listDivider]}>
                <IconCircle name="document-text" tint={colors.accentSoft} color={colors.accent} size={40} />
                <View style={styles.listText}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {a.title}
                  </Text>
                  <Text style={styles.listMeta} numberOfLines={1}>
                    {a.subject} · {QUARTER_LABELS[a.quarter]}
                  </Text>
                </View>
                <View style={styles.codePill}>
                  <Text style={styles.codePillText}>{a.code}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Chips<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{labels[option]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2, paddingTop: spacing.sm },
  eyebrow: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  title: { fontSize: 26, fontWeight: '800', color: colors.heading },
  subtitle: { fontSize: 15, color: colors.textMuted, lineHeight: 21 },
  codeHero: { alignItems: 'center' },
  codeLabel: { fontSize: 14, fontWeight: '600', color: colors.heroMuted },
  code: { fontSize: 54, fontWeight: '800', letterSpacing: 10, color: colors.primaryText, fontVariant: ['tabular-nums'] },
  codeHint: { fontSize: 15, color: colors.heroMuted, textAlign: 'center', lineHeight: 21 },
  form: { gap: spacing.md },
  formTitle: { fontSize: 18, fontWeight: '800', color: colors.heading },
  field: { gap: spacing.xs + 2 },
  label: { fontSize: 14, fontWeight: '700', color: colors.heading },
  input: {
    minHeight: MIN_TOUCH,
    backgroundColor: colors.inputFill,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    color: colors.text,
  },
  error: { fontSize: 14, color: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.inputFill,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.heading },
  chipTextSelected: { color: colors.primaryText },
  list: { gap: 0, paddingVertical: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: spacing.sm + 2 },
  listDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  listText: { flex: 1 },
  listTitle: { fontSize: 16, fontWeight: '700', color: colors.heading },
  listMeta: { fontSize: 13, color: colors.textMuted },
  codePill: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs + 2 },
  codePillText: { fontSize: 15, fontWeight: '800', color: colors.heading, letterSpacing: 1, fontVariant: ['tabular-nums'] },
});
