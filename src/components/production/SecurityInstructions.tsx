import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ExternalLink, CheckCircle, AlertTriangle } from "lucide-react";

export default function SecurityInstructions() {
  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard/project/vyqnnnyamoovzxmuvtkl/auth/providers', '_blank');
  };

  const openSecurityDocs = () => {
    window.open('https://supabase.com/docs/guides/auth/password-security', '_blank');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Critical Security Configuration Required</CardTitle>
          </div>
          <CardDescription>
            Complete these security configurations in Supabase before production deployment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800 dark:text-red-200">
              🚨 CRITICAL: Password Protection Disabled
            </AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300">
              Leaked password protection is currently disabled in your Supabase project.
              This is a major security risk for production use.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Badge variant="destructive">1</Badge>
              Enable Password Protection in Supabase
            </h4>
            
            <div className="pl-6 space-y-3">
              <div className="text-sm space-y-2">
                <p><strong>Step 1:</strong> Go to Supabase Dashboard → Authentication → Providers</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={openSupabaseDashboard}
                  className="ml-2"
                >
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Open Auth Providers
                </Button>
              </div>
              
              <div className="text-sm space-y-1">
                <p><strong>Step 2:</strong> Scroll down to "Password Settings"</p>
                <p><strong>Step 3:</strong> Enable the following settings:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>✅ <strong>Minimum Password Length:</strong> 8 characters</li>
                  <li>✅ <strong>Require uppercase letters:</strong> Enabled</li>
                  <li>✅ <strong>Require lowercase letters:</strong> Enabled</li>
                  <li>✅ <strong>Require numbers:</strong> Enabled</li>
                  <li>✅ <strong>Require special characters:</strong> Enabled</li>
                  <li>🔐 <strong>Leaked Password Protection:</strong> <Badge variant="destructive">ENABLE THIS</Badge></li>
                </ul>
              </div>

              <div className="text-sm">
                <p><strong>Step 4:</strong> Click "Save" to apply the changes</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Badge variant="secondary">2</Badge>
              Database Security (Completed ✅)
            </h4>
            
            <div className="pl-6 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Function search paths secured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>RLS policies properly configured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Admin access controls in place</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Badge variant="secondary">3</Badge>
              Error Monitoring (Configured ✅)
            </h4>
            
            <div className="pl-6 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Sentry integration added</span>
              </div>
              <p className="text-xs">
                <strong>Note:</strong> Update the Sentry DSN in <code>src/lib/sentry.ts</code> with your actual project DSN
              </p>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">
              Additional Security Recommendations
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300 space-y-2">
              <p>For production deployment, also consider:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Configure rate limiting for API endpoints</li>
                <li>Set up database backups and monitoring</li>
                <li>Enable 2FA for admin accounts</li>
                <li>Review and audit user permissions regularly</li>
                <li>Implement proper session timeout policies</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={openSecurityDocs}
              className="w-full"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Complete Security Documentation
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}