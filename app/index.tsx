import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text, TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CitySelect } from '../components/CitySelect';
import { FilterSelect } from '../components/FilterSelect';
import { RestaurantCard } from '../components/RestaurantCard';
import { Colors } from '../constants/Colors';
import { supabase } from '../libs/superbase';

function useDebounce<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

export default function Home() {
  const insets = useSafeAreaInsets();

  const [q, setQ] = useState('');
  const qd = useDebounce(q, 250);
  const [cat, setCat] = useState('Todos');
  const [city, setCity] = useState('Todas');

  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [suggestEnabled, setSuggestEnabled] = useState(true);
  const sugLimit = 6;
  const inputRef = useRef<TextInput>(null);

  // Pinta la barra de navegación de Android acorde al degradado
  useEffect(() => {
    NavigationBar.setBackgroundColorAsync(Colors.gradTo).catch(()=>{});
    NavigationBar.setButtonStyleAsync('light').catch(()=>{});
  }, []);

  const closeSuggestions = () => { setShowSug(false); setSuggestions([]); };

  async function fetchPage(reset = false) {
    try {
      setLoading(true);
      const offset = reset ? 0 : page * limit;
      const term = (qd?.trim()?.length ?? 0) > 0 ? qd : null;

      const { data, error } = await supabase.rpc('search_restaurants', {
        q: term, cat: cat === 'Todos' ? null : cat, only_open: false,
        user_lat: null, user_lng: null, limit_: limit, offset_: offset,
        city_filter: city === 'Todas' ? null : city,
      });
      if (error) throw error;

      if (reset) { setRows(data || []); setPage(1); setHasMore((data || []).length === limit); }
      else { setRows((p)=>[...p, ...(data || [])]); setPage((p)=>p+1); setHasMore((data || []).length === limit); }
    } catch (e:any) {
      console.warn(e); setHasMore(false);
      Alert.alert('Error', e.message || 'No se pudo cargar la lista');
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchPage(true); }, []);
  useEffect(() => { fetchPage(true); }, [cat, city]);
  useEffect(() => { if ((qd?.trim()?.length ?? 0) === 0) { closeSuggestions(); fetchPage(true); } }, [qd]);

  // Autocompletado
  useEffect(() => {
    let alive = true;
    const term = qd?.trim() ?? '';
    if (!suggestEnabled || term.length < 2) { setSuggestions([]); setShowSug(false); return; }
    (async () => {
      try {
        const { data, error } = await supabase.rpc('search_restaurants', {
          q: term, cat: cat === 'Todos' ? null : cat, only_open: false,
          user_lat: null, user_lng: null, limit_: sugLimit, offset_: 0,
          city_filter: city === 'Todas' ? null : city,
        });
        if (error) throw error;
        const slim = (data || []).map((r:any)=>({ id:r.id, name:r.name }));
        if (alive) { setSuggestions(slim); setShowSug(slim.length > 0); }
      } catch { if (alive) { setSuggestions([]); setShowSug(false); } }
    })();
    return () => { alive = false; };
  }, [qd, cat, city, suggestEnabled]);

  function applySuggestion(s:{id:number; name:string}) {
    setQ(s.name); closeSuggestions(); setSuggestEnabled(false);
    Keyboard.dismiss(); inputRef.current?.blur(); fetchPage(true);
  }
  function onSearchPress() {
    closeSuggestions(); setSuggestEnabled(false);
    Keyboard.dismiss(); inputRef.current?.blur(); fetchPage(true);
  }

  return (
    <LinearGradient colors={[Colors.gradFrom, Colors.gradTo]} style={styles.bg}>
      {/* StatusBar translucida sobre el degradado */}
      <StatusBar style="light" backgroundColor="transparent" translucent />

      {/* Contenido con padding igual a las safe areas para que el degradado las cubra */}
      <View style={[styles.screen, styles.contentMax, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.title}>
          <Text style={{ fontWeight:'900' }}>Restaurantes</Text>
        </Text>

        {/* BUSCADOR con lupa */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={Colors.placeholder} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            placeholder="Buscar restaurantes, pizzerías…"
            placeholderTextColor={Colors.placeholder}
            value={q}
            onChangeText={(t) => {
              setQ(t); setSuggestEnabled(true);
              setShowSug((t.trim().length >= 2) && suggestions.length > 0);
              if (t.trim().length === 0) { closeSuggestions(); Keyboard.dismiss(); inputRef.current?.blur(); }
            }}
            onFocus={() => { setSuggestEnabled(true); setShowSug(suggestions.length > 0 && (q.trim().length >= 2)); }}
            onBlur={() => setTimeout(closeSuggestions, 0)}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={onSearchPress}
            clearButtonMode="while-editing"
          />
          {showSug && suggestions.length > 0 && (
            <View style={styles.suggestBox}>
              {suggestions.map((s) => (
                <Pressable key={s.id} onPress={() => applySuggestion(s)} style={styles.suggestItem}>
                  <Text style={{ color: Colors.text }}>{s.name}</Text>
                </Pressable>
              ))}
              <View style={styles.suggestDivider} />
              <Pressable onPress={closeSuggestions} style={styles.suggestItem}>
                <Text style={styles.suggestCloseText}>Ocultar sugerencias</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* FILTROS */}
        <View style={styles.filtersRow}>
          <View style={styles.filterCol}><FilterSelect value={cat} onChange={setCat} fullWidth /></View>
          <View style={styles.filterCol}><CitySelect value={city} onChange={setCity} fullWidth /></View>
        </View>

        {/* Botón Buscar */}
        <Pressable onPress={onSearchPress} style={styles.searchButton}>
          <Text style={styles.buttonText}>Buscar</Text>
        </Pressable>

        {/* Lista */}
        {loading && rows.length === 0 ? (
          <View style={styles.loadingWrap}><ActivityIndicator color="#fff" /></View>
        ) : (
          <FlatList
            style={styles.list}
            data={rows}
            keyExtractor={(it) => String(it.id)}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            onEndReached={() => { if (!loading && hasMore && rows.length > 0) fetchPage(false); }}
            onEndReachedThreshold={0.7}
            renderItem={({ item }) => (
              <Link href={{ pathname: '/restaurant/[id]', params: { id: String(item.id) } }} asChild>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.06)' }} style={({ pressed }) => ({ opacity: pressed ? 0.96 : 1, borderRadius: 18 })}>
                  {({ pressed }) => <RestaurantCard item={item} pressed={pressed} />}
                </Pressable>
              </Link>
            )}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No hay resultados.</Text></View>}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 16 },
  contentMax: { alignSelf: 'center', width: '100%', maxWidth: 720 },

  title: { fontSize: 28, color: '#fff', marginBottom: 12, fontWeight: '700' },

  searchWrap: { position: 'relative', zIndex: 10, marginBottom: 10 },
  searchIcon: { position: 'absolute', top: 14, left: 14 },
  input: {
    paddingVertical: 12, paddingLeft: 40, paddingRight: 12,
    borderWidth: 1, borderColor: Colors.inputBorder,
    borderRadius: 14, backgroundColor: Colors.inputBg, color: Colors.text,
  },

  suggestBox: {
    position: 'absolute', top: 54, left: 0, right: 0,
    backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.border, borderRadius: 14,
    paddingVertical: 6, maxHeight: 220,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  suggestItem: { paddingVertical: 10, paddingHorizontal: 12 },
  suggestDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  suggestCloseText: { textAlign: 'center', color: Colors.textDim },

  filtersRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
  filterCol: { flex: 1, minWidth: 0 },

  searchButton: {
    paddingVertical: 12, borderRadius: 14, alignItems: 'center', marginBottom: 12,
    backgroundColor: Colors.primary,
    borderWidth: 1, borderColor: Colors.primaryBorder,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  buttonText: { color: '#fff', fontWeight: '900', letterSpacing: 0.2 },

  list: { marginTop: 4 },
  separator: { height: 12 },
  loadingWrap: { padding: 24 },
  empty: { paddingVertical: 24 },
  emptyText: { color: '#fff', opacity: 0.9, textAlign: 'center' },
});
