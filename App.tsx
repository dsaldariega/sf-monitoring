import { NavigationContainer } from '@react-navigation/native';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initializeDatabase } from './src/database/database';

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName="sinking-fund-monitor.db"
        onInit={initializeDatabase}
      >
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
