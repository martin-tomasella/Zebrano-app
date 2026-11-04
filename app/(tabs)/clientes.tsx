// app/(tabs)/clientes.tsx
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { db } from '@/lib/supabase';
import { colors, spacing, radius } from '@/lib/theme';

export default function ClientesScreen() {
  const router = useRouter();
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => db.clientes.list().then(r => r.data ?? []),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
      <FlatList
        data={data ?? []}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ fontSize: 22, fontFamily: 'InstrumentSans_600SemiBold', color: colors.text1 }}>Clientes</Text>
            <TouchableOpacity style={{ backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ color: colors.bgDeep, fontSize: 13, fontFamily: 'InstrumentSans_600SemiBold' }}>+ Nuevo</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>○</Text>
            <Text style={{ color: colors.text1, fontSize: 16, fontFamily: 'InstrumentSans_600SemiBold' }}>Sin clientes aún</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            onPress={() => router.push(`/cliente/${item.id}`)}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teak, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'InstrumentSans_600SemiBold' }}>{item.nombre[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: 'InstrumentSans_600SemiBold', color: colors.text1 }}>{item.nombre}</Text>
              <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>{item.telefono ?? '—'}</Text>
            </View>
            <View style={{ backgroundColor: `${colors.text3}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
              <Text style={{ fontSize: 10, color: colors.text3 }}>{item.origen_lead}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
