-- Create storage bucket for generated images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-images', 'generated-images', true);

-- Create policies for generated images storage
CREATE POLICY "Users can view generated images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'generated-images');

CREATE POLICY "Users can upload their own generated images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[2]);