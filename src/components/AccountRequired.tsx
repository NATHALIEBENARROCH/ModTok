import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../theme';
import { useAccount } from '../context/AccountContext';
import CreateAccountPanel from './CreateAccountPanel';

type Copy = { icon: string; title: string; message: string };

// Shown in place of a screen that needs a real account (buying, selling, sharing, orders)
// when someone is using ModTok as a guest. The wardrobe itself never needs an account.
export function AccountRequired({ icon, title, message, onDone }: Copy & { onDone?: () => void }) {
  const navigation = useNavigation<any>();
  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          {canGoBack ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.iconCircle}>
            <Ionicons name={icon as any} size={30} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <CreateAccountPanel onDone={onDone} />
          <View style={{ height: 90 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function withAccount<P extends object>(Screen: React.ComponentType<P>, copy: Copy) {
  function AccountGatedScreen(props: P) {
    const { isGuest } = useAccount();
    if (isGuest) return <AccountRequired {...copy} />;
    return <Screen {...props} />;
  }
  return AccountGatedScreen;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, alignItems: 'center' },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
});
