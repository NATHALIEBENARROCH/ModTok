import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { PersonSummary, avatarFor, personHandle, personName } from '../context/SocialContext';
import FollowButton from './FollowButton';

type Props = {
  person: PersonSummary;
  onPress: () => void;
};

export default function PersonRow({ person, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: avatarFor(person) }} style={styles.avatar} />
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>{personName(person)}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[personHandle(person), `${person.followers} follower${person.followers === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <FollowButton userId={person.id} compact />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.cardBorder },
  copy: { flex: 1 },
  name: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  meta: { marginTop: 2, color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
});
