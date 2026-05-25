import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { useApp } from '../data/AppContext';
import { authenticate } from '../data/authUtils';
import CFIcon from '../components/CFIcon';

interface Props {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: Props) {
  const { theme } = useApp();
  const [tried, setTried] = useState(false);

  const tryAuth = async () => {
    setTried(true);
    const ok = await authenticate('Finanzflow entsperren');
    if (ok) onUnlock();
  };

  useEffect(() => {
    // Direkt beim Mount versuchen
    tryAuth();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: theme.accent + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <CFIcon name="lock" size={40} color={theme.accent} stroke={2.4} />
      </View>
      <Text style={{ fontSize: 28, fontWeight: '700', color: theme.text, marginBottom: 8 }}>Finanzflow</Text>
      <Text style={{ fontSize: 14, color: theme.textMuted, textAlign: 'center', marginBottom: 40 }}>
        Deine Finanzdaten sind geschützt.{'\n'}Bitte authentifizieren.
      </Text>
      <TouchableOpacity onPress={tryAuth} style={{ height: 54, paddingHorizontal: 30, borderRadius: 16, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}>
        <CFIcon name="lock" size={18} color={theme.accentInk} stroke={2.6} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.accentInk }}>
          {tried ? 'Erneut versuchen' : 'Entsperren'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
