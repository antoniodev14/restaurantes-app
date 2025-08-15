import { Text, View } from 'react-native';

export default function RestaurantDetail() {
  return (
    <View style={{ flex:1, padding:16, justifyContent:'center', alignItems:'center' }}>
      <Text style={{ fontSize:20, fontWeight:'700' }}>[Detalle restaurante]</Text>
    </View>
  );
}