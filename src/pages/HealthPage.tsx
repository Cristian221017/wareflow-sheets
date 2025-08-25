import { ENV } from '@/config/env';

export default function HealthPage() {
  const healthData = {
    env: ENV.APP_ENV,
    mode: ENV.MODE,
    appName: ENV.APP_NAME,
    supabaseUrl: ENV.SUPABASE_URL,
    timestamp: new Date().toISOString(),
    status: 'ok'
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">System Health Check</h1>
        <pre className="bg-muted p-4 rounded-lg overflow-auto">
          {JSON.stringify(healthData, null, 2)}
        </pre>
      </div>
    </div>
  );
}