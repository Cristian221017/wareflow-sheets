import { supabase } from '@/integrations/supabase/client';
import { log, warn, error, audit } from './logger';

interface SecurityEvent {
  type: 'failed_login' | 'suspicious_activity' | 'permission_escalation' | 'data_access' | 'session_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  userEmail?: string;
  metadata: Record<string, any>;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

class SecurityMonitor {
  private failedLoginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  private suspiciousIPs = new Set<string>();
  private logThrottle = new Map<string, number>();
  private MAX_FAILED_ATTEMPTS = 5;
  private LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private LOG_THROTTLE_INTERVAL = 5000; // 5 seconds between similar logs

  async recordSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    // Throttle similar events to prevent spam
    const eventKey = `${event.type}_${event.userId || 'anonymous'}`;
    const now = Date.now();
    const lastLog = this.logThrottle.get(eventKey);
    
    if (lastLog && (now - lastLog < this.LOG_THROTTLE_INTERVAL)) {
      return; // Skip this log to prevent spam
    }
    
    this.logThrottle.set(eventKey, now);

    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      ip: this.getClientIP(),
      userAgent: navigator?.userAgent
    };

    // Log locally (only for high severity to reduce noise)
    if (event.severity === 'high' || event.severity === 'critical') {
      const message = `Security Event: ${event.type} (${event.severity})`;
      error(message, securityEvent);
      
      // Store in database for high severity events
      try {
        await this.persistSecurityEvent(securityEvent);
      } catch (err) {
        error('Failed to persist security event:', err);
      }
      
      await this.handleHighSeverityEvent(securityEvent);
    }
  }

  async recordFailedLogin(email: string, ip?: string) {
    const key = ip || email;
    const now = Date.now();
    
    const attempts = this.failedLoginAttempts.get(key) || { count: 0, lastAttempt: 0 };
    
    // Reset counter if lockout period has passed
    if (now - attempts.lastAttempt > this.LOCKOUT_DURATION) {
      attempts.count = 0;
    }
    
    attempts.count++;
    attempts.lastAttempt = now;
    this.failedLoginAttempts.set(key, attempts);

    await this.recordSecurityEvent({
      type: 'failed_login',
      severity: attempts.count > this.MAX_FAILED_ATTEMPTS ? 'high' : 'medium',
      userEmail: email,
      metadata: {
        attemptCount: attempts.count,
        ip: ip,
        isLocked: attempts.count > this.MAX_FAILED_ATTEMPTS
      }
    });

    if (attempts.count > this.MAX_FAILED_ATTEMPTS && ip) {
      this.suspiciousIPs.add(ip);
    }

    return {
      isLocked: attempts.count > this.MAX_FAILED_ATTEMPTS,
      remainingTime: this.LOCKOUT_DURATION - (now - attempts.lastAttempt)
    };
  }

  async recordSuspiciousActivity(userId: string, activity: string, metadata: Record<string, any>) {
    await this.recordSecurityEvent({
      type: 'suspicious_activity',
      severity: 'medium',
      userId,
      metadata: {
        activity,
        ...metadata
      }
    });
  }

  async recordDataAccess(userId: string, table: string, operation: string, recordCount?: number) {
    // Only record for sensitive operations or large data access
    if (operation === 'DELETE' || (recordCount && recordCount > 100)) {
      await this.recordSecurityEvent({
        type: 'data_access',
        severity: operation === 'DELETE' ? 'high' : 'medium',
        userId,
        metadata: {
          table,
          operation,
          recordCount
        }
      });
    }
  }

  async recordPermissionEscalation(userId: string, attemptedAction: string, userRole: string) {
    await this.recordSecurityEvent({
      type: 'permission_escalation',
      severity: 'high',
      userId,
      metadata: {
        attemptedAction,
        userRole,
        hasPermission: false
      }
    });
  }

  async recordSessionAnomaly(userId: string, anomalyType: string, metadata: Record<string, any>) {
    await this.recordSecurityEvent({
      type: 'session_anomaly',
      severity: anomalyType === 'concurrent_sessions' ? 'medium' : 'low',
      userId,
      metadata: {
        anomalyType,
        ...metadata
      }
    });
  }

  isIPSuspicious(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }

  isAccountLocked(email: string, ip?: string): boolean {
    const key = ip || email;
    const attempts = this.failedLoginAttempts.get(key);
    
    if (!attempts) return false;
    
    const now = Date.now();
    const timeSinceLastAttempt = now - attempts.lastAttempt;
    
    return attempts.count > this.MAX_FAILED_ATTEMPTS && timeSinceLastAttempt < this.LOCKOUT_DURATION;
  }

  getRemainingLockoutTime(email: string, ip?: string): number {
    const key = ip || email;
    const attempts = this.failedLoginAttempts.get(key);
    
    if (!attempts) return 0;
    
    const now = Date.now();
    const elapsed = now - attempts.lastAttempt;
    
    return Math.max(0, this.LOCKOUT_DURATION - elapsed);
  }

  private async persistSecurityEvent(event: SecurityEvent) {
    try {
      const { error } = await (supabase.rpc as any)('log_security_event', {
        p_event_type: event.type,
        p_severity: event.severity,
        p_user_id: event.userId || null,
        p_user_email: event.userEmail || null,
        p_metadata: event.metadata,
        p_ip: event.ip || null,
        p_user_agent: event.userAgent || null
      });

      if (error) {
        console.warn('Failed to persist security event:', error);
      }
    } catch (err) {
      console.warn('Error persisting security event:', err);
    }
  }

  private async handleHighSeverityEvent(event: SecurityEvent) {
    // Could send alerts, notifications, etc.
    log(`🚨 High severity security event detected: ${event.type}`, event);
    
    // For critical events, could automatically take actions like:
    // - Temporary account suspension
    // - Force password reset
    // - Notify administrators
    if (event.severity === 'critical') {
      audit('CRITICAL_SECURITY_EVENT', 'SECURITY', event);
    }
  }

  private getClientIP(): string | undefined {
    // This is limited in browser environment
    // In production, this would come from server-side logging
    return undefined;
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [key, attempts] of this.failedLoginAttempts.entries()) {
      if (attempts.lastAttempt < cutoff) {
        this.failedLoginAttempts.delete(key);
      }
    }
  }
}

export const securityMonitor = new SecurityMonitor();

// Cleanup every hour
if (typeof window !== 'undefined') {
  setInterval(() => {
    securityMonitor.cleanup();
  }, 60 * 60 * 1000);
}

// Hook for React components
export function useSecurityMonitor() {
  return {
    recordFailedLogin: securityMonitor.recordFailedLogin.bind(securityMonitor),
    recordSuspiciousActivity: securityMonitor.recordSuspiciousActivity.bind(securityMonitor),
    recordDataAccess: securityMonitor.recordDataAccess.bind(securityMonitor),
    recordPermissionEscalation: securityMonitor.recordPermissionEscalation.bind(securityMonitor),
    recordSessionAnomaly: securityMonitor.recordSessionAnomaly.bind(securityMonitor),
    isAccountLocked: securityMonitor.isAccountLocked.bind(securityMonitor),
    getRemainingLockoutTime: securityMonitor.getRemainingLockoutTime.bind(securityMonitor)
  };
}