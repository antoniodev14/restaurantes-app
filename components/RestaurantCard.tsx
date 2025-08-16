// components/RestaurantCard.tsx
import { memo, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type RestaurantItem = {
  id: number | string;
  name: string;
  types?: string[];
  price_range?: string | null;
  city?: string | string[] | null;   // soporta string[]
  image_url?: string | null;
  is_open?: boolean | null;
};

type Props = {
  item: RestaurantItem;
  showDistance?: boolean; // reservado para pantallas futuras
  pressed?: boolean;      // feedback visual en iOS
};

// Paleta suave para placeholder
const PALETTE = ['#E3F2FD','#E8F5E9','#FFF3E0','#F3E5F5','#E0F7FA','#FCE4EC','#F1F8E9','#EDE7F6'];

function usePlaceholderColor(name: string) {
  return useMemo(() => {
    if (!name) return '#EEE';
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
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

function CardBase({ item, showDistance = false, pressed = false }: Props) {
  const [imgOk, setImgOk] = useState(true);
  const hasImage = !!item?.image_url && imgOk;

  const cityText =
    Array.isArray(item.city)
      ? item.city.filter(Boolean).join(' · ')
      : (item.city || '');

  return (
    <View style={[v.card, pressed && v.cardPressed]}>
      {/* Thumbnail circular */}
      {hasImage ? (
        <Image
          source={{ uri: item.image_url as string }}
          style={[i.thumb, i.thumbRound]}
          resizeMode="cover"
          onError={() => setImgOk(false)}
        />
      ) : (
        <Placeholder name={item?.name || ''} />
      )}

      {/* Info */}
      <View style={v.info}>
        <Text numberOfLines={1} style={t.name}>{item.name}</Text>

        <Text numberOfLines={1} style={t.meta}>
          {(item.types || []).join(' · ')}{item.price_range ? `  ${item.price_range}` : ''}
        </Text>

        {!!cityText && (
          <Text numberOfLines={1} style={t.city}>{cityText}</Text>
        )}

        {item.is_open != null && (
          <Text style={[t.badge, { color: item.is_open ? '#2e7d32' : '#b00020' }]}>
            {item.is_open ? 'Abierto ahora' : 'Cerrado'}
          </Text>
        )}
      </View>

      {/* Chevron (enlace visual) */}
      <Text style={t.chevron}>›</Text>
    </View>
  );
}

export const RestaurantCard = memo(CardBase);

/* ---------- styles ---------- */
/** View styles */
const CARD_RADIUS = 16;
const SHADOW_IOS = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
} satisfies ViewStyle;

const v = StyleSheet.create<{
  card: ViewStyle;
  cardPressed: ViewStyle;
  info: ViewStyle;
  thumbBox: ViewStyle;
  thumbRound: ViewStyle;
}>({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: CARD_RADIUS,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    ...(Platform.OS === 'ios' ? SHADOW_IOS : { elevation: 2 }),
    transform: [{ scale: 1 }],
  },
  cardPressed: Platform.select<ViewStyle>({
    ios: {
      transform: [{ scale: 0.98 }],
      shadowOpacity: 0.12,
      shadowRadius: 14,
    },
    android: {},
    default: {},
  })!,
  info: {
    flex: 1,
    minWidth: 0,
  },
  // Caja para placeholder (View)
  thumbBox: {
    width: 64,
    height: 64,
    backgroundColor: '#f5f5f5',
  },
  // Redondeo para View (placeholder)
  thumbRound: {
    borderRadius: 32,
  },
});

/** Image styles */
const i = StyleSheet.create<{
  thumb: ImageStyle;
  thumbRound: ImageStyle;
}>({
  thumb: {
    width: 64,
    height: 64,
    backgroundColor: '#f5f5f5',
  },
  thumbRound: {
    borderRadius: 32,
  },
});

/** Text styles */
const t = StyleSheet.create<{
  name: TextStyle;
  meta: TextStyle;
  city: TextStyle;
  badge: TextStyle;
  chevron: TextStyle;
  placeholderInitial: TextStyle;
}>({
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    marginTop: 2,
    opacity: 0.9,
  },
  city: {
    marginTop: 2,
    opacity: 0.7,
  },
  badge: {
    marginTop: 6,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    color: '#9AA0A6',
    marginLeft: 4,
  },
  placeholderInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: '#555',
  },
});
