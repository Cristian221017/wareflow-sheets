import { useMemo } from 'react';

interface EnvironmentConfig {
  env: 'test' | 'production';
  isTest: boolean;
  isProd: boolean;
  features: {
    showDebugInfo: boolean;
    enableBetaFeatures: boolean;
    allowTestData: boolean;
    showAdvancedOptions: boolean;
  };
  ui: {
    showEnvironmentBadge: boolean;
    headerColor: string;
    title: string;
  };
}

export function useEnvironment(): EnvironmentConfig {
  const config = useMemo(() => {
    const hostname = window.location.hostname;
    const isTest = hostname.includes('teste') || 
                   hostname.includes('staging') || 
                   hostname.includes('dev') ||
                   hostname.includes('localhost');

    if (isTest) {
      return {
        env: 'test' as const,
        isTest: true,
        isProd: false,
        features: {
          showDebugInfo: true,
          enableBetaFeatures: true,
          allowTestData: true,
          showAdvancedOptions: true,
        },
        ui: {
          showEnvironmentBadge: true,
          headerColor: 'bg-yellow-500',
          title: 'WMS - AMBIENTE DE TESTE',
        }
      };
    }

    return {
      env: 'production' as const,
      isTest: false,
      isProd: true,
      features: {
        showDebugInfo: false,
        enableBetaFeatures: false,
        allowTestData: false,
        showAdvancedOptions: false,
      },
      ui: {
        showEnvironmentBadge: false,
        headerColor: 'bg-primary',
        title: 'WMS - Sistema de Gestão',
      }
    };
  }, []);

  return config;
}

// Hook para verificar se recurso está disponível no ambiente atual
export function useEnvironmentFeature(featureName: keyof EnvironmentConfig['features']): boolean {
  const { features } = useEnvironment();
  return features[featureName];
}

// Hook para configurações específicas do ambiente
export function useEnvironmentConfig() {
  const environment = useEnvironment();
  
  return {
    ...environment,
    
    // URLs da API baseadas no ambiente
    apiConfig: {
      supabaseUrl: environment.isTest ? 
        process.env.SUPABASE_TEST_URL || process.env.SUPABASE_URL : 
        process.env.SUPABASE_URL,
      // Outros configs...
    },
    
    // Configurações de comportamento
    behavior: {
      autoSave: environment.isProd,
      strictValidation: environment.isProd,
      showWarnings: environment.isTest,
    }
  };
}