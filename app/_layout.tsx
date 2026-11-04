// app/_layout.tsx
import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { useFonts, InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans';
import { colors, spacing, radius, fonts } from '@/lib/theme';
import { supabase, empleadoActual } from '@/lib/supabase';
import { useAppStore } from '@/store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 2, retry: 1 } },
});

export default function RootLayout() {
  const { empleado, setEmpleado } = useAppStore();
  const [listo, setListo] = useState(false);
  const [fuentes] = useFonts({ InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold });

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
        {!listo || !fuentes ? (
          <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.gold} /></View>
        ) : !empleado ? (
          <Login />
        ) : (
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bgMid },
              headerTintColor: colors.text1,
              headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 16 },
              headerShadowVisible: false,
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

  const input = { height: 52, backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, color: colors.text1, paddingHorizontal: spacing.md, fontSize: 16, fontFamily: fonts.regular };
  const label = { color: colors.text2, fontSize: 12, fontFamily: fonts.medium, marginBottom: 6 };
  const deshabilitado = cargando || !email || !pass;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
      {/* Veta: franjas de madera oscura como cabecera */}
      <View style={{ height: 260, flexDirection: 'row', overflow: 'hidden' }}>
        {Array.from({ length: 24 }, (_, i) => (
          <View key={i} style={{ flex: i % 3 === 0 ? 1 : 2, backgroundColor: ['#141D26', '#1A2530', '#121A22', '#1E2A36'][i % 4] }} />
        ))}
        <View style={{ position: 'absolute', left: 28, bottom: 24, width: 56, height: 56, borderRadius: 16, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.onGold, fontSize: 26, fontFamily: fonts.bold }}>Z</Text>
        </View>
      </View>
      <View style={{ flex: 1, padding: 28, justifyContent: 'center', gap: spacing.md }}>
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={{ color: colors.text1, fontSize: 32, fontFamily: fonts.bold, letterSpacing: -0.5 }}>Zebrano</Text>
          <Text style={{ color: colors.text2, fontSize: 15, fontFamily: fonts.regular, marginTop: 4 }}>Ingresá con tu usuario del ERP</Text>
        </View>
        <View>
          <Text style={label}>Email</Text>
          <TextInput style={input} placeholder="nombre@zebrano.com.ar" placeholderTextColor={colors.text3} autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
        </View>
        <View>
          <Text style={label}>Contraseña</Text>
          <TextInput style={input} placeholderTextColor={colors.text3} secureTextEntry autoComplete="password" value={pass} onChangeText={setPass} onSubmitEditing={entrar} />
        </View>
        {!!error && <Text style={{ color: colors.red, fontFamily: fonts.regular }}>{error}</Text>}
        <TouchableOpacity
          onPress={entrar}
          disabled={deshabilitado}
          style={{ height: 54, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', opacity: deshabilitado ? 0.5 : 1, marginTop: spacing.xs }}
        >
          {cargando ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={{ color: colors.onPrimary, fontFamily: fonts.bold, fontSize: 16 }}>Entrar</Text>}
        </TouchableOpacity>
      </View>
      <Text style={{ color: colors.text3, fontSize: 12, fontFamily: fonts.regular, textAlign: 'center', paddingBottom: 36 }}>Solo para el equipo de Zebrano. Los usuarios se crean desde la web.</Text>
    </View>
  );
}
