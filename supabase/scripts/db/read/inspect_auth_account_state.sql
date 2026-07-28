select
  'auth.users' as source,
  count(*)::text as user_count,
  ''::text as email_domain,
  ''::text as email_fingerprint,
  ''::text as confirmed_count,
  ''::text as linked_profile_count;

select
  'auth.user_masked' as source,
  '1'::text as user_count,
  coalesce(split_part(lower(email), '@', 2), '') as email_domain,
  substr(md5(lower(email)), 1, 12) as email_fingerprint,
  case when email_confirmed_at is null then 'false' else 'true' end as confirmed_count,
  case when exists (
    select 1
    from public.ritmika_profiles p
    where p.auth_user_id = u.id
  ) then 'true' else 'false' end as linked_profile_count
from auth.users u
where email is not null
order by created_at;
