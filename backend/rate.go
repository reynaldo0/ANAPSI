package main

import (
	"sync"
	"time"
)

type bucket struct {
	count   int
	resetAt int64
}

var (
	rateMu     sync.Mutex
	rateBuckets = map[string]*bucket{}
)

func checkRateLimit(key string, limit int, windowMs int64) (allowed bool, retryAfterSeconds int) {
	now := time.Now().UnixMilli()
	rateMu.Lock()
	defer rateMu.Unlock()
	b := rateBuckets[key]
	if b == nil || b.resetAt <= now {
		rateBuckets[key] = &bucket{count: 1, resetAt: now + windowMs}
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

func rateLimitKey(ip, action string) string {
	return action + ":" + ip
}