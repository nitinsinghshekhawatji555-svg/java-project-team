-- Add request_id column to notifications table for direct deep-linking
ALTER TABLE public.notifications 
ADD COLUMN request_id uuid REFERENCES public.rescue_requests(id) ON DELETE CASCADE;
