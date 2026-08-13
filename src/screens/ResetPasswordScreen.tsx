import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import ModTokLogo from '../components/ModTokLogo';

type ResetPasswordScreenProps = {
  onComplete: () => void;
};

export default function ResetPasswordScreen({ onComplete }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleUpdatePassword() {
    if (password.length < 6) {
      setErrorMessage('Your new password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    Alert.alert('Password updated', 'Your password has been changed. You are now signed in.', [
      { text: 'Continue', onPress: onComplete },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.content}>
          <ModTokLogo size="large" showTagline />
          <Text style={styles.title}>Create a new password</Text>
          <Text style={styles.subtitle}>Choose a new password for your ModTok account.</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.mediumGray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={Colors.mediumGray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <TouchableOpacity onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.mediumGray} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.mediumGray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={Colors.mediumGray}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword((value) => !value)} style={styles.eyeButton}>
              <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.mediumGray} />
            </TouchableOpacity>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdatePassword}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.buttonText}>Save new password</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  title: { marginTop: Spacing.xxl, fontSize: Typography.fontSize.xxl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.xxl, fontSize: Typography.fontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.cardBorder, marginBottom: Spacing.md, paddingHorizontal: Spacing.md, height: 52 },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  eyeButton: { padding: 4 },
  errorText: { color: '#D32F2F', fontSize: Typography.fontSize.sm, marginBottom: Spacing.sm, textAlign: 'center' },
  button: { height: 52, borderRadius: BorderRadius.pill, backgroundColor: Colors.black, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '700' },
});
