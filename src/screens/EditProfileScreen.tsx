import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { CURRENT_USER } from '../data/mockData';

type EditProfileScreenProps = {
  navigation: any;
};

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const [name, setName] = useState(CURRENT_USER.displayName);
  const [username, setUsername] = useState(CURRENT_USER.username.replace('@', ''));
  const [bio, setBio] = useState(CURRENT_USER.bio);
  const [website, setWebsite] = useState('');
  const [gender, setGender] = useState('');

  const MAX_BIO = 150;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: CURRENT_USER.avatar }} style={styles.avatar} />
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.changePhotoText}>Change photo</Text>
          </TouchableOpacity>
        </View>

        {/* Fields */}
        <View style={styles.fieldsContainer}>

          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={Colors.mediumGray}
              returnKeyType="next"
            />
          </View>
          <View style={styles.divider} />

          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.fieldInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor={Colors.mediumGray}
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>
          <View style={styles.divider} />

          {/* Website */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Website</Text>
            <TextInput
              style={styles.fieldInput}
              value={website}
              onChangeText={setWebsite}
              placeholder="Website"
              placeholderTextColor={Colors.mediumGray}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="next"
            />
          </View>
          <View style={styles.divider} />

          {/* Bio */}
          <View style={[styles.fieldGroup, { alignItems: 'flex-start' }]}>
            <Text style={[styles.fieldLabel, { paddingTop: 4 }]}>Bio</Text>
            <View style={styles.bioWrapper}>
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={(t) => t.length <= MAX_BIO && setBio(t)}
                placeholder="Bio"
                placeholderTextColor={Colors.mediumGray}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.bioCount}>{bio.length} / {MAX_BIO}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Gender */}
          <TouchableOpacity style={styles.fieldGroup} activeOpacity={0.7}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldInput, { color: gender ? Colors.textPrimary : Colors.mediumGray }]}>
                {gender || 'Prefer not to say'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.mediumGray} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

        </View>

        {/* Switch to Professional Account */}
        <TouchableOpacity style={styles.proRow} activeOpacity={0.7}>
          <Text style={styles.proText}>Switch to Professional Account</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
  },
  doneBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.fontSize.sm,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    marginBottom: Spacing.base,
  },
  avatarWrapper: {
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  changePhotoText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.primary,
  },
  fieldsContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  fieldGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  fieldLabel: {
    width: 90,
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fieldInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  fieldRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bioWrapper: {
    flex: 1,
  },
  bioInput: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    minHeight: 80,
    paddingTop: 0,
  },
  bioCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mediumGray,
    textAlign: 'right',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginLeft: Spacing.base,
  },
  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  proText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.primary,
  },
});
