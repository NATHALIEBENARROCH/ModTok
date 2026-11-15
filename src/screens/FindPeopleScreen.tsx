import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { PersonSummary, useSocial } from '../context/SocialContext';
import PersonRow from '../components/PersonRow';

export default function FindPeopleScreen({ navigation }: { navigation: any }) {
  const { searchPeople } = useSocial();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const people = await searchPeople(term);
        if (id !== requestId.current) return;
        setResults(people);
        setError(null);
      } catch (err: any) {
        if (id !== requestId.current) return;
        setError(err?.message ?? 'Could not search right now.');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, term ? 300 : 0);
    return () => clearTimeout(timer);
  }, [searchPeople, term]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find people</Text>
        <View style={styles.headerBtn} />
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={Colors.mediumGray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or @username"
          placeholderTextColor={Colors.mediumGray}
          value={term}
          onChangeText={setTerm}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="search"
        />
        {!!term && (
          <TouchableOpacity onPress={() => setTerm('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={Colors.mediumGray} />
          </TouchableOpacity>
        )}
      </View>
      {!term && <Text style={styles.sectionTitle}>Suggested for you</Text>}
      {loading && results.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.emptyText}>{error}</Text></View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(person) => person.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <PersonRow person={item} onPress={() => navigation.push('UserProfile', { userId: item.id })} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {term ? 'No one found. Check the spelling or try their @username.' : 'No suggestions yet. Search for a friend by name or @username.'}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 60 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '800' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.base, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, minHeight: 44, backgroundColor: Colors.white, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.cardBorder },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.fontSize.base, paddingVertical: Spacing.sm },
  sectionTitle: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.xs, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, textAlign: 'center', lineHeight: 20 },
});
