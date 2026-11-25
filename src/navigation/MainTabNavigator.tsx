import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/DashboardScreen';
import { MembersScreen } from '../screens/MembersScreen';
import { LoansScreen } from '../screens/LoansScreen';
import { PaymentsScreen } from '../screens/PaymentsScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { FundScreen } from '../screens/FundScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { MainTabParamList } from './navigation.types';
import { theme } from '../constants/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginBottom: 4,
        },
        tabBarStyle: {
          // Let React Navigation calculate the bottom inset so the app tab bar
          // stays above Android's system navigation area (gesture or 3-button).
          minHeight: 64,
          paddingTop: 8,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Members" component={MembersScreen} />
      <Tab.Screen name="Loans" component={LoansScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Fund" component={FundScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
