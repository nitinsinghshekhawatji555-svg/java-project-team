-- Blocklist rejected mechanic emails + prevent re-signup

begin;

-- If table already exists (e.g., reruns), keep it
create table if not exists public.blocked_emails (
  email text primary key,
  reason text,
  created_at timestamptz default now()
);

-- Enforce: stop auth signups for blocked emails.
-- Note: Supabase auth triggers are on auth.users.
-- We implement a BEFORE INSERT trigger that raises an error.

create or replace function public.blocked_email_signup_guard()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.email is null then
    return new;
  end if;

  if exists (
    select 1 from public.blocked_emails be where lower(be.email) = lower(new.email)
  ) then
    raise exception 'This email is blocked from creating a new account.';
  end if;

  return new;
end;
$$;

drop trigger if exists blocked_email_signup_trigger on auth.users;

create trigger blocked_email_signup_trigger
before insert on auth.users
for each row
execute function public.blocked_email_signup_guard();

commit;

