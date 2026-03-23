import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import CustomTabBar from '../components/CustomTabBar';

// Screens
import HomeScreen from '../screens/HomeScreen';
import StyleScreen from '../screens/StyleScreen';
import ShareScreen from '../screens/ShareScreen';
import AddItemScreen from '../screens/AddItemScreen';
import SaveScreen from '../screens/SaveScreen';
import SellScreen from '../screens/SellScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ClosetBrowseScreen from '../screens/ClosetBrowseScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import OutfitDetailScreen from '../screens/OutfitDetailScreen';

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
      <Tab.Screen name="Share" component={ShareScreen} />
      <Tab.Screen name="Add" component={AddItemScreen} />
      <Tab.Screen name="Save" component={SaveScreen} />
      <Tab.Screen name="Sell" component={SellScreen} />
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
          cardStyle: { backgroundColor: '#F5F0EB' },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="ClosetBrowse" component={ClosetBrowseScreen} />
        <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
        <Stack.Screen name="OutfitDetail" component={OutfitDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
