-- Content Library Table
-- Run this SQL in your Supabase SQL Editor to create the content_library table

CREATE TABLE IF NOT EXISTS public.content_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('Twitter', 'YouTube', 'Instagram', 'Article', 'Podcast', 'Video', 'Book', 'Course', 'Other')),
    category TEXT NOT NULL CHECK (category IN (
        'Full Stack Development',
        'Business & Entrepreneurship',
        'Finance & Investing',
        'Marketing & Sales',
        'Personal Development',
        'Health & Fitness',
        'Golf',
        'Productivity',
        'Design',
        'Leadership',
        'Other'
    )),
    subcategories TEXT[],
    status TEXT NOT NULL DEFAULT 'To Watch' CHECK (status IN ('To Watch', 'In Progress', 'Completed', 'Implementing', 'Archived')),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    notes TEXT DEFAULT '',
    key_takeaways TEXT[],
    action_items TEXT[],
    tags TEXT[] DEFAULT '{}',
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    time_to_consume INTEGER, -- in minutes
    creator TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_favorite BOOLEAN DEFAULT FALSE,
    folder TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_content_library_user_id ON public.content_library(user_id);
CREATE INDEX IF NOT EXISTS idx_content_library_status ON public.content_library(status);
CREATE INDEX IF NOT EXISTS idx_content_library_category ON public.content_library(category);
CREATE INDEX IF NOT EXISTS idx_content_library_priority ON public.content_library(priority);
CREATE INDEX IF NOT EXISTS idx_content_library_is_favorite ON public.content_library(is_favorite);
CREATE INDEX IF NOT EXISTS idx_content_library_saved_at ON public.content_library(saved_at);
CREATE INDEX IF NOT EXISTS idx_content_library_tags ON public.content_library USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_content_library_folder ON public.content_library(folder);

-- Enable Row Level Security (RLS)
ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Users can only see their own content
CREATE POLICY "Users can view their own content"
    ON public.content_library
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own content
CREATE POLICY "Users can insert their own content"
    ON public.content_library
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own content
CREATE POLICY "Users can update their own content"
    ON public.content_library
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own content
CREATE POLICY "Users can delete their own content"
    ON public.content_library
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.content_library
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.content_library TO authenticated;
GRANT ALL ON public.content_library TO service_role;
