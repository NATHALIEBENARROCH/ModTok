import React, { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useCloset } from '../context/ClosetContext';

// Turns a guest into a full account. The guest's wardrobe and outfits stay with them,
// because the same profile simply gets an email and password added to it.
export default function CreateAccountPanel({ onDone }: { onDone?: () => void }) {
  const { totalItems } = useCloset();
  const [mode, setMode] = useState<'create' | 'signin'>('create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // If an email confirmation is already waiting (for example the app was closed), show that step.
    supabase.auth.getUser().then(({ data }) => {
      const waiting = (data.user as any)?.new_email;
      if (waiting) {
        setPendingEmail(waiting);
        setEmail(waiting);
      }
    });
  }, []);

  async function finishAccount(cleanEmail: string) {
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) throw passwordError;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Best effort: give the profile a real name. Ignore a taken username.
      await supabase
        .from('profiles')
        .update({ username: '@' + cleanEmail.split('@')[0], display_name: name.trim() || cleanEmail.split('@')[0] })
        .eq('id', user.id);
    }
    await supabase.auth.refreshSession();
    Alert.alert('Welcome to ModTok!', 'Your account is ready, and your wardrobe and outfits are saved to it.');
    onDone?.();
  }

  function validatePasswords() {
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return false;
    }
    return true;
  }

  async function createAccount() {
    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim()) return setErrorMsg('Please enter your name.');
    if (!cleanEmail) return setErrorMsg('Please enter your email.');
    if (!validatePasswords()) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.updateUser(
        { email: cleanEmail, data: { display_name: name.trim() } },
        { emailRedirectTo: Linking.createURL('account-confirmed') },
      );
      if (error) throw error;

      if (data.user?.email?.toLowerCase() === cleanEmail) {
        await finishAccount(cleanEmail);
      } else {
        setPendingEmail(cleanEmail);
      }
    } catch (error: any) {
      setErrorMsg(error?.message || 'We could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function checkConfirmed() {
    if (!validatePasswords()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      const confirmedEmail = data.user?.email?.toLowerCase();
      if (confirmedEmail && confirmedEmail === pendingEmail.toLowerCase()) {
        await finishAccount(confirmedEmail);
      } else {
        setErrorMsg('We have not seen the confirmation yet. Tap the link in the email, then try again.');
      }
    } catch (error: any) {
      setErrorMsg(error?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function signIn() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return setErrorMsg('Please enter your email and password.');
    const go = async () => {
      setLoading(true);
      setErrorMsg('');
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      setLoading(false);
      if (error) setErrorMsg(error.message);
      else onDone?.();
    };
    if (totalItems > 0) {
      Alert.alert(
        'Sign in to another account?',
        'The items you added as a guest stay on this guest profile and will not move to that account. To keep them, create a new account instead.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: go },
        ],
      );
    } else {
      go();
    }
  }

  const passwordFields = (
    <>
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={18} color={Colors.mediumGray} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.mediumGray}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.mediumGray} />
        </TouchableOpacity>
      </View>
      {mode === 'create' && (
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={18} color={Colors.mediumGray} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={Colors.mediumGray}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
          />
        </View>
      )}
    </>
  );

  if (pendingEmail) {
    return (
      <View style={styles.form}>
        <Text style={styles.pendingText}>
          We sent a link to <Text style={styles.bold}>{pendingEmail}</Text>. Tap it to confirm your email, then come back
          here, choose your password, and tap Finish.
        </Text>
        {passwordFields}
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={checkConfirmed} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>Finish</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setPendingEmail(''); setErrorMsg(''); }} style={styles.toggleBtn}>
          <Text style={styles.toggleLink}>Use a different email</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      {mode === 'create' && (
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={18} color={Colors.mediumGray} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={Colors.mediumGray}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>
      )}
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={18} color={Colors.mediumGray} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.mediumGray}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      {passwordFields}

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
        onPress={mode === 'create' ? createAccount : signIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.primaryBtnText}>{mode === 'create' ? 'Create Free Account' : 'Sign In'}</Text>
        )}
      </TouchableOpacity>

      {mode === 'create' && totalItems > 0 && (
        <Text style={styles.keepText}>Your {totalItems} {totalItems === 1 ? 'item' : 'items'} and outfits come with you.</Text>
      )}

      <TouchableOpacity
        onPress={() => { setMode(mode === 'create' ? 'signin' : 'create'); setErrorMsg(''); }}
        style={styles.toggleBtn}
      >
        <Text style={styles.toggleText}>
          {mode === 'create' ? 'Already have an account? ' : 'New to ModTok? '}
          <Text style={styles.toggleLink}>{mode === 'create' ? 'Sign In' : 'Create account'}</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { width: '100%' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  eyeBtn: { padding: 4 },
  primaryBtn: {
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.base,
  },
  primaryBtnText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '700', letterSpacing: 0.3 },
  keepText: { textAlign: 'center', color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginBottom: Spacing.base },
  toggleBtn: { alignItems: 'center', paddingBottom: Spacing.xl },
  toggleText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  toggleLink: { color: Colors.primary, fontWeight: '700', fontSize: Typography.fontSize.sm },
  pendingText: { fontSize: Typography.fontSize.base, color: Colors.textPrimary, lineHeight: 22, marginBottom: Spacing.base },
  bold: { fontWeight: '700' },
  errorText: { color: '#D32F2F', fontSize: Typography.fontSize.sm, marginBottom: Spacing.sm, textAlign: 'center' },
});
