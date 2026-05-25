import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CFIcon from '../components/CFIcon';
import { useApp } from '../data/AppContext';

import DashboardScreen from '../screens/DashboardScreen';
import ManageScreen from '../screens/ManageScreen';
import ListScreen from '../screens/ListScreen';
import ItemEditScreen from '../screens/ItemEditScreen';
import CashScreen from '../screens/CashScreen';
import YearScreen from '../screens/YearScreen';
import PropertyListScreen from '../screens/PropertyListScreen';
import PropertyEditScreen from '../screens/PropertyEditScreen';
import PropertyDetailScreen from '../screens/PropertyDetailScreen';
import KreditPlanEditScreen from '../screens/KreditPlanEditScreen';
import MietperiodenScreen from '../screens/MietperiodenScreen';
import SonderbuchungScreen from '../screens/SonderbuchungScreen';
import LaufendeKostenScreen from '../screens/LaufendeKostenScreen';
import BargeldListScreen from '../screens/BargeldListScreen';
import KontenScreen from '../screens/KontenScreen';
import KontoEditScreen from '../screens/KontoEditScreen';
import SteuerHomeScreen from '../screens/SteuerHomeScreen';
import SteuerListScreen from '../screens/SteuerListScreen';
import SteuerEditScreen from '../screens/SteuerEditScreen';
import SteuerExportScreen from '../screens/SteuerExportScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ExportScreen from '../screens/ExportScreen';
import PropertyExportScreen from '../screens/PropertyExportScreen';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

type TabItem = { key: string; label: string; icon: any; center?: boolean };

const TAB_ITEMS: TabItem[] = [
  { key: 'Home',   label: 'Übersicht', icon: 'home'    },
  { key: 'Manage', label: 'Verwalten', icon: 'list'    },
  { key: 'Cash',   label: '',          icon: 'plus', center: true },
  { key: 'Year',   label: 'Jahr',      icon: 'chart'   },
  { key: 'More',   label: 'Mehr',      icon: 'sliders' },
];

function CustomTabBar({ state, navigation }: any) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const routeNames: string[] = state.routes.map((r: any) => r.name);

  return (
    <View style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingBottom: Math.max(insets.bottom, 8) + 2, paddingTop: 10,
      flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.bg, opacity: 0.97 }} />
      {TAB_ITEMS.map(tab => {
        if (tab.center) {
          return (
            <TouchableOpacity
              key="cash"
              onPress={() => navigation.navigate('Cash')}
              style={{
                width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accent,
                alignItems: 'center', justifyContent: 'center', marginTop: -10,
                shadowColor: theme.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
              }}
            >
              <CFIcon name="coin" size={26} color={theme.accentInk} stroke={2.4} />
            </TouchableOpacity>
          );
        }
        const routeIndex = routeNames.indexOf(tab.key);
        const isActive = state.index === routeIndex;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => { if (routeIndex >= 0) navigation.navigate(tab.key); }}
            style={{ alignItems: 'center', gap: 2, minWidth: 58 }}
          >
            <CFIcon name={tab.icon} size={22} color={isActive ? theme.text : theme.textMuted} stroke={isActive ? 2.4 : 2} />
            {tab.label ? (
              <Text style={{ fontSize: 10, fontWeight: isActive ? '600' : '500', color: isActive ? theme.text : theme.textMuted }}>
                {tab.label}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator tabBar={props => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Manage" component={ManageScreen} />
      <Tab.Screen name="Year" component={YearScreen} />
      <Tab.Screen name="More" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useApp();
  const navTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: theme.bg, card: theme.surface, text: theme.text, border: theme.border },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen name="List" component={ListScreen} />
        <RootStack.Screen name="PropertyList" component={PropertyListScreen} />
        <RootStack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
        <RootStack.Screen name="ItemEdit" component={ItemEditScreen} options={{ presentation: 'modal', gestureEnabled: true }} />
        <RootStack.Screen name="Cash" component={CashScreen} options={{ presentation: 'modal', gestureEnabled: true }} />
        <RootStack.Screen name="PropertyEdit" component={PropertyEditScreen} options={{ presentation: 'modal', gestureEnabled: true }} />
        <RootStack.Screen name="KreditPlanEdit" component={KreditPlanEditScreen} options={{ presentation: 'modal', gestureEnabled: true }} />
        <RootStack.Screen name="Mietperioden" component={MietperiodenScreen} options={{ presentation: 'modal', gestureEnabled: true }} />
        <RootStack.Screen name="Sonderbuchung" component={SonderbuchungScreen} options={{ presentation: 'modal', gestureEnabled: true }} />
        <RootStack.Screen name="LaufendeKosten" component={LaufendeKostenScreen} options={{ presentation: 'modal', gestureEnabled: true }} />
        <RootStack.Screen name="BargeldList" component={BargeldListScreen} />
        <RootStack.Screen name="Konten" component={KontenScreen} />
        <RootStack.Screen name="KontoEdit" component={KontoEditScreen} options={{ presentation: 'modal', gestureEnabled: true }} />
        <RootStack.Screen name="SteuerHome" component={SteuerHomeScreen} />
        <RootStack.Screen name="SteuerList" component={SteuerListScreen} />
        <RootStack.Screen name="SteuerEdit" component={SteuerEditScreen} options={{ presentation: 'modal', gestureEnabled: true }} />
        <RootStack.Screen name="SteuerExport" component={SteuerExportScreen} options={{ presentation: 'modal', gestureEnabled: true }} />
        <RootStack.Screen name="Export" component={ExportScreen} options={{ presentation: 'modal', gestureEnabled: true }} />
        <RootStack.Screen name="PropertyExport" component={PropertyExportScreen} options={{ presentation: 'modal', gestureEnabled: true }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
