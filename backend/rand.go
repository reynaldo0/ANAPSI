package main

import "crypto/rand"

func randReader(b []byte) (int, error) {
	return rand.Read(b)
}