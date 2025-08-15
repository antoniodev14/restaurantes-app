// app.config.ts
import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: 'Restaurantes Villamartín',
  slug: 'restaurantes-villamartin',
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  },
  experiments: { typedRoutes: true },
});
