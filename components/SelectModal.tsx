import { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

interface SelectModalProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  loadOptions: () => Promise<string[]>;
  defaultOption: string;
  fullWidth?: boolean;
  selectTitle?: string;
}

export function SelectModal({
  label,
  value,
  onChange,
  loadOptions,
  defaultOption,
  fullWidth = false,
  selectTitle,
}: SelectModalProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>([defaultOption]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchOptions = async () => {
      setLoading(true);
      try {
        const result = await loadOptions();
        if (alive) {
          setOptions([defaultOption, ...result]);
          setError(null);
        }
      } catch (err: any) {
        if (alive) setError(err?.message ?? 'Error');
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchOptions();
    return () => { alive = false; };
  }, [loadOptions, defaultOption]);

  const handleSelect = useCallback(
    (item: string) => {
      onChange(item);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: Colors.pillBg,
          borderWidth: 1,
          borderColor: 'rgba(107,33,168,0.15)',
          width: fullWidth ? '100%' : undefined,
        }}
      >
        {/* aquí aplicamos el color pillText al texto del botón */}
        <Text style={{ color: Colors.pillText, fontWeight: '600' }}>
          {label}: {value} ▾
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent>
        {/* Overlay gris translúcido para oscurecer el fondo */}
        <Pressable
          onPress={() => setOpen(false)}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
        />
        {/* Contenedor para centrar la tarjeta */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View
            style={{
              marginHorizontal: 32,
              padding: 24,
              borderRadius: 16,
              backgroundColor: Colors.cardFilt,
              maxHeight: '60%', // limita la altura para que se vea flotando en mitad de pantalla
            }}
          >
            <Text style={{ fontWeight: '800', fontSize: 18, marginBottom: 12, color: Colors.pillText }}>
              {selectTitle || `Selecciona ${label.toLowerCase()}`}
            </Text>
            {loading && <Text>Cargando…</Text>}
            {error && <Text style={{ color: 'red' }}>{error}</Text>}
            {!loading && !error && (
              <FlatList
                data={options}
                keyExtractor={(item) => item}
                ItemSeparatorComponent={() => (
                  <View style={{ height: 1, backgroundColor: Colors.border,  }} />
                )}
                renderItem={({ item }) => (
                  <Pressable onPress={() => handleSelect(item)} style={{ paddingVertical: 12 }}>
                    <Text style={{color: Colors.pillText}}>{item}</Text>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
