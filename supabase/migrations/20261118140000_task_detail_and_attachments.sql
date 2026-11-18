-- Live task detail, comments and private proof-of-work attachments.
-- Additive migration: existing task records and history are preserved.

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  file_name text not null check (length(trim(file_name)) between 1 and 255),
  content_type text not null check (content_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now(),
  foreign key (task_id, organization_id)
    references public.tasks(id, organization_id) on delete cascade
);

create index if not exists task_attachments_task_created_idx
  on public.task_attachments(organization_id, task_id, created_at desc);

alter table public.task_attachments enable row level security;

drop policy if exists "task participants read attachments" on public.task_attachments;
create policy "task participants read attachments"
on public.task_attachments for select to authenticated
using (
  public.is_org_member(organization_id)
  and exists (
    select 1 from public.tasks t
    where t.id = task_attachments.task_id
      and t.organization_id = task_attachments.organization_id
      and (
        t.assigned_to = auth.uid()
        or t.created_by = auth.uid()
        or public.has_org_role(organization_id, array['org_admin','hr_admin','manager','supervisor'])
      )
  )
);

drop policy if exists "task participants register attachments" on public.task_attachments;
create policy "task participants register attachments"
on public.task_attachments for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and public.is_org_member(organization_id)
  and exists (
    select 1 from public.tasks t
    where t.id = task_attachments.task_id
      and t.organization_id = task_attachments.organization_id
      and (
        t.assigned_to = auth.uid()
        or t.created_by = auth.uid()
        or public.has_org_role(organization_id, array['org_admin','hr_admin','manager','supervisor'])
      )
  )
);

-- A private bucket: downloads must use an authenticated session or signed URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-proof',
  'task-proof',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'];

drop policy if exists "task proof participants upload" on storage.objects;
create policy "task proof participants upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'task-proof'
  and split_part(name, '/', 3) = auth.uid()::text
  and exists (
    select 1
    from public.tasks t
    where t.id::text = split_part(name, '/', 2)
      and t.organization_id::text = split_part(name, '/', 1)
      and public.is_org_member(t.organization_id)
      and (
        t.assigned_to = auth.uid()
        or t.created_by = auth.uid()
        or public.has_org_role(t.organization_id, array['org_admin','hr_admin','manager','supervisor'])
      )
  )
);

drop policy if exists "task proof participants read" on storage.objects;
create policy "task proof participants read"
on storage.objects for select to authenticated
using (
  bucket_id = 'task-proof'
  and exists (
    select 1
    from public.task_attachments a
    join public.tasks t
      on t.id = a.task_id
     and t.organization_id = a.organization_id
    where a.storage_path = storage.objects.name
      and public.is_org_member(t.organization_id)
      and (
        t.assigned_to = auth.uid()
        or t.created_by = auth.uid()
        or public.has_org_role(t.organization_id, array['org_admin','hr_admin','manager','supervisor'])
      )
  )
);

create or replace function public.get_organization_task_detail(
  p_organization_id uuid,
  p_task_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_task jsonb;
  v_comments jsonb;
  v_history jsonb;
  v_attachments jsonb;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select to_jsonb(t) ||
         jsonb_build_object(
           'assignee_name', coalesce(assignee.display_name, 'Unassigned'),
           'created_by_name', coalesce(creator.display_name, 'Team member')
         )
    into v_task
  from public.tasks t
  left join public.profiles assignee on assignee.id = t.assigned_to
  left join public.profiles creator on creator.id = t.created_by
  where t.id = p_task_id
    and t.organization_id = p_organization_id
    and (
      t.assigned_to = auth.uid()
      or t.created_by = auth.uid()
      or public.has_org_role(p_organization_id, array['org_admin','hr_admin','manager','supervisor'])
    );

  if v_task is null then
    raise exception 'TASK_NOT_FOUND_OR_NOT_AUTHORIZED' using errcode = 'P0002';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'body', c.body,
        'author_id', c.author_id,
        'author_name', coalesce(p.display_name, 'Team member'),
        'created_at', c.created_at
      ) order by c.created_at asc
    ),
    '[]'::jsonb
  )
  into v_comments
  from public.task_comments c
  left join public.profiles p on p.id = c.author_id
  where c.organization_id = p_organization_id
    and c.task_id = p_task_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', h.id,
        'from_status', h.from_status,
        'to_status', h.to_status,
        'note', h.note,
        'changed_by', h.changed_by,
        'actor_name', coalesce(p.display_name, 'System'),
        'created_at', h.created_at
      ) order by h.created_at asc
    ),
    '[]'::jsonb
  )
  into v_history
  from public.task_status_history h
  left join public.profiles p on p.id = h.changed_by
  where h.organization_id = p_organization_id
    and h.task_id = p_task_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'storage_path', a.storage_path,
        'file_name', a.file_name,
        'content_type', a.content_type,
        'size_bytes', a.size_bytes,
        'uploaded_by', a.uploaded_by,
        'uploader_name', coalesce(p.display_name, 'Team member'),
        'created_at', a.created_at
      ) order by a.created_at asc
    ),
    '[]'::jsonb
  )
  into v_attachments
  from public.task_attachments a
  left join public.profiles p on p.id = a.uploaded_by
  where a.organization_id = p_organization_id
    and a.task_id = p_task_id;

  return jsonb_build_object(
    'task', v_task,
    'comments', v_comments,
    'history', v_history,
    'attachments', v_attachments
  );
