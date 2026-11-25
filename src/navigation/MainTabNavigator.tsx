import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/DashboardScreen';
import { MembersScreen } from '../screens/MembersScreen';
import { LoansScreen } from '../screens/LoansScreen';
import { PaymentsScreen } from '../screens/PaymentsScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { FundScreen } from '../screens/FundScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { MainTabParamList } from './navigation.types';
import { MainTabBar } from './MainTabBar';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      tabBar={(props) => <MainTabBar {...props} />}
      screenOptions={{
        headerShown: false,
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
