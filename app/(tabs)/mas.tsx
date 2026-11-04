// app/(tabs)/mas.tsx — accesos secundarios y salir
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { colors, spacing, radius, fonts } from '@/lib/theme';

export default function MasScreen() {
  const router = useRouter();
  const empleado = useAppStore((s) => s.empleado);
  const filas: { icono: React.ComponentProps<typeof Feather>['name']; texto: string; ir: Href }[] = [
    { icono: 'folder', texto: 'Proyectos', ir: '/(tabs)/proyectos' },
    { icono: 'users', texto: 'Clientes', ir: '/(tabs)/clientes' },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep, padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md }}>
        <Text style={{ color: colors.text1, fontSize: 17, fontFamily: fonts.semibold }}>{empleado?.nombre}</Text>
        <Text style={{ color: colors.text2, fontSize: 13, fontFamily: fonts.regular, marginTop: 2, textTransform: 'capitalize' }}>{empleado?.rol}</Text>
      </View>
      <View style={{ backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' }}>
        {filas.map((f, i) => (
          <TouchableOpacity key={f.texto} onPress={() => router.push(f.ir)} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.md, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <Feather name={f.icono} size={20} color={colors.text2} />
            <Text style={{ flex: 1, color: colors.text1, fontSize: 15, fontFamily: fonts.medium }}>{f.texto}</Text>
            <Feather name="chevron-right" size={18} color={colors.text3} />
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={() => supabase.auth.signOut()} style={{ minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.red, fontSize: 15, fontFamily: fonts.semibold }}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
