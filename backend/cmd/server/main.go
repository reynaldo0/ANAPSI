// Command server runs the ANAPSI accessibility API server.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"anapsi/backend/internal/config"
	"anapsi/backend/internal/database"
	"anapsi/backend/internal/httpapi"
)

func main() {
	cfg := config.Load()

	if err := database.Ensure(cfg); err != nil {
		log.Fatalf("[anapsi-api] database init failed: %v", err)
	}
	if err := database.LoadMemoryCache(); err != nil {
		log.Fatalf("[anapsi-api] load cache failed: %v", err)
	}
	if err := database.Seed(cfg); err != nil {
		log.Fatalf("[anapsi-api] database seed failed: %v", err)
	}
	if err := database.ValidateAuth(cfg); err != nil {
		log.Fatalf("[anapsi-api] auth init failed: %v", err)
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           httpapi.WithMiddleware(cfg, httpapi.NewRouter(cfg)),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       35 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1 MB — blocks oversized header floods
	}
	srv.RegisterOnShutdown(database.Close)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("[anapsi-api] anapsi-api Go backend listening on :%s (mysql ok)", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[anapsi-api] server error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Printf("[anapsi-api] shutting down…")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("[anapsi-api] shutdown error: %v", err)
	}
}
