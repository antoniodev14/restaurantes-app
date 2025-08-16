// app/index.tsx
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CitySelect } from '../components/CitySelect';
import { FilterSelect } from '../components/FilterSelect';
import { RestaurantCard } from '../components/RestaurantCard';
import { supabase } from '../libs/superbase';

function useDebounce<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function Home() {
  // Estado UI
  const [q, setQ] = useState('');
  const qd = useDebounce(q, 250);
  const [cat, setCat] = useState('Todos');
  const [city, setCity] = useState('Todas');

  // Estado datos (lista)
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  // Autocompletado
  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [suggestEnabled, setSuggestEnabled] = useState(true); // ⬅️ NUEVO: habilita/inhabilita el autocompletado
  const sugLimit = 6;
  const inputRef = useRef<TextInput>(null);

  const closeSuggestions = () => {
    setShowSug(false);
    setSuggestions([]);
  };

  async function fetchPage(reset = false) {
    try {
      setLoading(true);
      const offset = reset ? 0 : page * limit;
      const term = (qd?.trim()?.length ?? 0) > 0 ? qd : null;

      const { data, error } = await supabase.rpc('search_restaurants', {
        q: term,
        cat: cat === 'Todos' ? null : cat,
        only_open: false,
        user_lat: null,
        user_lng: null,
        limit_: limit,
        offset_: offset,
        city_filter: city === 'Todas' ? null : city,
      });
      if (error) throw error;

      if (reset) {
        setRows(data || []);
        setPage(1);
        setHasMore((data || []).length === limit);
      } else {
        setRows((prev) => [...prev, ...(data || [])]);
        setPage((p) => p + 1);
        setHasMore((data || []).length === limit);
      }
    } catch (e: any) {
      console.warn(e);
      setHasMore(false);
      Alert.alert('Error', e.message || 'No se pudo cargar la lista');
    } finally {
      setLoading(false);
    }
  }

  // Cargas/reloads
  useEffect(() => { fetchPage(true); }, []);
  useEffect(() => { fetchPage(true); }, [cat, city]);
  useEffect(() => {
    if ((qd?.trim()?.length ?? 0) === 0) {
      closeSuggestions();
      fetchPage(true);
    }
  }, [qd]);

  // Autocompletado (solo si está habilitado)
  useEffect(() => {
    let alive = true;
    const term = qd?.trim() ?? '';

    // si autocompletado está deshabilitado o menos de 2 letras, no hacemos nada
    if (!suggestEnabled || term.length < 2) {
      setSuggestions([]);
      setShowSug(false);
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.rpc('search_restaurants', {
          q: term,
          cat: cat === 'Todos' ? null : cat,
          only_open: false,
          user_lat: null,
          user_lng: null,
          limit_: sugLimit,
          offset_: 0,
          city_filter: city === 'Todas' ? null : city,
        });
        if (error) throw error;
        const slim = (data || []).map((r: any) => ({ id: r.id, name: r.name }));
        if (alive) {
          setSuggestions(slim);
          setShowSug(slim.length > 0);
        }
      } catch {
        if (alive) {
          setSuggestions([]);
          setShowSug(false);
        }
      }
    })();

    return () => { alive = false; };
  }, [qd, cat, city, suggestEnabled]);

  function applySuggestion(s: { id: number; name: string }) {
    // 1) fijamos el texto con la sugerencia
    setQ(s.name);
    // 2) cerramos y deshabilitamos autocompletado para que NO vuelva a cargar
    closeSuggestions();
    setSuggestEnabled(false);
    // 3) cerramos teclado
    Keyboard.dismiss();
    inputRef.current?.blur();
    // 4) lanzamos la búsqueda principal (una sola vez)
    fetchPage(true);
  }

  function onSearchPress() {
    closeSuggestions();
    setSuggestEnabled(false); // si el usuario pulsa "buscar", también deshabilitamos hasta nueva edición
    Keyboard.dismiss();
    inputRef.current?.blur();
    fetchPage(true);
  }

  return (
    <View style={styles.screen}>
      <Text style={[styles.title, styles.contentMax]}>Rest. Villamartín</Text>

      {/* BUSCADOR */}
      <View style={[styles.searchWrap, styles.contentMax]}>
        <TextInput
          ref={inputRef}
          placeholder="Buscar restaurantes, pizzerías…"
          value={q}
          onChangeText={(t) => {
            setQ(t);
            // el usuario está editando → reactivamos autocompletado
            setSuggestEnabled(true);
            // mostrar sugerencias solo si hay 2+ letras
            setShowSug((t.trim().length >= 2) && suggestions.length > 0);
            // si se borra todo → cerrar teclado y sugerencias
            if (t.trim().length === 0) {
              closeSuggestions();
              Keyboard.dismiss();
              inputRef.current?.blur();
            }
          }}
          onFocus={() => {
            // al enfocar, si había sido deshabilitado por selección previa, lo reactivamos
            setSuggestEnabled(true);
            setShowSug(suggestions.length > 0 && (q.trim().length >= 2));
          }}
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
                <Text>{s.name}</Text>
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
      <View style={[styles.filtersRow, styles.contentMax]}>
        <View style={styles.filterCol}><FilterSelect value={cat} onChange={setCat} fullWidth /></View>
        <View style={styles.filterCol}><CitySelect value={city} onChange={setCity} fullWidth /></View>
      </View>

      {/* Botón Buscar */}
      <View style={styles.contentMax}>
        <Pressable onPress={onSearchPress} style={styles.searchButton}>
          <Text style={styles.buttonText}>Buscar</Text>
        </Pressable>
      </View>

      {/* Lista */}
      {loading && rows.length === 0 ? (
        <View style={styles.loadingWrap}><ActivityIndicator /></View>
      ) : (
        <FlatList
          style={[styles.list, styles.contentMax]}
          data={rows}
          keyExtractor={(it) => String(it.id)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onScrollBeginDrag={closeSuggestions}
          onEndReached={() => { if (!loading && hasMore && rows.length > 0) fetchPage(false); }}
          onEndReachedThreshold={0.7}
          renderItem={({ item }) => (
            <Link
              href={{ pathname: '/restaurant/[id]', params: { id: String(item.id) } }}
              asChild
            >
              <Pressable
                android_ripple={{ color: '#E9ECEF' }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.96 : 1,
                  borderRadius: 16,
                })}
              >
                {({ pressed }) => (
                  <RestaurantCard item={item} pressed={pressed} />
                )}
              </Pressable>
            </Link>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No hay resultados.</Text></View>}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  contentMax: { alignSelf: 'center', width: '100%', maxWidth: 720 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  searchWrap: { position: 'relative', zIndex: 10, marginBottom: 8 },
  input: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, backgroundColor: '#fff' },
  suggestBox: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 56, left: 0, right: 0,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    paddingVertical: 6, maxHeight: 220, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  suggestItem: { paddingVertical: 10, paddingHorizontal: 12 },
  suggestDivider: { height: 1, backgroundColor: '#eee', marginVertical: 6 },
  suggestCloseText: { textAlign: 'center', opacity: 0.7 },
  filtersRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  filterCol: { flex: 1, minWidth: 0 },
  searchButton: { paddingVertical: 12, borderRadius: 12, backgroundColor: '#111', width: '100%', marginBottom: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  list: { marginTop: 4 },
  separator: { height: 12 },
  loadingWrap: { padding: 24 },
  empty: { paddingVertical: 24 },
  emptyText: { opacity: 0.6, textAlign: 'center' },
});
