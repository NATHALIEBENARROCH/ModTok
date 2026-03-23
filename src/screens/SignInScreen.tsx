import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ModTokLogo from '../components/ModTokLogo';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';

interface SignInScreenProps {
  onSignIn: () => void;
}

export default function SignInScreen({ onSignIn }: SignInScreenProps) {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <ModTokLogo size="large" showTagline />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {!isSignIn && (
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

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.mediumGray} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={Colors.mediumGray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.mediumGray}
                />
              </TouchableOpacity>
            </View>

            {isSignIn && (
              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Primary Button */}
            <TouchableOpacity style={styles.primaryBtn} onPress={onSignIn}>
              <Text style={styles.primaryBtnText}>
                {isSignIn ? 'Sign In' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Auth */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} onPress={onSignIn}>
                <Ionicons name="logo-apple" size={20} color={Colors.black} />
                <Text style={styles.socialBtnText}>Apple</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn} onPress={onSignIn}>
                <Ionicons name="logo-google" size={20} color={Colors.black} />
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>
            </View>

            {/* Toggle Sign In / Sign Up */}
            <TouchableOpacity
              onPress={() => setIsSignIn(!isSignIn)}
              style={styles.toggleBtn}
            >
              <Text style={styles.toggleText}>
                {isSignIn ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.toggleLink}>
                  {isSignIn ? 'Create account' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
    marginTop: Spacing.xxxl,
  },
  form: {
    width: '100%',
  },
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
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  eyeBtn: {
    padding: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.base,
  },
  forgotText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.cardBorder,
  },
  dividerText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginHorizontal: Spacing.md,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    height: 48,
    gap: Spacing.sm,
  },
  socialBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  toggleBtn: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  toggleText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  toggleLink: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
