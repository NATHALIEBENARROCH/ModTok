import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";

import CustomTabBar from "../components/CustomTabBar";

// Screens
import HomeScreen from "../screens/HomeScreen";
import StyleScreen from "../screens/StyleScreen";
import ShareScreen from "../screens/ShareScreen";
import AddItemScreen from "../screens/AddItemScreen";
import SaveScreen from "../screens/SaveScreen";
import SellScreen from "../screens/SellScreen";
import SellItemPickerScreen from "../screens/SellItemPickerScreen";
import SellOutfitScreen from "../screens/SellOutfitScreen";
import SellerShippingScreen from "../screens/SellerShippingScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ClosetBrowseScreen from "../screens/ClosetBrowseScreen";
import ItemDetailScreen from "../screens/ItemDetailScreen";
import OutfitDetailScreen from "../screens/OutfitDetailScreen";
import SettingsScreen from "../screens/SettingsScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import MarketplaceScreen from "../screens/MarketplaceScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import OrdersScreen from "../screens/OrdersScreen";
import CreateAccountScreen from "../screens/CreateAccountScreen";
import { withAccount } from "../components/AccountRequired";

// Guests can use the whole wardrobe (add clothes, sort, style, save outfits) and browse the
// marketplace. These screens need a real account, so guests are asked to create one first.
const SellTab = withAccount(SellScreen, {
  icon: "pricetag-outline",
  title: "Sell from your closet",
  message: "Create a free account to list your clothes and get paid when they sell.",
});
const ShareTab = withAccount(ShareScreen, {
  icon: "share-social-outline",
  title: "Share your looks",
  message: "Create a free account to post stories and see what the ModTok community is wearing.",
});
const SellItemPickerGated = withAccount(SellItemPickerScreen, {
  icon: "pricetag-outline",
  title: "Sell from your closet",
  message: "Create a free account to list your clothes and get paid when they sell.",
});
const SellOutfitGated = withAccount(SellOutfitScreen, {
  icon: "pricetag-outline",
  title: "Sell a whole outfit",
  message: "Create a free account to list your looks and get paid when they sell.",
});
const SellerShippingGated = withAccount(SellerShippingScreen, {
  icon: "cube-outline",
  title: "Shipping & bundles",
  message: "Create a free account to set your ship-from address and bundle discounts.",
});
const CheckoutGated = withAccount(CheckoutScreen, {
  icon: "bag-handle-outline",
  title: "Almost yours",
  message: "Create a free account to buy, so we can send you your order and its tracking.",
});
const OrdersGated = withAccount(OrdersScreen, {
  icon: "cube-outline",
  title: "Your orders",
  message: "Create a free account to buy and sell. Your purchases and sales will show up here.",
});
const EditProfileGated = withAccount(EditProfileScreen, {
  icon: "person-outline",
  title: "Your profile",
  message: "Create a free account to choose your name and set up your profile.",
});

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Style" component={StyleScreen} />
      <Tab.Screen name="Save" component={SaveScreen} />
      <Tab.Screen name="Add" component={AddItemScreen} />
      <Tab.Screen name="Share" component={ShareTab} />
      <Tab.Screen name="Sell" component={SellTab} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: "#F5F0EB" },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="ClosetBrowse" component={ClosetBrowseScreen} />
        <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
        <Stack.Screen name="OutfitDetail" component={OutfitDetailScreen} />
        <Stack.Screen name="SellItemPicker" component={SellItemPickerGated} />
        <Stack.Screen name="SellOutfit" component={SellOutfitGated} />
        <Stack.Screen name="SellerShipping" component={SellerShippingGated} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileGated} />
        <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Checkout" component={CheckoutGated} />
        <Stack.Screen name="Orders" component={OrdersGated} />
        <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
