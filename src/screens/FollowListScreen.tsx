import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { PersonSummary, useSocial } from '../context/SocialContext';
import PersonRow from '../components/PersonRow';

export default function FollowListScreen({ navigation, route }: { navigation: any; route: any }) {
  const { userId, type, name } = route?.params ?? {};
  const { getFollowList } = useSocial();
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    getFollowList(userId, type === 'following' ? 'following' : 'followers')
      .then((list) => { if (active) { setPeople(list); setError(null); } })
      .catch((err) => { if (active) setError(err?.message ?? 'Could not load this list.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [getFollowList, type, userId]));

  const title = type === 'following' ? 'Following' : 'Followers';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{title}</Text>
          {!!name && <Text style={styles.headerSubtitle} numberOfLines={1}>{name}</Text>}
        </View>
        <View style={styles.headerBtn} />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.emptyText}>{error}</Text></View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={(person) => person.id}
          renderItem={({ item }) => <PersonRow person={item} onPress={() => navigation.push('UserProfile', { userId: item.id })} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{type === 'following' ? 'Not following anyone yet.' : 'No followers yet.'}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '800' },
  headerSubtitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, textAlign: 'center', lineHeight: 20 },
});
