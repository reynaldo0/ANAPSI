package main

import (
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	cfg := loadConfig()

	if err := ensureDatabase(cfg); err != nil {
		log.Fatalf("[blindspot-api] database init failed: %v", err)
	}
	if err := loadMemoryCache(cfg); err != nil {
		log.Fatalf("[blindspot-api] load cache failed: %v", err)
	}
	if err := seedDatabase(cfg); err != nil {
		log.Fatalf("[blindspot-api] database seed failed: %v", err)
	}

	if err := validateAuth(cfg); err != nil {
		log.Fatalf("[blindspot-api] auth init failed: %v", err)
	}

	log.Printf("[blindspot-api] blindspot-api Go backend listening on :%s (mysql ok)", cfg.Port)
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           withMiddleware(cfg, newRouter(cfg)),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("[blindspot-api] server error: %v", err)
	}
	os.Exit(0)
}