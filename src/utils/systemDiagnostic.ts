import { supabase } from '@/integrations/supabase/client';
import { log, error as logError } from './logger';

export interface DiagnosticResult {
  timestamp: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  data?: any;
  error?: string;
}

export class SystemDiagnostic {
  private results: DiagnosticResult[] = [];

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, data?: any, error?: string) {
    this.results.push({
      timestamp: new Date().toISOString(),
      test,
      status,
      message,
      data,
      error
    });
    
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    log(`${icon} [DIAGNOSTIC] ${test}: ${message}`, data);
  }

  async runFullDiagnostic(userId?: string): Promise<DiagnosticResult[]> {
    this.results = [];
    log('🔍 Starting full system diagnostic...');

    // 1. Test Supabase Connection
    await this.testSupabaseConnection();
    
    // 2. Test Authentication
    await this.testAuthentication();
    
    // 3. Test User Profile Loading
    if (userId) {
      await this.testUserProfileLoading(userId);
    }
    
    // 4. Test Database Tables
    await this.testDatabaseTables();

    // 5. Test Client Data Loading
    if (userId) {
      await this.testClientDataLoading(userId);
    }

    log('🏁 Diagnostic complete. Results:', this.results);
    return this.results;
  }

  private async testSupabaseConnection() {
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        this.addResult('supabase_connection', 'FAIL', 'Connection failed', null, error.message);
      } else {
        this.addResult('supabase_connection', 'PASS', 'Connection successful');
      }
    } catch (err: any) {
      this.addResult('supabase_connection', 'FAIL', 'Connection exception', null, err.message);
    }
  }

  private async testAuthentication() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        this.addResult('authentication', 'FAIL', 'Auth session error', null, error.message);
        return;
      }

      if (!session) {
        this.addResult('authentication', 'WARN', 'No active session');
        return;
      }

      this.addResult('authentication', 'PASS', 'User authenticated', {
        userId: session.user.id,
        email: session.user.email,
        lastSignIn: session.user.last_sign_in_at
      });

    } catch (err: any) {
      this.addResult('authentication', 'FAIL', 'Auth exception', null, err.message);
    }
  }

  private async testUserProfileLoading(userId: string) {
    try {
      // Test profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        this.addResult('user_profile', 'FAIL', 'Profile loading failed', null, profileError.message);
      } else {
        this.addResult('user_profile', 'PASS', 'Profile loaded successfully', profile);
      }

    } catch (err: any) {
      this.addResult('user_profile', 'FAIL', 'Profile loading exception', null, err.message);
    }
  }

  private async testDatabaseTables() {
    // Test each table individually with proper typing
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      if (profilesError) {
        this.addResult('table_profiles', 'FAIL', 'Table profiles access failed', null, profilesError.message);
      } else {
        this.addResult('table_profiles', 'PASS', 'Table profiles accessible', { recordCount: profilesData?.length || 0 });
      }
    } catch (err: any) {
      this.addResult('table_profiles', 'FAIL', 'Table profiles exception', null, err.message);
    }

    try {
      const { data: transportadorasData, error: transportadorasError } = await supabase
        .from('transportadoras')
        .select('*')
        .limit(1);

      if (transportadorasError) {
        this.addResult('table_transportadoras', 'FAIL', 'Table transportadoras access failed', null, transportadorasError.message);
      } else {
        this.addResult('table_transportadoras', 'PASS', 'Table transportadoras accessible', { recordCount: transportadorasData?.length || 0 });
      }
    } catch (err: any) {
      this.addResult('table_transportadoras', 'FAIL', 'Table transportadoras exception', null, err.message);
    }

    try {
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .limit(1);

      if (clientesError) {
        this.addResult('table_clientes', 'FAIL', 'Table clientes access failed', null, clientesError.message);
      } else {
        this.addResult('table_clientes', 'PASS', 'Table clientes accessible', { recordCount: clientesData?.length || 0 });
      }
    } catch (err: any) {
      this.addResult('table_clientes', 'FAIL', 'Table clientes exception', null, err.message);
    }
  }

  private async testClientDataLoading(userId: string) {
    try {
      // Test direct email matching
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        this.addResult('client_data', 'WARN', 'No user email for client matching');
        return;
      }

      // Test transportadora by email
      const { data: transportadoraByEmail, error: transportadoraEmailError } = await supabase
        .from('transportadoras')
        .select('*')
        .eq('email', user.email);

      if (transportadoraEmailError) {
        this.addResult('transportadora_email_match', 'FAIL', 'Transportadora email lookup failed', null, transportadoraEmailError.message);
      } else if (transportadoraByEmail && transportadoraByEmail.length > 0) {
        this.addResult('transportadora_email_match', 'PASS', 'Transportadora found by email', transportadoraByEmail[0]);
      } else {
        this.addResult('transportadora_email_match', 'WARN', 'No transportadora found by email');
      }

      // Test cliente by email
      const { data: clienteByEmail, error: clienteEmailError } = await supabase
        .from('clientes')
        .select('*')
        .eq('email', user.email);

      if (clienteEmailError) {
        this.addResult('cliente_email_match', 'FAIL', 'Cliente email lookup failed', null, clienteEmailError.message);
      } else if (clienteByEmail && clienteByEmail.length > 0) {
        this.addResult('cliente_email_match', 'PASS', 'Cliente found by email', clienteByEmail[0]);
      } else {
        this.addResult('cliente_email_match', 'WARN', 'No cliente found by email');
      }

    } catch (err: any) {
      this.addResult('client_data', 'FAIL', 'Client data loading exception', null, err.message);
    }
  }

  getResults(): DiagnosticResult[] {
    return this.results;
  }
}

// Singleton instance
export const systemDiagnostic = new SystemDiagnostic();