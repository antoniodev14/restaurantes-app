// components/RestaurantCard.tsx
import { memo } from 'react';
import { Text, View } from 'react-native';

function formatDistance(km: number | null | undefined) {
  if (km == null || isNaN(km)) return null;      // ← si no hay distancia, no muestra nada
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function CardBase({ item }: { item:any }) {
  
  return (
    <View style={{ padding:12, borderRadius:12, borderWidth:1, borderColor:'#eee' }}>
      <Text style={{ fontSize:18, fontWeight:'700' }}>{item.name}</Text>

      <Text style={{ marginTop:2 }}>
        {(item.types || []).join(' · ')}  {item.price_range || ''}
      </Text>

      {!!item.city && (
        <Text style={{ marginTop:2, opacity:0.7 }}>{item.city}</Text>
      )}

      {item.is_open != null && (
        <Text style={{ marginTop:6, color: item.is_open ? '#2e7d32' : '#b00020' }}>
          {item.is_open ? 'Abierto ahora' : 'Cerrado'}
        </Text>
      )}
    </View>
  );
}
export const RestaurantCard = memo(CardBase);
