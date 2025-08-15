import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, gcTime: 5*60_000, retry: 1 } }
});

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaView style={{ flex:1 }}>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaView>
    </QueryClientProvider>
  );
}
