-- Clear stored LLM API keys; keys live in OPENAI_API_KEY only.
UPDATE "app_settings" SET "llm_api_key" = NULL WHERE "llm_api_key" IS NOT NULL;
