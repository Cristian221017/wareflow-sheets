import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Database, Wifi, User } from 'lucide-react';
import { ENV } from '@/config/env';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function DiagnosticPage() {
  const { user } = useAuth();
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    // Test database connection
    const testDb = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        setDbStatus(error ? 'error' : 'ok');
      } catch {
        setDbStatus('error');
      }
    };

    // Test realtime connection
    const channel = supabase.channel('diagnostic-test')
      .on('broadcast', { event: 'test' }, () => {
        setRealtimeStatus('connected');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CLOSED') {
          setRealtimeStatus('disconnected');
        }
      });

    testDb();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const diagnostics = [
    {
      title: 'Environment',
      icon: <Activity className="w-5 h-5" />,
      status: ENV.APP_ENV,
      details: {
        'App Name': ENV.APP_NAME,
        'Mode': ENV.MODE,
        'Environment': ENV.APP_ENV,
        'Build': 'Latest'
      }
    },
    {
      title: 'Database',
      icon: <Database className="w-5 h-5" />,
      status: dbStatus,
      details: {
        'Supabase URL': ENV.SUPABASE_URL,
        'Connection': dbStatus === 'ok' ? 'Active' : 'Error',
        'Auth': user ? 'Authenticated' : 'Anonymous'
      }
    },
    {
      title: 'Realtime',
      icon: <Wifi className="w-5 h-5" />,
      status: realtimeStatus,
      details: {
        'Status': realtimeStatus,
        'WebSocket': realtimeStatus === 'connected' ? 'Active' : 'Inactive'
      }
    },
    {
      title: 'User Session',
      icon: <User className="w-5 h-5" />,
      status: user ? 'authenticated' : 'anonymous',
      details: {
        'User ID': user?.id?.substring(0, 8) + '...' || 'N/A',
        'Email': user?.email || 'N/A',
        'Role': user?.role || 'N/A',
        'Type': user?.type || 'N/A'
      }
    }
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'ok' || status === 'connected' || status === 'authenticated' || status === 'prod') {
      return <Badge variant="default" className="bg-green-500">OK</Badge>;
    }
    if (status === 'staging') {
      return <Badge variant="secondary" className="bg-yellow-500">STAGING</Badge>;
    }
    if (status === 'error' || status === 'disconnected') {
      return <Badge variant="destructive">ERROR</Badge>;
    }
    return <Badge variant="outline">{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Diagnostics</h1>
          <p className="text-muted-foreground">Monitor system health and configuration</p>
        </div>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {diagnostics.map((diagnostic, diagIndex) => (
          <Card key={`${diagnostic.title}-${diagIndex}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {diagnostic.icon}
                {diagnostic.title}
              </CardTitle>
              {getStatusBadge(diagnostic.status)}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(diagnostic.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Details</CardTitle>
          <CardDescription>Current environment configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
{JSON.stringify({
  environment: ENV.APP_ENV,
  mode: ENV.MODE,
  appName: ENV.APP_NAME,
  supabaseUrl: ENV.SUPABASE_URL,
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  viewport: `${window.innerWidth}x${window.innerHeight}`
}, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}