// RestaurantCard displays a single restaurant as a card with thumbnail, metadata and open/closed badge.
// It accepts optional labels for the open and closed states to support localisation.

import { Restaurant } from '@/libs/restaurants';
import { Ionicons } from '@expo/vector-icons';
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
import { Colors } from '../constants/Colors';

type Props = {
  item: Restaurant;
  /** Whether the card is in a pressed (tapped) state. */
  pressed?: boolean;
  /** Text shown when the restaurant is open. Defaults to Spanish. */
  openLabel?: string;
  /** Text shown when the restaurant is closed. Defaults to Spanish. */
  closedLabel?: string;
  /** If true, show an edit icon instead of a chevron. */
  editable?: boolean;
};

// Colour palette used for the placeholder thumbnails.  The hash of the
// restaurant's name chooses a colour from this array.  Keeping the
// palette constant ensures consistent visuals across renders.
const PALETTE = ['#E3F2FD', '#E8F5E9', '#FFF3E0', '#F3E5F5', '#E0F7FA', '#FCE4EC', '#F1F8E9', '#EDE7F6'];

/**
 * Computes a deterministic background colour based on the restaurant name.  A
 * simple hash is used so that the same name always yields the same colour.
 */
function usePlaceholderColor(name: string) {
  return useMemo(() => {
    if (!name) return '#EEE';
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }, [name]);
}

/**
 * Base component that renders the card.  It is wrapped with React.memo at
 * export time to avoid unnecessary re-renders when props have not changed.
 */
function CardBase({ item, pressed = false, openLabel = 'Abierto ahora', closedLabel = 'Cerrado', editable = false }: Props) {
  const [imgOk, setImgOk] = useState(true);
  const hasImage = !!item?.image_url && imgOk;

  // Compute a human‑readable city string.  Accepts arrays or single strings.
  const cityText = useMemo(() => {
    if (Array.isArray(item.city)) return item.city.filter(Boolean).join(' · ');
    return item.city || '';
  }, [item.city]);

  // Combine types and price range into a single metadata line.
  const metaText = useMemo(() => {
    const types = (item.types || []).join(' · ');
    return types + (item.price_range ? `  ${item.price_range}` : '');
  }, [item.types, item.price_range]);

  // Compute placeholder colour outside of render.
  const placeholderBg = usePlaceholderColor(item.name);
  const placeholderInitial = (item.name?.trim()?.[0] || '?').toUpperCase();

      return (
        <View style={[v.card, pressed && v.cardPressed]}>
          {/* Thumbnail */}
          <View style={v.thumbBox}>
            {hasImage ? (
              <Image
                source={{ uri: item.image_url! }}
                style={[i.thumb, i.thumbRound]}
                resizeMode="cover"
                onError={() => setImgOk(false)}
              />
            ) : (
              <View style={[i.thumb, i.thumbRound, { backgroundColor: placeholderBg, justifyContent: 'center', alignItems: 'center' }]}> 
                <Text style={t.placeholderInitial}>{placeholderInitial}</Text>
              </View>
            )}
          </View>
          {/* Information */}
          <View style={v.info}>
            <Text style={t.name}>{item.name}</Text>
            <Text style={t.meta}>{metaText}</Text>
            {!!cityText && <Text style={t.city}>{cityText}</Text>}
            {item.is_open != null && (
              <Text style={[t.badge, { color: item.is_open ? '#059669' : '#dc2626' }]}> 
                {item.is_open ? openLabel : closedLabel}
              </Text>
            )}
          </View>
          {/* Chevron indicating navigable card or edit icon */}
          {editable ? (
            <Ionicons name="pencil" size={22} color={Colors.chevron} style={{ marginLeft: 4 }} />
          ) : (
            <Text style={t.chevron}>›</Text>
          )}
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
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...(Platform.OS === 'ios' ? SHADOW_IOS : { elevation: 2 }),
    transform: [{ scale: 1 }],
  },
  cardPressed: Platform.select({
    ios: { transform: [{ scale: 0.985 }], shadowOpacity: 0.14, shadowRadius: 16 },
    android: {},
    default: {},
  })!,
  info: { flex: 1, minWidth: 0 },
  thumbBox: { width: 64, height: 64, overflow: "hidden" },
  thumbRound: { borderRadius: 32 },
});

const i = StyleSheet.create<{ thumb: ImageStyle; thumbRound: ImageStyle }>({
  thumb: { width: 64, height: 64, overflow: 'hidden', },
  thumbRound: { borderRadius: 32 },
});

const t = StyleSheet.create<{
  name: TextStyle;
  meta: TextStyle;
  city: TextStyle;
  badge: TextStyle;
  chevron: TextStyle;
  placeholderInitial: TextStyle;
}>({
  name: { fontSize: 16, fontWeight: '900', color: Colors.text },
  meta: { marginTop: 2, color: Colors.textDim },
  city: { marginTop: 2, color: Colors.textDim },
  badge: { marginTop: 6, fontWeight: '800' },
  chevron: { fontSize: 24, color: Colors.chevron, marginLeft: 4 },
  placeholderInitial: { fontSize: 22, fontWeight: '800', color: '#555' },
});