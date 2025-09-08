-- Add automatic article generation settings to content_templates table
-- This will be stored as part of the content_settings template_type

-- Create index for better performance on template lookups
CREATE INDEX IF NOT EXISTS idx_content_templates_user_type_name 
ON content_templates(user_id, template_type, name) 
WHERE template_type IN ('content_settings', 'publishing_settings', 'generation_settings');