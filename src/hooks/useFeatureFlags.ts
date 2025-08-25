import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const { data, error } = await supabase
          .from('feature_flags' as any)
          .select('key, enabled');

        if (error) {
          console.error('Error fetching feature flags:', error);
          return;
        }

        const flagsMap = data?.reduce((acc: Record<string, boolean>, flag: any) => {
          acc[flag.key] = flag.enabled;
          return acc;
        }, {} as Record<string, boolean>) || {};

        setFlags(flagsMap);
      } catch (error) {
        console.error('Error fetching feature flags:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlags();

    // Set up realtime subscription for feature flags changes
    const channel = supabase
      .channel('feature_flags_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_flags'
        },
        () => {
          fetchFlags(); // Refetch when flags change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isEnabled = (flagKey: string, defaultValue = false): boolean => {
    if (loading) return defaultValue;
    return flags[flagKey] ?? defaultValue;
  };

  return {
    flags,
    loading,
    isEnabled
  };
}