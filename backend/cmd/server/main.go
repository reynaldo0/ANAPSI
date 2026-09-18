// Command server runs the Blindspot accessibility API server.
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

	"blindspot/backend/internal/config"
	"blindspot/backend/internal/database"
	"blindspot/backend/internal/httpapi"
)

func main() {
	cfg := config.Load()

	if err := database.Ensure(cfg); err != nil {
		log.Fatalf("[blindspot-api] database init failed: %v", err)
	}
	if err := database.LoadMemoryCache(); err != nil {
		log.Fatalf("[blindspot-api] load cache failed: %v", err)
	}
	if err := database.Seed(cfg); err != nil {
		log.Fatalf("[blindspot-api] database seed failed: %v", err)
	}
	if err := database.ValidateAuth(cfg); err != nil {
		log.Fatalf("[blindspot-api] auth init failed: %v", err)
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           httpapi.WithMiddleware(cfg, httpapi.NewRouter(cfg)),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       35 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("[blindspot-api] blindspot-api Go backend listening on :%s (mysql ok)", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[blindspot-api] server error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Printf("[blindspot-api] shutting down…")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("[blindspot-api] shutdown error: %v", err)
	}
}
