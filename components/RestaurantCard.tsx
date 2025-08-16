// components/RestaurantCard.tsx
import { memo, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  type ImageStyle, type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Colors } from '../constants/Colors';

type RestaurantItem = {
  id: number | string;
  name: string;
  types?: string[];
  price_range?: string | null;
  city?: string | string[] | null;
  image_url?: string | null;
  is_open?: boolean | null;
};

type Props = { item: RestaurantItem; pressed?: boolean; };

const PALETTE = ['#E3F2FD','#E8F5E9','#FFF3E0','#F3E5F5','#E0F7FA','#FCE4EC','#F1F8E9','#EDE7F6'];
function usePlaceholderColor(name: string) {
  return useMemo(() => {
    if (!name) return '#EEE';
    let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }, [name]);
}

function Placeholder({ name }: { name: string }) {
  const initial = (name?.trim()?.[0] || '?').toUpperCase();
  const bg = usePlaceholderColor(name);
  return (
    <View style={[v.thumbBox, v.thumbRound, { backgroundColor: bg, alignItems:'center', justifyContent:'center' }]}>
      <Text style={t.placeholderInitial}>{initial}</Text>
    </View>
  );
}

function CardBase({ item, pressed = false }: Props) {
  const [imgOk, setImgOk] = useState(true);
  const hasImage = !!item?.image_url && imgOk;
  const cityText = Array.isArray(item.city) ? item.city.filter(Boolean).join(' · ') : (item.city || '');

  return (
    <View style={[v.card, pressed && v.cardPressed]}>
      {hasImage ? (
        <Image source={{ uri: item.image_url as string }} style={[i.thumb, i.thumbRound]} resizeMode="cover" onError={() => setImgOk(false)} />
      ) : (
        <Placeholder name={item?.name || ''} />
      )}

      <View style={v.info}>
        <Text numberOfLines={1} style={t.name}>{item.name}</Text>

        <Text numberOfLines={1} style={t.meta}>
          {(item.types || []).join(' · ')}{item.price_range ? `  ${item.price_range}` : ''}
        </Text>

        {!!cityText && <Text numberOfLines={1} style={t.city}>{cityText}</Text>}

        {item.is_open != null && (
          <Text style={[t.badge, { color: item.is_open ? Colors.open : Colors.closed }]}>
            {item.is_open ? 'Abierto ahora' : 'Cerrado'}
          </Text>
        )}
      </View>

      <Text style={t.chevron}>›</Text>
    </View>
  );
}
export const RestaurantCard = memo(CardBase);

/* ---------- styles ---------- */
const CARD_RADIUS = 18;
const SHADOW_IOS: ViewStyle = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
};

const v = StyleSheet.create<{
  card: ViewStyle; cardPressed: ViewStyle; info: ViewStyle; thumbBox: ViewStyle; thumbRound: ViewStyle;
}>({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: CARD_RADIUS,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...(Platform.OS === 'ios' ? SHADOW_IOS : { elevation: 2 }),
    transform: [{ scale: 1 }],
  },
  cardPressed: Platform.select<ViewStyle>({
    ios: { transform: [{ scale: 0.985 }], shadowOpacity: 0.14, shadowRadius: 16 },
    android: {},
    default: {},
  })!,
  info: { flex: 1, minWidth: 0 },
  thumbBox: { width: 64, height: 64, backgroundColor: '#f5f5f5' },
  thumbRound: { borderRadius: 32 },
});

const i = StyleSheet.create<{ thumb: ImageStyle; thumbRound: ImageStyle }>({
  thumb: { width: 64, height: 64, backgroundColor: '#f5f5f5' },
  thumbRound: { borderRadius: 32 },
});

const t = StyleSheet.create<{
  name: TextStyle; meta: TextStyle; city: TextStyle; badge: TextStyle; chevron: TextStyle; placeholderInitial: TextStyle;
}>({
  name: { fontSize: 16, fontWeight: '900', color: Colors.text },
  meta: { marginTop: 2, color: Colors.textDim },
  city: { marginTop: 2, color: Colors.textDim },
  badge: { marginTop: 6, fontWeight: '800' },
  chevron: { fontSize: 24, color: Colors.chevron, marginLeft: 4 },
  placeholderInitial: { fontSize: 22, fontWeight: '800', color: '#555' },
});
