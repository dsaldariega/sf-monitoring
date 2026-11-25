import { NavigationContainer } from '@react-navigation/native';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initializeDatabase } from './src/database/database';
import { ToastProvider } from './src/components/ToastProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <SQLiteProvider
        databaseName="sinking-fund-monitor.db"
        onInit={initializeDatabase}
      >
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
        </SQLiteProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
