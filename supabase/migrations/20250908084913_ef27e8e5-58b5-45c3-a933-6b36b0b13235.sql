-- Add unique constraint on user_id for wp_tokens table to support upsert operations
ALTER TABLE wp_tokens 
ADD CONSTRAINT wp_tokens_user_id_unique UNIQUE (user_id);