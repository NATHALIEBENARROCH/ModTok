import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { supabase } from '../lib/supabase';

type SettingsScreenProps = {
  navigation: any;
};

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const [privateAccount, setPrivateAccount] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    {
      title: 'How you use ModTok',
      items: [
        {
          icon: 'person-circle-outline',
          label: 'Edit profile',
          onPress: () => navigation.navigate('EditProfile'),
        },
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          toggle: true,
          value: notifications,
          onToggle: setNotifications,
        },
      ],
    },
    {
      title: 'Who can see your content',
      items: [
        {
          icon: 'lock-closed-outline',
          label: 'Account privacy',
          toggle: true,
          value: privateAccount,
          onToggle: setPrivateAccount,
          subtitle: privateAccount ? 'Private' : 'Public',
        },
        {
          icon: 'star-outline',
          label: 'Close Friends',
          onPress: () => {},
        },
        {
          icon: 'ban-outline',
          label: 'Blocked',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Your app and media',
      items: [
        {
          icon: 'language-outline',
          label: 'Language',
          onPress: () => {},
          value: 'English',
        },
        {
          icon: 'color-palette-outline',
          label: 'Appearance',
          onPress: () => {},
          value: 'Light',
        },
      ],
    },
    {
      title: 'More info and support',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'About',
          onPress: () => {},
        },
        {
          icon: 'help-circle-outline',
          label: 'Help',
          onPress: () => {},
        },
        {
          icon: 'document-text-outline',
          label: 'Privacy Policy',
          onPress: () => {},
        },
        {
          icon: 'newspaper-outline',
          label: 'Terms of Service',
          onPress: () => {},
        },
      ],
    },
  ];

  const filteredSections = searchQuery
    ? sections
        .map((s) => ({
          ...s,
          items: s.items.filter((i) =>
            i.label.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((s) => s.items.length > 0)
    : sections;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={Colors.mediumGray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={Colors.mediumGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Sections */}
        {filteredSections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[
                    styles.row,
                    ii < section.items.length - 1 && styles.rowBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={item.toggle ? 1 : 0.7}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={Colors.textPrimary}
                    style={styles.rowIcon}
                  />
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    {item.subtitle ? (
                      <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                    ) : null}
                    {item.value && !item.toggle ? (
                      <Text style={styles.rowValue}>{item.value}</Text>
                    ) : null}
                  </View>
                  {item.toggle ? (
                    <Switch
                      value={item.value as boolean}
                      onValueChange={item.onToggle}
                      trackColor={{ false: Colors.lightGray, true: Colors.primary }}
                      thumbColor={Colors.white}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={Colors.mediumGray} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Log Out */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert('Log Out', 'Are you sure you want to log out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
            ])
          }
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
  backBtn: {
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.base,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  section: {
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'none',
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  rowIcon: {
    marginRight: Spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    fontWeight: '400',
  },
  rowSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rowValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mediumGray,
    marginTop: 2,
  },
  logoutBtn: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.primary,
  },
});
