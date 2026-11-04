// app/_layout.tsx
import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { colors, spacing, radius } from '@/lib/theme';
import { supabase, empleadoActual } from '@/lib/supabase';
import { useAppStore } from '@/store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 2, retry: 1 } },
});

export default function RootLayout() {
  const { empleado, setEmpleado } = useAppStore();
  const [listo, setListo] = useState(false);

  useEffect(() => {
    // La sesión queda guardada en SecureStore: al abrir la app se recupera sola.
    const verificar = async () => {
      const e = await empleadoActual();
      if (!e) await supabase.auth.signOut();
      setEmpleado(e);
      setListo(true);
    };
    verificar();
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === 'SIGNED_OUT') { setEmpleado(null); queryClient.clear(); }
    });
    return () => sub.subscription.unsubscribe();
  }, [setEmpleado]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgDeep }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor={colors.bgDeep} />
        {!listo ? (
          <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.gold} /></View>
        ) : !empleado ? (
          <Login />
        ) : (
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bgMid },
              headerTintColor: colors.text1,
              headerTitleStyle: { fontFamily: 'Syne_600SemiBold', fontSize: 16 },
              contentStyle: { backgroundColor: colors.bgDeep },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="cotizador/[sesionId]" options={{ title: 'Cotización' }} />
          </Stack>
        )}
        <Toast />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function Login() {
  const setEmpleado = useAppStore((s) => s.setEmpleado);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    setCargando(true); setError('');
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pass });
    if (e) { setCargando(false); setError('Email o contraseña incorrectos'); return; }
    const emp = await empleadoActual();
    if (!emp) { await supabase.auth.signOut(); setCargando(false); setError('Tu usuario no está habilitado como empleado. Pedile acceso a un administrador.'); return; }
    setCargando(false);
    setEmpleado(emp);
  }

  const input = { backgroundColor: colors.bgCard, borderColor: colors.borderMid, borderWidth: 1, borderRadius: radius.md, color: colors.text1, padding: spacing.md, fontSize: 15 };
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md }}>
      <Text style={{ color: colors.gold, fontSize: 28, fontWeight: '700', marginBottom: spacing.sm }}>Zebrano</Text>
      <Text style={{ color: colors.text2, marginBottom: spacing.md }}>Ingresá con tu usuario del ERP</Text>
      <TextInput style={input} placeholder="Email" placeholderTextColor={colors.text3} autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
      <TextInput style={input} placeholder="Contraseña" placeholderTextColor={colors.text3} secureTextEntry autoComplete="password" value={pass} onChangeText={setPass} onSubmitEditing={entrar} />
      {!!error && <Text style={{ color: colors.red }}>{error}</Text>}
      <TouchableOpacity
        onPress={entrar}
        disabled={cargando || !email || !pass}
        style={{ backgroundColor: colors.gold, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', opacity: cargando || !email || !pass ? 0.5 : 1 }}
      >
        {cargando ? <ActivityIndicator color={colors.bgDeep} /> : <Text style={{ color: colors.bgDeep, fontWeight: '700', fontSize: 15 }}>Entrar</Text>}
      </TouchableOpacity>
    </View>
  );
}
