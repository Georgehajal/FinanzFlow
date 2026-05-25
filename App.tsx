import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/data/AppContext';
import AppNavigator from './src/navigation';
import LockScreen from './src/screens/LockScreen';

function Gate() {
  const { settings } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  if (settings.appLockEnabled && !unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }
  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Gate />
      </AppProvider>
    </SafeAreaProvider>
  );
}
