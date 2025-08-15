// components/FilterSelect.tsx
import { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  View
} from 'react-native';
import { supabase } from '../libs/superbase';

export function FilterSelect({
  value, onChange, label = 'Categoría', fullWidth = false
}: { value: string; onChange: (v:string)=>void; label?: string; fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>(['Todos']);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Trae todas las filas con types[], las aplanamos y deduplicamos en cliente
      const { data, error } = await supabase
        .from('restaurants')
        .select('types')
        .not('types', 'is', null);

      if (!error) {
        const all = (data || [])
          .flatMap((r:any) => (Array.isArray(r.types) ? r.types : []))
          .filter(Boolean);
        const unique = Array.from(new Set(all));
        if (alive) setOptions(['Todos', ...unique]);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <View style={{ minWidth: 150 }}>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          paddingVertical:12, paddingHorizontal:14,
          borderWidth:1, borderColor:'#ddd', borderRadius:12,
          backgroundColor:'#fff',
          width: fullWidth ? '100%' : undefined
        }}
      >
        <Text>{label}: {value} ▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
        <View
          style={{
            flex:1, backgroundColor:'#0006',
            justifyContent:'center', alignItems:'center', padding:16
          }}
        >
          <Pressable onPress={()=>setOpen(false)} style={{ position:'absolute', inset:0 }} />

          <View
            style={{
              width:'90%', maxWidth: 520, maxHeight:'70%',
              backgroundColor:'#fff', borderRadius:16,
              paddingVertical:12, paddingHorizontal:12,
              shadowColor:'#000', shadowOpacity:0.15, shadowRadius:14, elevation: Platform.OS === 'android' ? 6 : 0
            }}
          >
            <Text style={{ fontSize:16, fontWeight:'700', marginBottom:8 }}>
              Selecciona categoría
            </Text>

            <FlatList
              data={options}
              keyExtractor={(x)=>x}
              showsVerticalScrollIndicator
              ItemSeparatorComponent={()=> <View style={{ height:1, backgroundColor:'#eee' }} />}
              renderItem={({item})=>(
                <Pressable onPress={()=>{ onChange(item); setOpen(false); }} style={{ paddingVertical:12 }}>
                  <Text>{item}</Text>
                </Pressable>
              )}
              contentContainerStyle={{ paddingBottom:6 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
