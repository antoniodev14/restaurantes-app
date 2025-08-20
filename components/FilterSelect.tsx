// FilterSelect is a wrapper around SelectModal that loads restaurant types from Supabase.

import { supabase } from '../libs/superbase';
import { SelectModal } from './SelectModal';

interface FilterSelectProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  fullWidth?: boolean;
}

/**
 * A drop‑down selector that displays all unique restaurant categories (types).
 * The list of types is loaded once from the Supabase `restaurants` table.
 *
 * Example usage:
 *   <FilterSelect value={type} onChange={setType} />
 */
export function FilterSelect({ value, onChange, label = 'Categoría', fullWidth = false }: FilterSelectProps) {
  // Loader function to fetch unique types from Supabase.
  const loadTypes = async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('types')
      .not('types', 'is', null);
    if (error) throw error;
    // Flatten the array of arrays into a single list.
    const all = (data || []).flatMap((r: any) => (Array.isArray(r.types) ? r.types : []));
    // Remove falsy values, deduplicate and sort locale‑aware.
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
      loadOptions={loadTypes}
      defaultOption="Todos"
      fullWidth={fullWidth}
      selectTitle={`Selecciona ${label.toLowerCase()}`}
    />
  );
}