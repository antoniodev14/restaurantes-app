// CitySelect is a wrapper around SelectModal that loads city names from Supabase.

import { supabase } from '../libs/superbase';
import { SelectModal } from './SelectModal';

interface CitySelectProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  fullWidth?: boolean;
}

/**
 * A drop‑down selector that displays all unique cities present in the restaurants table.
 * It handles both array and string representations of the `city` column.
 */
export function CitySelect({ value, onChange, label = 'Ciudad', fullWidth = false }: CitySelectProps) {
  const loadCities = async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('city')
      .not('city', 'is', null);
    if (error) throw error;
    // Extract city names from the query result. Each row may contain an array
    // or a single string. Trim and filter out empty values.
    const all: string[] = (data || []).flatMap((r: any) => {
      const c = r.city;
      if (Array.isArray(c)) return c.filter(Boolean);
      if (typeof c === 'string' && c.trim()) return [c.trim()];
      return [];
    });
    const unique = Array.from(new Set(all))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    return unique;
  };

  return (
    <SelectModal
      label={label}
      value={value}
      onChange={onChange}
      loadOptions={loadCities}
      defaultOption="Todas"
      fullWidth={fullWidth}
      selectTitle={`Selecciona ${label.toLowerCase()}`}
    />
  );
}