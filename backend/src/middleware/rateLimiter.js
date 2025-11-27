/**
 * Simple rate limiting middleware
 * Tracks requests by IP address and limits requests per time window
 */

const rateLimitStore = new Map();

/**
 * Create a rate limiter middleware
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests per window
 * @param {string} options.message - Error message to return
 * @returns {Function} Express middleware
 */
export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 5, message = 'Too many requests, please try again later' } = {}) {
  return (req, res, next) => {
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                     req.headers['x-real-ip'] ||
                     req.connection?.remoteAddress ||
                     req.socket?.remoteAddress ||
                     'unknown';

    const now = Date.now();
    const key = `${req.path}:${clientIP}`;

    // Get or create request log for this IP
    let requestLog = rateLimitStore.get(key);

    if (!requestLog) {
      requestLog = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, requestLog);
    } else {
      // Check if window has expired
      if (now > requestLog.resetTime) {
        // Reset the window
        requestLog.count = 1;
        requestLog.resetTime = now + windowMs;
      } else {
        // Increment count
        requestLog.count++;

        // Check if limit exceeded
        if (requestLog.count > max) {
          const timeUntilReset = Math.ceil((requestLog.resetTime - now) / 1000);
          return res.status(429).json({
            error: message,
            retryAfter: timeUntilReset
          });
        }
      }
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - requestLog.count));
    res.setHeader('X-RateLimit-Reset', new Date(requestLog.resetTime).toISOString());

    next();
  };
}

/**
 * Cleanup old entries from the rate limit store
 * Should be called periodically (e.g., every hour)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime + 60000) { // Clean up entries 1 minute after expiry
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`Rate limiter: Cleaned up ${cleaned} expired entries`);
  }
}

// Run cleanup every hour
setInterval(cleanupRateLimitStore, 60 * 60 * 1000);

export default { createRateLimiter, cleanupRateLimitStore };
