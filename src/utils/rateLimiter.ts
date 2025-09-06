interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (context: any) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Cleanup old entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.requests.entries()) {
        if (now > entry.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 60 * 1000);
  }

  isAllowed(context?: any): { allowed: boolean; remainingRequests: number; resetTime: number } {
    const key = this.config.keyGenerator ? this.config.keyGenerator(context) : 'default';
    const now = Date.now();
    
    let entry = this.requests.get(key);
    
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
      this.requests.set(key, entry);
    }
    
    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: entry.resetTime
      };
    }
    
    entry.count++;
    
    return {
      allowed: true,
      remainingRequests: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  getRemainingTime(context?: any): number {
    const key = this.config.keyGenerator ? this.config.keyGenerator(context) : 'default';
    const entry = this.requests.get(key);
    
    if (!entry) return 0;
    
    return Math.max(0, entry.resetTime - Date.now());
  }
}

// Default rate limiters
export const apiRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (context) => context?.userId || context?.ip || 'anonymous'
});

export const authRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyGenerator: (context) => context?.email || context?.ip || 'anonymous'
});

export const sensitiveActionLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyGenerator: (context) => `${context?.userId}-${context?.action}` || 'anonymous'
});

// Middleware function for easy integration
export function withRateLimit<T extends (...args: any[]) => any>(
  fn: T,
  limiter: RateLimiter,
  contextExtractor?: (...args: Parameters<T>) => any
): T {
  return ((...args: Parameters<T>) => {
    const context = contextExtractor ? contextExtractor(...args) : {};
    const result = limiter.isAllowed(context);
    
    if (!result.allowed) {
      const remainingTime = Math.ceil(limiter.getRemainingTime(context) / 1000);
      const error = new Error(`Rate limit exceeded. Try again in ${remainingTime} seconds.`);
      (error as any).code = 'RATE_LIMIT_EXCEEDED';
      (error as any).remainingTime = remainingTime;
      throw error;
    }
    
    return fn(...args);
  }) as T;
}

export { RateLimiter };