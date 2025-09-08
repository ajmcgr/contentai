-- Drop the existing constraint
ALTER TABLE content_templates 
DROP CONSTRAINT content_templates_template_type_check;

-- Add the new constraint with additional allowed values
ALTER TABLE content_templates 
ADD CONSTRAINT content_templates_template_type_check 
CHECK (template_type = ANY (ARRAY['blog_post'::text, 'product_description'::text, 'landing_page'::text, 'social_media'::text, 'content_settings'::text, 'publishing_settings'::text]));