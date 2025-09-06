import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Database, 
  Key, 
  Monitor,
  Users,
  Lock
} from "lucide-react";

interface SecurityItem {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium';
  category: 'auth' | 'database' | 'monitoring' | 'access' | 'infrastructure';
  completed: boolean;
  actions?: {
    label: string;
    url?: string;
    onClick?: () => void;
  }[];
  details: string[];
}

export default function ProductionSecurityChecklist() {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const securityItems: SecurityItem[] = [
    {
      id: 'password-protection',
      title: 'Enable Leaked Password Protection',
      description: 'Protect against compromised passwords using database of known breaches',
      priority: 'critical',
      category: 'auth',
      completed: false,
      actions: [
        {
          label: 'Configure in Supabase',
          url: 'https://supabase.com/dashboard/project/vyqnnnyamoovzxmuvtkl/auth/providers'
        }
      ],
      details: [
        'Go to Supabase Dashboard → Authentication → Providers',
        'Scroll to "Password Settings"',
        'Enable "Leaked Password Protection"',
        'Set minimum password length to 8+ characters',
        'Require uppercase, lowercase, numbers, and special characters'
      ]
    },
    {
      id: 'rate-limiting',
      title: 'Configure API Rate Limiting',
      description: 'Prevent abuse and DDoS attacks with request rate limits',
      priority: 'critical',
      category: 'infrastructure',
      completed: true, // Now implemented
      actions: [
        {
          label: 'View Implementation',
          onClick: () => window.open('/src/utils/rateLimiter.ts', '_blank')
        }
      ],
      details: [
        'Configure Supabase Edge Functions rate limiting',
        'Set up Cloudflare or similar CDN with rate limiting',
        'Implement application-level rate limiting for sensitive endpoints',
        'Monitor and alert on unusual traffic patterns',
        'Configure different limits for authenticated vs anonymous users'
      ]
    },
    {
      id: 'database-backups',
      title: 'Set Up Automated Database Backups',
      description: 'Ensure data recovery capabilities with regular backups',
      priority: 'critical',
      category: 'database',
      completed: true, // Now implemented
      actions: [
        {
          label: 'Configure Backups',
          url: 'https://supabase.com/dashboard/project/vyqnnnyamoovzxmuvtkl/database/backups'
        },
        {
          label: 'Test Backup Function',
          url: 'https://supabase.com/dashboard/project/vyqnnnyamoovzxmuvtkl/functions/automated-security-backup'
        }
      ],
      details: [
        'Enable automated daily backups in Supabase',
        'Configure backup retention policy (30+ days)',
        'Set up backup monitoring and alerts',
        'Test backup restoration procedures',
        'Document recovery procedures for emergency'
      ]
    },
    {
      id: 'two-factor-auth',
      title: 'Enable 2FA for Admin Accounts',
      description: 'Add extra security layer for privileged accounts',
      priority: 'high',
      category: 'auth',
      completed: false,
      details: [
        'Enable 2FA for all super admin accounts',
        'Use authenticator apps (Google Authenticator, Authy)',
        'Provide backup recovery codes',
        'Regularly review and rotate 2FA devices',
        'Mandate 2FA for production database access'
      ]
    },
    {
      id: 'session-timeout',
      title: 'Implement Session Timeout Policies',
      description: 'Automatically log out inactive users for security',
      priority: 'high',
      category: 'auth',
      completed: true, // Now implemented
      details: [
        'Set appropriate session timeout limits (30-60 minutes)',
        'Implement sliding session expiration',
        'Configure shorter timeouts for admin users',
        'Add session warning before automatic logout',
        'Ensure secure session invalidation on logout'
      ]
    },
    {
      id: 'permission-audit',
      title: 'Regular User Permission Audits',
      description: 'Review and validate user access permissions regularly',
      priority: 'high',
      category: 'access',
      completed: false,
      details: [
        'Schedule monthly permission reviews',
        'Audit user roles and access levels',
        'Remove unused or inactive accounts',
        'Validate business need for each permission',
        'Document permission change procedures'
      ]
    },
    {
      id: 'monitoring-alerts',
      title: 'Security Monitoring and Alerting',
      description: 'Detect and respond to security incidents quickly',
      priority: 'high',
      category: 'monitoring',
      completed: true, // Now implemented
      details: [
        'Set up failed login attempt monitoring',
        'Configure alerts for suspicious activity',
        'Monitor database access patterns',
        'Track API usage and anomalies',
        'Implement security incident response procedures'
      ]
    },
    {
      id: 'database-encryption',
      title: 'Database Encryption at Rest',
      description: 'Ensure sensitive data is encrypted in storage',
      priority: 'medium',
      category: 'database',
      completed: true, // Supabase provides this by default
      details: [
        'Supabase provides encryption at rest by default',
        'Verify encryption status in dashboard',
        'Consider additional encryption for sensitive fields',
        'Document encryption keys and recovery procedures'
      ]
    },
    {
      id: 'ssl-certificates',
      title: 'SSL/TLS Certificate Management',
      description: 'Ensure secure communication with proper certificates',
      priority: 'medium',
      category: 'infrastructure',
      completed: false,
      details: [
        'Verify SSL certificate validity and expiration',
        'Set up automatic certificate renewal',
        'Use strong cipher suites and protocols',
        'Disable insecure protocol versions',
        'Monitor certificate health and expiration dates'
      ]
    },
    {
      id: 'access-logs',
      title: 'Comprehensive Access Logging',
      description: 'Log all access and changes for audit trails',
      priority: 'medium',
      category: 'monitoring',
      completed: false,
      details: [
        'Enable comprehensive audit logging',
        'Log authentication events and failures',
        'Track data access and modifications',
        'Store logs in tamper-proof location',
        'Set up log analysis and retention policies'
      ]
    }
  ];

  const toggleItem = (itemId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const getCompletionStats = () => {
    const totalItems = securityItems.length;
    const completedCount = securityItems.filter(item => 
      item.completed || checkedItems.has(item.id)
    ).length;
    const criticalItems = securityItems.filter(item => item.priority === 'critical').length;
    const completedCritical = securityItems.filter(item => 
      item.priority === 'critical' && (item.completed || checkedItems.has(item.id))
    ).length;
    
    return {
      total: totalItems,
      completed: completedCount,
      percentage: Math.round((completedCount / totalItems) * 100),
      critical: criticalItems,
      criticalCompleted: completedCritical
    };
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <Shield className="h-4 w-4 text-orange-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth':
        return <Key className="h-4 w-4" />;
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'monitoring':
        return <Monitor className="h-4 w-4" />;
      case 'access':
        return <Users className="h-4 w-4" />;
      case 'infrastructure':
        return <Lock className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const stats = getCompletionStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Production Security Checklist</CardTitle>
          </div>
          <CardDescription>
            Complete security configuration for production deployment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Progress Overview */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Overall Progress</h4>
              <Badge variant={stats.percentage >= 80 ? "default" : "secondary"}>
                {stats.completed}/{stats.total} Complete
              </Badge>
            </div>
            <Progress value={stats.percentage} className="w-full" />
            
            {stats.criticalCompleted < stats.critical && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800 dark:text-red-200">
                  Critical Security Items Pending
                </AlertTitle>
                <AlertDescription className="text-red-700 dark:text-red-300">
                  {stats.critical - stats.criticalCompleted} critical security items require immediate attention before production deployment.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Security Items */}
          <div className="space-y-4">
            {securityItems.map((item) => {
              const isCompleted = item.completed || checkedItems.has(item.id);
              
              return (
                <Card key={item.id} className={`transition-colors ${
                  isCompleted ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => toggleItem(item.id)}
                        disabled={item.completed}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(item.category)}
                          <h4 className="font-medium">{item.title}</h4>
                          <div className="flex items-center gap-1">
                            {getPriorityIcon(item.priority)}
                            <Badge variant={
                              item.priority === 'critical' ? 'destructive' :
                              item.priority === 'high' ? 'default' : 'secondary'
                            }>
                              {item.priority.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="text-sm">
                        <p className="font-medium mb-2">Implementation Steps:</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                          {item.details.map((detail, index) => (
                            <li key={index}>{detail}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {item.actions && (
                        <div className="flex flex-wrap gap-2">
                          {item.actions.map((action, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={action.onClick || (() => action.url && window.open(action.url, '_blank'))}
                            >
                              <ExternalLink className="mr-2 h-3 w-3" />
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">
              Security Implementation Timeline
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <div className="space-y-2">
                <p><strong>Before Production:</strong> Complete all CRITICAL items</p>
                <p><strong>Within 1 Week:</strong> Address all HIGH priority items</p>
                <p><strong>Within 1 Month:</strong> Implement remaining MEDIUM priority items</p>
                <p><strong>Ongoing:</strong> Regular audits and monitoring</p>
              </div>
            </AlertDescription>
          </Alert>

        </CardContent>
      </Card>
    </div>
  );
}