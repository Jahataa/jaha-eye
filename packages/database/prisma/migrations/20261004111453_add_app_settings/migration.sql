-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "llm_api_key" TEXT,
    "llm_base_url" TEXT,
    "default_model_name" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "default_temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);
