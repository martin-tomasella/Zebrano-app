// app/_layout.tsx — raíz: tema, foto de fondo, sesión de empleado y login sobre la foto (como la web).
import { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans';
import { Image } from 'expo-image';
import { TemaProvider, useTema, fonts, spacing } from '@/lib/theme';
import { supabase, empleadoActual } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { Fondo, Vidrio, T, Campo, Boton, Aviso } from '@/components/ui';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 1000 * 60, retry: 1 } } });

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TemaProvider>
        <QueryClientProvider client={queryClient}>
          <Raiz />
        </QueryClientProvider>
      </TemaProvider>
    </GestureHandlerRootView>
  );
}

function Raiz() {
  const { c, oscuro } = useTema();
  const { empleado, setEmpleado } = useAppStore();
  const [listo, setListo] = useState(false);
  const [fuentes] = useFonts({ InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold });

  useEffect(() => {
    // La sesión queda guardada en SecureStore: al abrir la app se recupera sola.
    (async () => {
      const e = await empleadoActual();
      if (!e) await supabase.auth.signOut();
      setEmpleado(e);
      setListo(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === 'SIGNED_OUT') { setEmpleado(null); queryClient.clear(); }
    });
    return () => sub.subscription.unsubscribe();
  }, [setEmpleado]);

  // Las pantallas son transparentes: se ve la foto de fondo con el velo.
  const base = oscuro ? DarkTheme : DefaultTheme;
  const navTema = { ...base, colors: { ...base.colors, background: 'transparent', card: c.vidrioFuerte, text: c.texto, border: c.linea, primary: c.primario } };

  return (
    <View style={{ flex: 1, backgroundColor: c.respaldo }}>
      <Fondo />
      <StatusBar style={oscuro ? 'light' : 'dark'} />
      {!listo || !fuentes ? (
        <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={c.primario} /></View>
      ) : !empleado ? (
        <Login />
      ) : (
        <ThemeProvider value={navTema}>
          <Stack screenOptions={{
            headerTransparent: false,
            headerStyle: { backgroundColor: c.vidrioFuerte },
            headerTintColor: c.texto,
            headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'slide_from_right',
          }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="nuevo-trabajo" options={{ title: 'Nuevo trabajo' }} />
            <Stack.Screen name="ot/[id]" options={{ title: 'Orden de trabajo' }} />
            <Stack.Screen name="clientes" options={{ title: 'Clientes y obras' }} />
            <Stack.Screen name="cliente/[id]" options={{ title: 'Cliente' }} />
            <Stack.Screen name="prospectos" options={{ title: 'Prospectos' }} />
            <Stack.Screen name="cotizaciones" options={{ title: 'Cotizaciones' }} />
            <Stack.Screen name="prospeccion" options={{ title: 'Prospección' }} />
            <Stack.Screen name="asistente" options={{ title: 'Asistente del cotizador' }} />
          </Stack>
        </ThemeProvider>
      )}
    </View>
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
    if (e) { setCargando(false); setError('El email o la contraseña no coinciden. Revisalos e intentá de nuevo.'); return; }
    const emp = await empleadoActual();
    setCargando(false);
    if (!emp) { await supabase.auth.signOut(); setError('Tu usuario no está habilitado como empleado. Pedile acceso a un administrador.'); return; }
    setEmpleado(emp);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
      <Vidrio fuerte style={{ padding: 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Image source={require('../src/assets/icon.png')} style={{ width: 44, height: 44, borderRadius: 12 }} accessibilityLabel="Logo de Zebrano" />
          <T v="h2">Zebrano</T>
        </View>
        <View>
          <T v="titulo" style={{ fontSize: 24 }}>Ingresá a tu cuenta</T>
          <T v="chico" style={{ marginTop: 4 }}>Usá el email con el que te dieron de alta.</T>
        </View>
        <Campo etiqueta="Email" placeholder="nombre@zebrano.com.ar" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
        <Campo etiqueta="Contraseña" placeholder="••••••••" secureTextEntry autoComplete="password" value={pass} onChangeText={setPass} onSubmitEditing={entrar} />
        {!!error && <Aviso texto={error} />}
        <Boton texto={cargando ? 'Ingresando…' : 'Ingresar'} onPress={entrar} cargando={cargando} disabled={!email || !pass} style={{ marginTop: 6 }} />
      </Vidrio>
      <T v="chico" style={{ textAlign: 'center', marginTop: 16 }}>Zebrano · Muebles a medida · Buenos Aires</T>
    </KeyboardAvoidingView>
  );
}
