-- Create storage buckets for avatars, mechanic documents, and vehicle snapshots
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/jpg','image/webp']),
  ('mechanic-documents', 'mechanic-documents', false, 5242880, array['application/pdf','image/png','image/jpeg']),
  ('vehicle-snapshots', 'vehicle-snapshots', true, 5242880, array['image/png','image/jpeg','image/jpg'])
on conflict (id) do nothing;
