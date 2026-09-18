// Package ratelimit provides an in-memory sliding fixed-window rate limiter
// keyed by an arbitrary string (typically "action:ip").
package ratelimit

import (
	"sync"
	"time"
)

type bucket struct {
	count   int
	resetAt int64
}

var (
	mu          sync.Mutex
	buckets     = map[string]*bucket{}
	maxBuckets  = 10000
	lastSweepAt int64
)

// Check records a request for key and reports whether it is allowed within
// the limit. The second return is the Retry-After value in seconds (0 when
// allowed or the window has not elapsed).
func Check(key string, limit int, windowMs int64) (allowed bool, retryAfterSeconds int) {
	now := time.Now().UnixMilli()
	mu.Lock()
	defer mu.Unlock()

	// Opportunistic cleanup prevents unbounded memory growth under high
	// churn of distinct keys (e.g. spoofed client IPs).
	if len(buckets) > maxBuckets && now-lastSweepAt > 60_000 {
		for k, b := range buckets {
			if b.resetAt <= now {
				delete(buckets, k)
			}
		}
		lastSweepAt = now
	}

	b := buckets[key]
	if b == nil || b.resetAt <= now {
		buckets[key] = &bucket{count: 1, resetAt: now + windowMs}
		return true, 0
	}
	b.count++
	if b.count <= limit {
		return true, 0
	}
	retryAfterSeconds = int((b.resetAt - now + 999) / 1000)
	if retryAfterSeconds < 1 {
		retryAfterSeconds = 1
	}
	return false, retryAfterSeconds
}

// Key builds a rate-limit key from a client address and an action name.
func Key(ip, action string) string {
	return action + ":" + ip
}
