-- Business time zone (IANA name, e.g. America/Toronto). Null = use the browser's.
alter table public.businesses add column if not exists timezone text;
