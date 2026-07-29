-- Encrypted sync blobs (Geistesblitz media). Client encrypts before upload.
insert into storage.buckets (id, name, public, file_size_limit)
values ('sync-blobs', 'sync-blobs', false, 5242880)
on conflict (id) do nothing;

-- Paths: {user_id}/{spark_id}/drawing.enc.json | audio.enc.json
create policy "sync_blobs_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'sync-blobs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "sync_blobs_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'sync-blobs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "sync_blobs_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'sync-blobs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'sync-blobs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "sync_blobs_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'sync-blobs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
