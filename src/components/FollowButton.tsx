import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Typography, Spacing } from '../theme';
import { useSocial } from '../context/SocialContext';
import { useAccount } from '../context/AccountContext';
import { useNavigation } from '@react-navigation/native';

type Props = {
  userId: string;
  compact?: boolean;
  style?: ViewStyle;
  onChange?: (following: boolean) => void;
};

export default function FollowButton({ userId, compact, style, onChange }: Props) {
  const { isFollowing, follow, unfollow, myUserId } = useSocial();
  const { isGuest } = useAccount();
  const navigation = useNavigation<any>();
  const [busy, setBusy] = useState(false);
  const following = isFollowing(userId);

  if (!userId || userId === myUserId) return null;

  const press = async () => {
    if (isGuest) {
      navigation.navigate('CreateAccount');
      return;
    }
    setBusy(true);
    try {
      if (following) {
        await unfollow(userId);
        onChange?.(false);
      } else {
        await follow(userId);
        onChange?.(true);
      }
    } catch (error: any) {
      Alert.alert(following ? 'Could not unfollow' : 'Could not follow', error?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, compact && styles.compact, following ? styles.following : styles.follow, style]}
      onPress={press}
      disabled={busy}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={following ? 'Following. Tap to unfollow' : 'Follow'}
    >
      {busy ? (
        <ActivityIndicator size="small" color={following ? Colors.textPrimary : Colors.white} />
      ) : (
        <Text style={[styles.text, following ? styles.followingText : styles.followText]}>
          {following ? 'Following' : 'Follow'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 104, minHeight: 36, paddingHorizontal: Spacing.base, borderRadius: BorderRadius.pill, alignItems: 'center', justifyContent: 'center' },
  compact: { minWidth: 92, minHeight: 32, paddingHorizontal: Spacing.md },
  follow: { backgroundColor: Colors.primary },
  following: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.cardBorder },
  text: { fontSize: Typography.fontSize.sm, fontWeight: '800' },
  followText: { color: Colors.white },
  followingText: { color: Colors.textPrimary },
});
