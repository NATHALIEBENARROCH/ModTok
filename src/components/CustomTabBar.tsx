import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
  useWindowDimensions,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { Colors, Spacing, BorderRadius } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_ICONS: Record<
  string,
  {
    icon: string;
    lib: "Ionicons" | "MaterialCommunityIcons" | "Feather";
    label: string;
  }
> = {
  Home: { icon: "home", lib: "Ionicons", label: "Sort" },
  Style: { icon: "color-wand", lib: "Ionicons", label: "Style" },
  Share: { icon: "share-social", lib: "Ionicons", label: "Share" },
  Add: { icon: "plus", lib: "Feather", label: "Add" },
  Save: { icon: "bookmark", lib: "Ionicons", label: "Saved" },
  Sell: { icon: "pricetag", lib: "Ionicons", label: "Sell" },
  Profile: { icon: "person-circle", lib: "Ionicons", label: "Profile" },
};

function TabIcon({
  name,
  lib,
  color,
  size,
}: {
  name: string;
  lib: string;
  color: string;
  size: number;
}) {
  if (lib === "MaterialCommunityIcons") {
    return (
      <MaterialCommunityIcons name={name as any} size={size} color={color} />
    );
  }
  if (lib === "Feather") {
    return <Feather name={name as any} size={size} color={color} />;
  }
  return <Ionicons name={name as any} size={size} color={color} />;
}

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const maxTabWidth = Math.min(width - 40, 390);

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8, maxWidth: maxTabWidth, alignSelf: 'center' },
      ]}
    >
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const tabConfig = TAB_ICONS[route.name];

          if (!tabConfig) return null;

          const isAddButton = route.name === "Add";
          const iconColor = isFocused
            ? route.name === "Home"
              ? Colors.green
              : Colors.primary
            : Colors.white;
          const iconSize = isAddButton ? 22 : 20;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tab, isAddButton && styles.addTab]}
              activeOpacity={0.7}
            >
              {isAddButton ? (
                <View style={styles.addButton}>
                  <Feather name="plus" size={22} color={Colors.white} />
                </View>
              ) : (
                <View style={styles.tabContent}>
                  <TabIcon
                    name={tabConfig.icon}
                    lib={tabConfig.lib}
                    color={iconColor}
                    size={iconSize}
                  />
                  <Text style={[styles.tabLabel, { color: iconColor }]} numberOfLines={1}>
                    {tabConfig.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 16,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "700",
    letterSpacing: -0.15,
    maxWidth: 46,
    textAlign: "center",
  },
  addTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
