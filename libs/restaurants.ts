export type Restaurant = {
  id: number;
  name: string;
  types?: string[] | null;
  price_range?: string | null;   // (ojo: 'prince_range' tal cual lo pusiste)
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string[] | string | null;
  image_url?: string | null;      // URL completa o ruta de storage
  photo_url?: string | null;      // si usas otra foto distinta
  lat?: number | null;
  lng?: number | null;
  description?: string | null;
  is_open?: boolean | null;
  web?: string | null;
  pago: string| null;
  menu_type_order?: string[] | null;
};
