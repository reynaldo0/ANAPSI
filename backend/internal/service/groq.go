package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"blindspot/backend/internal/config"
	"blindspot/backend/internal/model"
	"blindspot/backend/internal/util"
)

const groqChatURL = "https://api.groq.com/openai/v1/chat/completions"
const groqSTTURL = "https://api.groq.com/openai/v1/audio/transcriptions"
const GroqChatModel = "llama-3.3-70b-versatile"
const GroqSTTModel = "whisper-large-v3-turbo"

const chatbotSystemPrompt = `Kamu adalah BLINDSPOT Voice Chatbot khusus tunanetra. Berbeda dari Asisten deterministik: kamu adalah teman ngobrol empatik, ringkas, audio-first.
Aturan:
- Jawab singkat (1-3 kalimat), bahasa Indonesia, ramah, tidak bertele-tele.
- Selalu akhiri dengan 1 aksi yang bisa dilakukan: "Mau saya carikan rute, bacakan hambatan, atau laporkan?"
- Jika user tanya aksesibilitas spesifik tempat, JANGAN mengarang. Katakan "Saya cek data BLINDSPOT dulu ya" dan rangkum data yang diberikan di konteks.
- Prioritas: keselamatan > kecepatan > keindahan bahasa.
- Jangan output markdown berat, gunakan teks datar yang enak dibacakan TTS.`

type groqChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqChatRequest struct {
	Model       string            `json:"model"`
	Temperature float64           `json:"temperature"`
	MaxTokens   int               `json:"max_tokens"`
	Messages    []groqChatMessage `json:"messages"`
}

type groqChatChoice struct {
	Message groqChatMessage `json:"message"`
}

type groqChatResponse struct {
	Choices []groqChatChoice `json:"choices"`
}

type CompletionParams struct {
	history []HistoryMessage
	msg     string
	context string
}

// NewCompletionParams bundles chat history, the user's message and BLINDSPOT
// context for GroqChat.
func NewCompletionParams(history []HistoryMessage, msg, context string) CompletionParams {
	return CompletionParams{history: history, msg: msg, context: context}
}

// HistoryMessage is one chat history turn.
type HistoryMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// GroqConfigured reports whether the Groq API key is set.
func GroqConfigured(cfg *config.Config) bool {
	return cfg.GroqAPIKey != ""
}

func GroqChat(cfg *config.Config, params CompletionParams) (string, error) {
	messages := make([]groqChatMessage, 0, 2+len(params.history))
	messages = append(messages, groqChatMessage{Role: "system", Content: chatbotSystemPrompt + "\nKonteks data:\n" + params.context})
	for _, h := range params.history {
		role := h.Role
		if role != "user" && role != "assistant" {
			role = "user"
		}
		messages = append(messages, groqChatMessage{Role: role, Content: h.Content})
	}
	messages = append(messages, groqChatMessage{Role: "user", Content: params.msg})
	body := groqChatRequest{
		Model: GroqChatModel, Temperature: 0.6, MaxTokens: 400, Messages: messages,
	}
	payload, _ := json.Marshal(body)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, groqChatURL, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.GroqAPIKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("groq chat status %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	var parsed groqChatResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", err
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("groq chat no choices")
	}
	reply := strings.TrimSpace(parsed.Choices[0].Message.Content)
	if reply == "" {
		reply = "Maaf, saya belum menangkap. Bisa ulangi lebih pelan?"
	}
	return reply, nil
}

func GroqTranscribe(cfg *config.Config, data []byte, filename string) (string, error) {
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	part, err := mw.CreateFormFile("file", filename)
	if err != nil {
		return "", err
	}
	if _, err := part.Write(data); err != nil {
		return "", err
	}
	_ = mw.WriteField("model", GroqSTTModel)
	_ = mw.WriteField("language", "id")
	_ = mw.WriteField("response_format", "json")
	_ = mw.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, groqSTTURL, &buf)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+cfg.GroqAPIKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("groq stt status %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	var parsed struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", err
	}
	return parsed.Text, nil
}

// AnalyzeImageDeterministic derives a best-effort category from a filename.
func AnalyzeImageDeterministic(filename string) map[string]interface{} {
	lower := strings.ToLower(filename)
	patterns := []struct {
		re       string
		category string
	}{
		{`tangga|stair|step`, "STAIRS"},
		{`ramp|tanjakan`, "DAMAGED_RAMP"},
		{`guiding|tactile|pemandu`, "GUIDING_BLOCK"},
		{`trotoar|sidewalk|pavement`, "DAMAGED_SIDEWALK"},
		{`hambatan|obstacle|block`, "OBSTACLE"},
		{`elevator|lift`, "ELEVATOR"},
	}
	category := "OTHER"
	for _, p := range patterns {
		matched, _ := util.RegexpMatch(p.re, lower)
		if matched {
			category = p.category
			break
		}
	}
	return map[string]interface{}{
		"provider":        "deterministic-fallback",
		"visionAvailable": false,
		"suggestion": map[string]interface{}{
			"category":      category,
			"categoryLabel": model.ReportCategoryLabel(category),
			"confidence":    "low",
		},
		"note":       "Analisis gambar otomatis belum tersedia. Kategori ini adalah saran berdasarkan nama file. Tinjau dan sesuaikan sebelum mengirim laporan.",
		"disclaimer": "Saran ini bukan hasil analisis AI dan tidak menjamin aksesibilitas atau keselamatan. Tinjau semua field sebelum mengirim.",
	}
}
