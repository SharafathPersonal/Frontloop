-- SQL Migration: Add image_url column to message_templates table
ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS image_url text;