end;
$$;

revoke all on function public.get_organization_task_detail(uuid, uuid) from public, anon;
grant execute on function public.get_organization_task_detail(uuid, uuid) to authenticated;

create or replace function public.add_task_comment(
  p_organization_id uuid,
  p_task_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_comment public.task_comments%rowtype;
  v_author_name text;
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_body, ''))) < 1 or length(p_body) > 10000 then
    raise exception 'INVALID_COMMENT' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.tasks t
    where t.id = p_task_id
      and t.organization_id = p_organization_id
      and (
        t.assigned_to = auth.uid()
        or t.created_by = auth.uid()
        or public.has_org_role(p_organization_id, array['org_admin','hr_admin','manager','supervisor'])
      )
  ) then
    raise exception 'TASK_NOT_FOUND_OR_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  insert into public.task_comments (
    organization_id, task_id, author_id, body
  ) values (
    p_organization_id, p_task_id, auth.uid(), trim(p_body)
  )
  returning * into v_comment;

  select coalesce(display_name, 'Team member')
    into v_author_name
  from public.profiles
  where id = auth.uid();

  insert into public.audit_logs (
    organization_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    p_organization_id, auth.uid(), 'task.comment_added', 'task', p_task_id,
    jsonb_build_object('comment_id', v_comment.id)
  );

  return jsonb_build_object(
    'id', v_comment.id,
    'body', v_comment.body,
    'author_id', v_comment.author_id,
    'author_name', coalesce(v_author_name, 'Team member'),
    'created_at', v_comment.created_at
  );
end;
$$;

revoke all on function public.add_task_comment(uuid, uuid, text) from public, anon;
grant execute on function public.add_task_comment(uuid, uuid, text) to authenticated;

create or replace function public.register_task_attachment(
  p_organization_id uuid,
  p_task_id uuid,
  p_storage_path text,
  p_file_name text,
  p_content_type text,
  p_size_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_attachment public.task_attachments%rowtype;
  v_uploader_name text;
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if p_file_name is null or length(trim(p_file_name)) < 1 or length(p_file_name) > 255
     or p_content_type is null
     or p_content_type not in ('image/jpeg','image/png','image/webp','application/pdf')
     or p_size_bytes is null or p_size_bytes < 1 or p_size_bytes > 10485760 then
    raise exception 'INVALID_ATTACHMENT' using errcode = '22023';
  end if;

  if p_storage_path is null
     or p_storage_path not like p_organization_id::text || '/' || p_task_id::text || '/' || auth.uid()::text || '/%' then
    raise exception 'INVALID_ATTACHMENT_PATH' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.tasks t
    where t.id = p_task_id
      and t.organization_id = p_organization_id
      and (
        t.assigned_to = auth.uid()
        or t.created_by = auth.uid()
        or public.has_org_role(p_organization_id, array['org_admin','hr_admin','manager','supervisor'])
      )
  ) then
    raise exception 'TASK_NOT_FOUND_OR_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'task-proof'
      and o.name = p_storage_path
  ) then
    raise exception 'ATTACHMENT_OBJECT_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.task_attachments (
    organization_id, task_id, uploaded_by, storage_path,
    file_name, content_type, size_bytes
  ) values (
    p_organization_id, p_task_id, auth.uid(), p_storage_path,
    trim(p_file_name), p_content_type, p_size_bytes
  )
  returning * into v_attachment;

  select coalesce(display_name, 'Team member')
    into v_uploader_name
  from public.profiles
  where id = auth.uid();

  insert into public.audit_logs (
    organization_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    p_organization_id, auth.uid(), 'task.proof_attached', 'task', p_task_id,
    jsonb_build_object(
      'attachment_id', v_attachment.id,
      'file_name', v_attachment.file_name,
      'content_type', v_attachment.content_type,
      'size_bytes', v_attachment.size_bytes
    )
  );

  return jsonb_build_object(
    'id', v_attachment.id,
    'storage_path', v_attachment.storage_path,
    'file_name', v_attachment.file_name,
    'content_type', v_attachment.content_type,
    'size_bytes', v_attachment.size_bytes,
    'uploaded_by', v_attachment.uploaded_by,
    'uploader_name', coalesce(v_uploader_name, 'Team member'),
    'created_at', v_attachment.created_at
  );
end;
$$;

revoke all on function public.register_task_attachment(uuid, uuid, text, text, text, bigint) from public, anon;
grant execute on function public.register_task_attachment(uuid, uuid, text, text, text, bigint) to authenticated;
