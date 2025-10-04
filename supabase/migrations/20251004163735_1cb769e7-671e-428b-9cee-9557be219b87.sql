-- Allow users to delete their own workflows
CREATE POLICY "Users can delete their own workflows"
ON public.workflows
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);