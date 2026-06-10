import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  useWindowDimensions,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { Colors, Spacing, BorderRadius, Typography } from "../theme";
import { MOCK_CLOSET_ITEMS, SocialPost } from "../data/mockData";
import { useOutfits } from "../context/OutfitContext";


function SocialCard({
  post,
  onLike,
}: {
  post: SocialPost;
  onLike: (id: string) => void;
}) {
  return (
    <View style={styles.card}>
      {/* User Header */}
      <View style={styles.cardHeader}>
        <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{post.username}</Text>
          <Text style={styles.timestamp}>{post.timestamp}</Text>
        </View>
        <TouchableOpacity style={styles.followBtn}>
          <Text style={styles.followBtnText}>Follow</Text>
        </TouchableOpacity>
      </View>

      {/* Outfit Items */}
      <View style={styles.outfitContainer}>
        {post.outfit.items.slice(0, 3).map((item, index) => (
          <View key={item.id} style={styles.outfitSlot}>
            <View style={styles.outfitCategoryLabel}>
              <Text style={styles.outfitCategoryText}>{item.category}</Text>
            </View>
            <View style={styles.outfitItemCard}>
              <Image
                source={{ uri: item.image }}
                style={styles.outfitItemImage}
                resizeMode="contain"
              />
            </View>
          </View>
        ))}
      </View>

      {/* Caption */}
      <Text style={styles.caption}>{post.caption}</Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => onLike(post.id)}
          style={styles.actionBtn}
        >
          <Ionicons
            name={post.isLiked ? "heart" : "heart-outline"}
            size={22}
            color={post.isLiked ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.actionCount,
              post.isLiked && { color: Colors.primary },
            ]}
          >
            {post.likes}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={Colors.textSecondary}
          />
          <Text style={styles.actionCount}>{post.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons
            name="bookmark-outline"
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Feather name="share" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ShareScreen() {
  const { socialPosts: posts, toggleLike: handleLike } = useOutfits();
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.title}>Share</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="search" size={22} color={Colors.black} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Story Row */}
      <View style={styles.storyRow}>
        <TouchableOpacity style={styles.storyAdd}>
          <View style={styles.storyAddInner}>
            <Ionicons name="add" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.storyLabel}>Your Story</Text>
        </TouchableOpacity>
        {["@stylebyemma", "@fashionbysophia", "@minimalistmia"].map(
          (user, i) => (
            <TouchableOpacity key={i} style={styles.storyItem}>
              <View style={styles.storyRing}>
                <Image
                  source={{
                    uri: `https://images.unsplash.com/photo-${i === 0 ? "1494790108377-be9c29b29330" : i === 1 ? "1438761681033-6461ffad8d80" : "1544005313-94ddf0286df2"}?w=60&h=60&fit=crop&crop=face`,
                  }}
                  style={styles.storyAvatar}
                />
              </View>
              <Text style={styles.storyLabel} numberOfLines={1}>
                {user.replace("@", "")}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SocialCard post={item} onLike={handleLike} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: Typography.fontSize.xl,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  headerRight: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  storyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  storyAdd: {
    alignItems: "center",
    width: 60,
  },
  storyAddInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  storyItem: {
    alignItems: "center",
    width: 60,
  },
  storyRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  storyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  storyLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
    width: 60,
  },
  list: {
    paddingHorizontal: Spacing.base,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.base,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  username: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  timestamp: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  followBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  followBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSize.xs,
    fontWeight: "600",
  },
  outfitContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  outfitSlot: {
    marginBottom: Spacing.sm,
  },
  outfitCategoryLabel: {
    alignSelf: "center",
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    marginBottom: Spacing.xs,
  },
  outfitCategoryText: {
    color: Colors.white,
    fontSize: Typography.fontSize.xs,
    fontWeight: "700",
  },
  outfitItemCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  outfitItemImage: {
    width: 80,
    height: 90,
  },
  caption: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: Spacing.sm,
    gap: Spacing.base,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionCount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
});
