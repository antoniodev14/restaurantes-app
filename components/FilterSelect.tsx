// components/FilterSelect.tsx
import { useEffect, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { supabase } from '../libs/superbase';

export function FilterSelect({ value, onChange, label = 'Categoría', fullWidth = false }:{
  value: string; onChange:(v:string)=>void; label?: string; fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>(['Todos']);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from('restaurants').select('types').not('types','is',null);
      if (!error) {
        const all = (data || []).flatMap((r:any)=>Array.isArray(r.types)?r.types:[]);
        const unique = Array.from(new Set(all)).filter(Boolean).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
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
          borderRadius: 999, backgroundColor: Colors.pillBg,
          borderWidth: 1, borderColor: 'rgba(107,33,168,0.15)',
          width: fullWidth ? '100%' : undefined,
        }}
      >
        <Text style={{ color: Colors.pillText, fontWeight: '800' }}>{label}: {value} ▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
        <View style={{ flex:1, backgroundColor: "transparent", justifyContent:'center', alignItems:'center', padding:16 }}>
          <Pressable onPress={()=>setOpen(false)} style={{ position:'absolute', inset:0 }} />
          <View style={{
            width:'90%', maxWidth:520, maxHeight:'70%',
            backgroundColor: Colors.cardFilt, borderRadius:18,
            padding:12, borderWidth:1, borderColor: Colors.border,
            shadowColor:'#000', shadowOpacity:0.15, shadowRadius:14,
            elevation: Platform.OS === 'android' ? 6 : 0,
          }}>
            <Text style={{ fontSize:16, fontWeight:'900', marginBottom:8, color: Colors.textfltro }}>Selecciona categoría</Text>
            <FlatList
              data={options}
              keyExtractor={(x)=>x}
              ItemSeparatorComponent={()=> <View style={{ height:1, backgroundColor: Colors.border }} />}
              renderItem={({item})=>(
                <Pressable onPress={()=>{ onChange(item); setOpen(false); }} style={{ paddingVertical:12 }}>
                  <Text style={{ color: Colors.textfltro }}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
