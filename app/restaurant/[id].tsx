import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '../../constants/Colors';
import { resolveImageUrl } from '../../libs/media';
import type { Restaurant } from '../../libs/restaurants';
import { supabase } from '../../libs/superbase';

/** Tipos */
type Schedule = { day: number; open: string; close: string };
type ScheduleRule = { day_from: number; day_to: number; open_time: string; close_time: string; note?: string | null };

type MenuItem = {
  id: number;
  restaurant_id: number;
  name: string;
  description?: string | null;
  price?: number | null;
  image_url?: string | null;
  allergens?: string[] | null;
  type?: string[] | string | null;  // text[] | text
  sort_index?: number | null;
  is_active?: boolean | null;
};

export default function RestaurantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [bannerError, setBannerError] = useState(false);

  // Carta
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedType, setSelectedType] = useState<string>('Todos');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [allergenOpen, setAllergenOpen] = useState(false);
  const [allergenItem, setAllergenItem] = useState<MenuItem | null>(null);

  // Integración barra inferior Android
  useEffect(() => {
    NavigationBar.setBackgroundColorAsync(Colors.gradTo).catch(() => {});
    NavigationBar.setButtonStyleAsync('light').catch(() => {});
  }, []);

  // ------- Fetch principal -------
  const selectCols =
    'id,name,types,price_range,phone,whatsapp,address,city,image_url,photo_url,lat,lng,description,web,pago,menu_type_order';

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const rid = Number(id);
        if (!rid || Number.isNaN(rid)) throw new Error('ID inválido');

        // Restaurante
        const { data: rows, error } = await supabase
          .from('restaurants')
          .select(selectCols)
          .eq('id', rid)
          .limit(1);
        if (error) throw error;
        if (!rows || rows.length === 0) throw new Error('Restaurante no encontrado');
        const row = rows[0] as Restaurant;

        // schedules
        const { data: sch, error: eSch } = await supabase
          .from('schedules')
          .select('day,open,close')
          .eq('restaurant_id', rid)
          .order('day', { ascending: true });
        if (eSch) throw eSch;

        // schedule_rules
        const { data: rls, error: eRls } = await supabase
          .from('schedule_rules')
          .select('day_from,day_to,open_time,close_time,note,restaurant_id')
          .eq('restaurant_id', rid);
        if (eRls) throw eRls;

        // menu_items
        const { data: mis, error: eMi } = await supabase
          .from('menu_items')
          .select('id,restaurant_id,name,description,price,image_url,allergens,type,sort_index,is_active')
          .eq('restaurant_id', rid)
          .eq('is_active', true)
          .order('sort_index', { ascending: true })
          .order('name', { ascending: true });
        if (eMi) throw eMi;

        if (!alive) return;

        setData(row);
        setSchedules((sch || []) as Schedule[]);
        const normRules: ScheduleRule[] = (rls || []).map((r: any) => ({
          day_from: Number(r.day_from),
          day_to: Number(r.day_to),
          open_time: String(r.open_time),
          close_time: String(r.close_time),
          note: r.note ?? null,
        }));
        setRules(normRules);
        setMenuItems((mis || []) as MenuItem[]);
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'No se pudo cargar el restaurante', [
          { text: 'Ok', onPress: () => router.back() },
        ]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  // ---------- helpers ----------
  const firstOf = (v?: string[] | string | null) => Array.isArray(v) ? (v.find(Boolean) ?? '') + '' : (v ?? '') + '';
  const joinAll  = (v?: string[] | string | null) =>
    Array.isArray(v) ? v.filter(Boolean).join(', ') : (v ?? '') + '';

  const typeLabel = useMemo(() => firstOf(data?.types).trim(), [data?.types]);

  const bannerUri = useMemo(() => {
    if (!data || bannerError) return undefined;
    const first = resolveImageUrl(data.photo_url) || resolveImageUrl(data.image_url);
    return first || 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=1200&auto=format&fit=crop';
  }, [data, bannerError]);

  const addressPart = useMemo(() => (data?.address ?? '').toString().trim(), [data?.address]);
  const cityLabel   = useMemo(() => joinAll(data?.city).trim(), [data?.city]);
  const fullAddress = useMemo(() => {
    if (addressPart && cityLabel) return `${addressPart}${addressPart.endsWith(',') ? '' : ','} ${cityLabel}`;
    return addressPart || cityLabel || '';
  }, [addressPart, cityLabel]);

  // Horario compacto (HH:MM)
  const dayAbbr = (d1to7: number) => ['Lu','Ma','Mi','Ju','Vi','Sa','Do'][(d1to7 - 1 + 7) % 7] || '';
  const rangeLabel = (f: number, t: number) => (f === t ? dayAbbr(f) : `${dayAbbr(f)}–${dayAbbr(t)}`);
  const fmtHHMM = (s: string) => { const [h='0',m='0'] = (s||'').split(':'); return `${h.padStart(2,'0')}:${m.padStart(2,'0')}`; };

  const openingCompact = useMemo(() => {
    const parts: string[] = [];
    for (const r of rules) {
      const label = `${rangeLabel(r.day_from, r.day_to)} ${fmtHHMM(r.open_time)}–${fmtHHMM(r.close_time)}`;
      if (!parts.includes(label)) parts.push(label);
    }
    for (const s of schedules) {
      const label = `${dayAbbr(s.day)} ${fmtHHMM(s.open)}–${fmtHHMM(s.close)}`;
      if (!parts.includes(label)) parts.push(label);
    }
    return parts.join(' · ');
  }, [rules, schedules]);

  // ---- Tipos disponibles y orden de secciones ----
  const allTypes = useMemo(() => {
    const set = new Set<string>();
    for (const it of menuItems) {
      const arr = Array.isArray(it.type) ? it.type : (it.type ? [it.type] : []);
      arr.filter(Boolean).forEach(t => set.add(t));
    }
    return Array.from(set);
  }, [menuItems]);

  const typeOrderFromRestaurant = useMemo(() => {
    const arr = Array.isArray((data as any)?.menu_type_order) ? (data as any).menu_type_order as string[] : [];
    return arr;
  }, [data]);

  const orderedTypes = useMemo(() => {
    if (!allTypes.length) return [] as string[];
    if (typeOrderFromRestaurant.length) {
      const known = typeOrderFromRestaurant.filter(t => allTypes.includes(t));
      const rest  = allTypes.filter(t => !known.includes(t)).sort((a,b)=>a.localeCompare(b,'es'));
      return [...known, ...rest];
    }
    return [...allTypes].sort((a,b)=>a.localeCompare(b,'es'));
  }, [allTypes, typeOrderFromRestaurant]);

  const typeOptions = useMemo(() => ['Todos', ...orderedTypes], [orderedTypes]);

  // Mapa sección -> items
  const sectionsMap = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const it of menuItems) {
      const arr = Array.isArray(it.type) ? it.type : (it.type ? [it.type] : []);
      const bucket = arr.length ? arr : ['Otros'];
      for (const t of bucket) {
        const key = t || 'Otros';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(it);
      }
    }
    for (const [k, list] of map) {
      list.sort((a, b) => ( (a.sort_index ?? 0) - (b.sort_index ?? 0) ) || (a.name || '').localeCompare(b.name,'es'));
    }
    return map;
  }, [menuItems]);

  // Filtrado
  const visibleSections = useMemo(() => {
    if (selectedType === 'Todos') {
      const names = orderedTypes.length ? orderedTypes : Array.from(sectionsMap.keys()).sort((a,b)=>a.localeCompare(b,'es'));
      return names.map(n => ({ name: n, items: sectionsMap.get(n) || [] }));
    }
    return [{ name: selectedType, items: sectionsMap.get(selectedType) || [] }];
  }, [selectedType, sectionsMap, orderedTypes]);

  // ---------- acciones ----------
  const openPhone = () => { if (data?.phone) Linking.openURL(`tel:${data.phone}`); };
  const openWhatsApp = () => {
    const src = data?.whatsapp || data?.phone || '';
    const digits = (src ?? '').toString().replace(/[^\d]/g, '');
    if (!digits) return;
    const txt = `Hola, vengo de Come Aquí y quiero información sobre "${data?.name ?? ''}"`;
    Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(txt)}`);
  };
  const openMaps = () => {
    if (!data) return;
    if (data.lat != null && data.lng != null) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}&travelmode=driving`);
    } else if (fullAddress) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}&travelmode=driving`);
    }
  };
  const openWeb = () => {
    if (!data?.web) return;
    let url = (data as any).web.trim();
    const looksLikeDomain = /^[\w.-]+\.[a-z]{2,}$/i.test(url);
    if (!/^https?:\/\//i.test(url)) url = looksLikeDomain ? `https://${url}` : '';
    if (url) Linking.openURL(url);
  };
  const openAllergens = (item: MenuItem) => { setAllergenItem(item); setAllergenOpen(true); };

  const fmtPrice = (n?: number | null) => (typeof n === 'number')
    ? new Intl.NumberFormat('es-ES',{ style:'currency', currency:'EUR' }).format(n)
    : '';

  // Filtro tipos (ActionSheet iOS / Modal Android)
  const openTypePicker = () => {
    if (Platform.OS === 'ios') {
      const options = typeOptions;
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Filtrar por tipo',
          options: [...options, 'Cancelar'],
          cancelButtonIndex: options.length,
        },
        (index) => {
          if (index !== options.length) setSelectedType(options[index]);
        }
      );
    } else {
      setTypePickerOpen(true);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={[Colors.gradFrom, Colors.gradTo]} style={{ flex: 1 }}>
        <StatusBar style="light" backgroundColor="transparent" translucent />
        <View style={[styles.loading, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <ActivityIndicator color="#fff" />
        </View>
      </LinearGradient>
    );
  }
  if (!data) return null;

  const hasPhone = !!data.phone;
  const hasWA = !!(data?.whatsapp || data?.phone);
  const showSchedule = openingCompact.length > 0;

  return (
    <LinearGradient colors={[Colors.gradFrom, Colors.gradTo]} style={styles.bg}>
      <StatusBar style="light" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        scrollIndicatorInsets={{ top: insets.top }}
      >
        {/* Volver */}
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 4 }]}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>

        {/* Banner */}
        <View style={styles.bannerWrap}>
          {bannerUri ? (
            <Image source={{ uri: bannerUri }} style={styles.banner} onError={() => setBannerError(true)} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#ffc078', '#f76707']} style={[styles.banner]} />
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={styles.bannerOverlay} />
          <View style={[styles.bannerTitleBox, { paddingBottom: 14 + Math.max(0, insets.top / 3) }]}>
            <Text style={styles.bannerName} numberOfLines={1}>{data.name}</Text>
            {!!typeLabel && <Text style={styles.bannerType} numberOfLines={1}>{typeLabel}</Text>}
          </View>
        </View>

        {/* ====== SECCIÓN SOBRE FONDO NARANJA: botones + descripción + información ====== */}
        <View style={styles.orangeSection}>
          {/* Botones */}
          <View style={styles.oButtonRow}>
            <Pressable
              onPress={hasPhone ? openPhone : undefined}
              disabled={!hasPhone}
              style={[styles.oButton, !hasPhone && styles.oButtonDisabled]}
              hitSlop={8}
            >
              <Ionicons name="call-outline" size={18} color={hasPhone ? Colors.text : '#bbb'} />
              <Text style={[styles.oButtonText, !hasPhone && styles.oButtonTextDisabled]}>Llamar</Text>
            </Pressable>

            <Pressable
              onPress={hasWA ? openWhatsApp : undefined}
              disabled={!hasWA}
              style={[styles.oButton, !hasWA && styles.oButtonDisabled]}
              hitSlop={8}
            >
              <Ionicons name="logo-whatsapp" size={18} color={hasWA ? '#25D366' : '#bbb'} />
              <Text style={[styles.oButtonText, !hasWA && styles.oButtonTextDisabled]}>WhatsApp</Text>
            </Pressable>
          </View>

          {/* Descripción */}
          {data.description ? (
            <View style={{ marginTop: 4, marginBottom: 10 }}>
              <Text style={styles.oTitle}>Descripción</Text>
              <Text style={styles.oText}>{data.description}</Text>
            </View>
          ) : null}

          {/* Información */}
          <View style={{ marginTop: 4 }}>
            <Text style={styles.oTitle}>Información</Text>

            {fullAddress ? (
              <Pressable onPress={openMaps} style={styles.oRow}>
                <Ionicons name="location-outline" size={18} color="#fff" />
                <Text style={styles.oLink}>{fullAddress}</Text>
              </Pressable>
            ) : null}

            {(data as any).pago ? (
              <View style={styles.oRow}>
                <Ionicons name="pricetag-outline" size={18} color="#fff" />
                <Text style={styles.oText}>{(data as any).pago}</Text>
              </View>
            ) : null}

            {(data as any).web ? (
              <Pressable onPress={openWeb} style={styles.oRow} hitSlop={6}>
                <Ionicons name="globe-outline" size={18} color="#fff" />
                <Text style={styles.oLink}>{(data as any).web}</Text>
              </Pressable>
            ) : null}

            {showSchedule ? (
              <View style={[styles.oRow, { alignItems: 'flex-start' }]}>
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text style={[styles.oText, { flex: 1, lineHeight: 20 }]}>{openingCompact}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {/* ====== /SECCIÓN NARANJA ====== */}

        {/* ===================== CARTA (CARD BLANCA) ===================== */}
        <View style={[styles.card, { marginTop: 12, paddingTop: 12 }]}>
          {/* Título + filtro */}
          <View style={styles.cartaHeaderRow}>
            <Text style={styles.cartaTitle}>Carta</Text>
            <Pressable style={styles.typeFilterBtn} onPress={openTypePicker} hitSlop={6}>
              <Ionicons name="filter-outline" size={16} color={Colors.text} />
              <Text style={styles.typeFilterText}>{selectedType}</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.text} />
            </Pressable>
          </View>

          {/* Secciones + tarjetas de platos */}
          <View style={{ marginTop: 8 }}>
            {visibleSections.map(sec => (
              <View key={sec.name} style={{ marginBottom: 10 }}>
                <Text style={styles.sectionSubtitleCard}>{sec.name}</Text>

                {sec.items.length === 0 ? (
                  <Text style={styles.infoText}>Sin platos en esta sección.</Text>
                ) : (
                  sec.items.map(item => {
                    const uri = resolveImageUrl(item.image_url) || undefined;
                    return (
                      <View key={`${sec.name}-${item.id}`} style={styles.menuCard}>
                        {/* Imagen */}
                        {uri ? (
                          <Image source={{ uri }} style={styles.menuCardImg} />
                        ) : (
                          <View style={[styles.menuCardImg, styles.menuItemImgFallback]}>
                            <Ionicons name="fast-food-outline" size={20} color="#888" />
                          </View>
                        )}

                        {/* Texto */}
                        <View style={styles.menuCardBody}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.menuItemName} numberOfLines={1}>{item.name}</Text>
                            {Array.isArray(item.allergens) && item.allergens.length > 0 && (
                              <Pressable
                                onPress={() => { setAllergenItem(item); setAllergenOpen(true); }}
                                style={{ marginLeft: 6 }}
                                hitSlop={6}
                              >
                                <Ionicons name="information-circle-outline" size={18} color={Colors.textDim} />
                              </Pressable>
                            )}
                          </View>
                          {!!item.description && (
                            <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                          )}
                        </View>

                        {/* Precio */}
                        <View style={{ marginLeft: 8, alignItems: 'flex-end' }}>
                          {!!item.price && <Text style={styles.menuItemPrice}>{fmtPrice(item.price)}</Text>}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            ))}
          </View>
        </View>
        {/* ===================== /CARTA ===================== */}

        <View style={{ height: 12 }} />
      </ScrollView>

      {/* Modal selector de tipo (Android / fallback) */}
      <Modal visible={typePickerOpen} animationType="fade" transparent onRequestClose={() => setTypePickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTypePickerOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filtrar por tipo</Text>
            {typeOptions.map(t => (
              <Pressable key={t} onPress={() => { setSelectedType(t); setTypePickerOpen(false); }} style={styles.modalItem}>
                <Text style={[styles.modalItemText, t === selectedType && { fontWeight: '800' }]}>{t}</Text>
                {t === selectedType && <Ionicons name="checkmark" size={18} color={Colors.text} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Modal alérgenos */}
      <Modal visible={allergenOpen} animationType="fade" transparent onRequestClose={() => setAllergenOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAllergenOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Alérgenos</Text>
            {Array.isArray(allergenItem?.allergens) && allergenItem!.allergens!.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {allergenItem!.allergens!.map((a, idx) => (
                  <View key={idx} style={styles.allergenTag}>
                    <Text style={styles.allergenTagText}>{a}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.infoText}>Sin información de alérgenos.</Text>
            )}
          </View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Banner
  bannerWrap: { position: 'relative' },
  banner: { width: '100%', height: 260 },
  bannerOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 },
  bannerTitleBox: { position: 'absolute', left: 16, right: 16, bottom: 0, paddingTop: 22 },
  bannerName: { color: '#fff', fontSize: 24, fontWeight: '900' },
  bannerType: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 2 },

  // ===== Sección “sobre naranja” (sin card) =====
  orangeSection: { paddingHorizontal: 16, paddingTop: 12 },
  oButtonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  oButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.pillBg,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ffffffaa',
    justifyContent: 'center',
  },
  oButtonDisabled: { opacity: 0.6 },
  oButtonText: { fontWeight: '700', color: Colors.text },
  oButtonTextDisabled: { color: '#bbb' },

  oTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginTop: 4, marginBottom: 6 },
  oText: { color: 'rgba(255,255,255,0.95)', lineHeight: 20 },
  oRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  oLink: { color: '#fff', textDecorationLine: 'underline', flexShrink: 1 },

  // -------- CARD (Carta) --------
  card: {
    marginHorizontal: 16,
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  cartaHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cartaTitle: { color: Colors.text, fontSize: 22, fontWeight: '900' },
  typeFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: '#e8e8e8',
    backgroundColor: '#fff',
  },
  typeFilterText: { color: Colors.text, fontWeight: '700' },
  sectionSubtitleCard: { color: Colors.text, fontSize: 16, fontWeight: '800', marginTop: 6, marginBottom: 8 },

  // Tarjetas de platos
  menuCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  menuCardImg: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#eee', marginRight: 12 },
  menuItemImgFallback: { alignItems: 'center', justifyContent: 'center' },
  menuCardBody: { flex: 1, minWidth: 0 },
  menuItemName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  menuItemDesc: { fontSize: 13, color: Colors.textDim, marginTop: 2 },
  menuItemPrice: { fontWeight: '800', color: Colors.text },

  // Textos genéricos (faltaba y daba TS error)
  infoText: { color: Colors.text, flexShrink: 1 }, // <-- agregado

  // Modales
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: 16, backgroundColor: '#fff', padding: 16, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  modalItem: { paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalItemText: { fontSize: 16, color: Colors.text },
  allergenTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f1f1f1' },
  allergenTagText: { color: Colors.text, fontWeight: '600' },

  // Back
  backBtn: {
    position: 'absolute', zIndex: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.35)', width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
});
