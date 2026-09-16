package main

import (
	"net/http"
	"strings"
)

func handleAssistant(w http.ResponseWriter, r *http.Request, cfg *Config) {
	ip := clientIPHeader(r)
	if allowed, retry := checkRateLimit(rateLimitKey(ip, "ai"), 20, 60000); !allowed {
		writeErr(w, fail("Terlalu banyak pertanyaan. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	body := struct {
		Message interface{} `json:"message"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	msg := strings.TrimSpace(asString(body.Message))
	if msg == "" {
		writeErr(w, fail("Pertanyaan tidak boleh kosong.", "VALIDATION_ERROR", 422))
		return
	}
	if len(msg) > 400 {
		writeErr(w, fail("Pertanyaan terlalu panjang (maksimal 400 karakter).", "VALIDATION_ERROR", 422))
		return
	}
	answer := askAssistant(AssistantRequest{Message: msg})
	ok(w, map[string]interface{}{"answer": answer, "disclaimer": ASSISTANT_DISCLAIMER})
}

func handleAnalyzeVoice(w http.ResponseWriter, r *http.Request, cfg *Config) {
	ip := clientIPHeader(r)
	if allowed, retry := checkRateLimit(rateLimitKey(ip, "ai"), 20, 60000); !allowed {
		writeErr(w, fail("Terlalu banyak permintaan. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	body := struct {
		Transcript interface{} `json:"transcript"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	transcript := strings.TrimSpace(asString(body.Transcript))
	if transcript == "" {
		writeErr(w, fail("Transkripsi tidak boleh kosong.", "VALIDATION_ERROR", 422))
		return
	}
	if len(transcript) > 2000 {
		writeErr(w, fail("Transkripsi terlalu panjang (maksimal 2000 karakter).", "VALIDATION_ERROR", 422))
		return
	}
	structured := structureReportTranscript(transcript)
	ok(w, map[string]interface{}{
		"provider": "deterministic",
		"suggestion": map[string]interface{}{
			"category":          structured.Category,
			"categoryLabel":     reportCategoryLabel(structured.Category),
			"description":       structured.Description,
			"severity":          structured.Severity,
			"affectedProfiles":  structured.AffectedProfiles,
			"suggestedLocation": structured.SuggestedLocation,
		},
		"note": "AI suggestion. Tinjau sebelum mengirim.",
	})
}

func handleAnalyzeImage(w http.ResponseWriter, r *http.Request, cfg *Config) {
	ip := clientIPHeader(r)
	if allowed, retry := checkRateLimit(rateLimitKey(ip, "ai-image"), 10, 60000); !allowed {
		writeErr(w, fail("Terlalu banyak permintaan. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	body := struct {
		Filename  interface{} `json:"filename"`
		MimeType  interface{} `json:"mimeType"`
		SizeBytes interface{} `json:"sizeBytes"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	filename := strings.TrimSpace(asString(body.Filename))
	if filename == "" {
		writeErr(w, fail("Nama file tidak boleh kosong.", "VALIDATION_ERROR", 422))
		return
	}
	if mime, ok := body.MimeType.(string); ok && mime != "" {
		allowed := false
		for _, t := range ALLOWED_PHOTO_TYPES {
			if t == mime {
				allowed = true
				break
			}
		}
		if !allowed {
			writeErr(w, fail("Tipe file tidak didukung. Gunakan: "+strings.Join(ALLOWED_PHOTO_TYPES, ", ")+".", "VALIDATION_ERROR", 422))
			return
		}
	}
	if size, ok := body.SizeBytes.(float64); ok && size > MAX_PHOTO_BYTES {
		writeErr(w, fail("Ukuran file terlalu besar. Maksimal 5 MB.", "VALIDATION_ERROR", 422))
		return
	}
	result := analyzeImageDeterministic(filename)
	ok(w, result)
}

func handleChatbot(w http.ResponseWriter, r *http.Request, cfg *Config) {
	ip := clientIPHeader(r)
	if allowed, retry := checkRateLimit(rateLimitKey(ip, "chatbot"), 20, 60000); !allowed {
		writeErr(w, fail("Terlalu sering. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	body := struct {
		Message interface{}   `json:"message"`
		History []HistoryMessage `json:"history"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	msg := strings.TrimSpace(asString(body.Message))
	if msg == "" {
		writeErr(w, fail("Pesan tidak boleh kosong", "VALIDATION_ERROR", 422))
		return
	}
	if len(msg) > 1000 {
		writeErr(w, fail("Pesan maksimal 1000 karakter", "VALIDATION_ERROR", 422))
		return
	}

	contextText := ""
	if ans := askAssistant(AssistantRequest{Message: msg}); ans.Intent != "" {
		bullets := ans.Bullets
		if bullets == nil {
			bullets = []string{}
		}
		if len(bullets) > 3 {
			bullets = bullets[:3]
		}
		contextText = "DATA BLINDSPOT: intent=" + ans.Intent + " | " + ans.AnswerText + " Bullets: " + strings.Join(bullets, "; ")
	}

	if !groqConfigured(cfg) {
		ans := askAssistant(AssistantRequest{Message: msg})
		bullet := ""
		if len(ans.Bullets) > 0 {
			bullet = ans.Bullets[0]
		}
		reply := strings.TrimSpace(ans.AnswerText + " " + bullet)
		ok(w, map[string]interface{}{
			"reply":      reply,
			"source":     "deterministic-fallback",
			"context":    contextText,
			"disclaimer": "Groq belum dikonfigurasi (set GROQ_API_KEY). Jawaban dari data BLINDSPOT deterministik.",
		})
		return
	}

	history := body.History
	if len(history) > 6 {
		history = history[len(history)-6:]
	}
	reply, err := groqChat(cfg, groqCompletionParams{history: history, msg: msg, context: contextText})
	if err != nil {
		writeErr(w, fail("Layanan AI belum tersedia. Coba lagi nanti.", "AI_UNAVAILABLE", 503))
		return
	}
	ok(w, map[string]interface{}{
		"reply": reply, "source": "groq", "model": groqChatModel,
	})
}

func handleChatbotTranscribe(w http.ResponseWriter, r *http.Request, cfg *Config) {
	ip := clientIPHeader(r)
	if allowed, retry := checkRateLimit(rateLimitKey(ip, "chatbot-stt"), 10, 60000); !allowed {
		writeErr(w, fail("Terlalu sering transcribe", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	if !groqConfigured(cfg) {
		writeErr(w, fail("Groq belum dikonfigurasi. Gunakan dikte browser sebagai fallback.", "STT_UNAVAILABLE", 503))
		return
	}
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeErr(w, fail("Data audio tidak valid.", "VALIDATION_ERROR", 422))
		return
	}
	file, header, err := r.FormFile("audio")
	if err != nil {
		writeErr(w, fail("File audio wajib (field 'audio')", "VALIDATION_ERROR", 422))
		return
	}
	defer file.Close()
	filename := header.Filename
	if filename == "" {
		filename = "audio.webm"
	}
	if header.Size > 10*1024*1024 {
		writeErr(w, fail("Audio maksimal 10MB", "VALIDATION_ERROR", 422))
		return
	}
	data := make([]byte, header.Size)
	read := 0
	for read < int(header.Size) {
		n, rErr := file.Read(data[read:])
		if n == 0 {
			break
		}
		read += n
		if rErr != nil {
			break
		}
	}
	data = data[:read]
	transcript, err := groqTranscribe(cfg, data, filename)
	if err != nil {
		writeErr(w, fail("Transkripsi gagal. Coba lagi nanti.", "STT_UNAVAILABLE", 503))
		return
	}
	ok(w, map[string]interface{}{"transcript": transcript, "model": groqSTTModel})
}