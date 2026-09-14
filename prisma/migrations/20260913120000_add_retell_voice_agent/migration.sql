-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "retell_agent_id" TEXT,
ADD COLUMN     "retell_api_key" TEXT,
ADD COLUMN     "retell_chat_agent_id" TEXT,
ADD COLUMN     "retell_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "retell_last_sync" TIMESTAMP(3);

