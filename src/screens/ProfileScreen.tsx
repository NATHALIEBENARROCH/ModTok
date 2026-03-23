import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { CURRENT_USER, MOCK_CLOSET_ITEMS, MOCK_OUTFITS } from '../data/mockData';
import ClothingCard from '../components/ClothingCard';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - Spacing.base * 2 - Spacing.xs * 4) / 3;

const PROFILE_TABS = ['Closet', 'Outfits', 'Shared'];

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('Closet');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 36 }} />
          <Text style={styles.username}>{CURRENT_USER.username}</Text>
          <TouchableOpacity style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color={Colors.black} />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: CURRENT_USER.avatar }} style={styles.avatar} />
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Ionicons name="camera" size={14} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{CURRENT_USER.displayName}</Text>
            <Text style={styles.bio}>{CURRENT_USER.bio}</Text>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{CURRENT_USER.itemCount}</Text>
                <Text style={styles.statLabel}>Items</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{CURRENT_USER.outfitCount}</Text>
                <Text style={styles.statLabel}>Outfits</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{CURRENT_USER.followers.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{CURRENT_USER.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.editProfileBtn}>
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareProfileBtn}>
                <Feather name="share" size={16} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Premium Banner */}
        <View style={styles.premiumBanner}>
          <Ionicons name="sparkles" size={18} color={Colors.primary} />
          <View style={styles.premiumText}>
            <Text style={styles.premiumTitle}>Upgrade to ModTok Premium</Text>
            <Text style={styles.premiumSubtitle}>Unlimited outfits, AI styling, analytics & more</Text>
          </View>
          <TouchableOpacity style={styles.premiumBtn}>
            <Text style={styles.premiumBtnText}>Upgrade</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {PROFILE_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {activeTab === 'Closet' && (
          <View style={styles.grid}>
            {MOCK_CLOSET_ITEMS.map((item) => (
              <ClothingCard
                key={item.id}
                item={item}
                size="medium"
                showFavorite
              />
            ))}
          </View>
        )}

        {activeTab === 'Outfits' && (
          <View style={styles.outfitsGrid}>
            {MOCK_OUTFITS.map((outfit) => (
              <View key={outfit.id} style={styles.outfitCard}>
                <View style={styles.outfitImages}>
                  {outfit.items.slice(0, 2).map((item) => (
                    <Image
                      key={item.id}
                      source={{ uri: item.image }}
                      style={styles.outfitThumb}
                      resizeMode="contain"
                    />
                  ))}
                </View>
                <Text style={styles.outfitName} numberOfLines={1}>{outfit.name}</Text>
                <Text style={styles.outfitOccasion}>{outfit.occasion}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'Shared' && (
          <View style={styles.emptyState}>
            <Ionicons name="share-social-outline" size={48} color={Colors.mediumGray} />
            <Text style={styles.emptyTitle}>No Shared Outfits</Text>
            <Text style={styles.emptySubtitle}>Share your outfits to build your following.</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  username: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    gap: Spacing.base,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  bio: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Typography.fontSize.base,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.cardBorder,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editProfileBtn: {
    flex: 1,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  editProfileText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  shareProfileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    gap: Spacing.sm,
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  premiumSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  premiumBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  premiumBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.fontSize.xs,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 7,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  activeTab: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  activeTabText: {
    color: Colors.white,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
  },
  outfitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  outfitCard: {
    width: (width - Spacing.base * 2 - Spacing.md) / 2,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  outfitImages: {
    flexDirection: 'row',
    height: 80,
    marginBottom: Spacing.xs,
  },
  outfitThumb: {
    flex: 1,
    height: 80,
  },
  outfitName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  outfitOccasion: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xxxl,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
