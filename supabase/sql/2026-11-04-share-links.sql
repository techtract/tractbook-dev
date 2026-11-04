-- Public view links: each invoice / estimate gets a random, unguessable token.
alter table public.invoices  add column if not exists share_token uuid not null default gen_random_uuid();
alter table public.estimates add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists invoices_share_token_key  on public.invoices(share_token);
create unique index if not exists estimates_share_token_key on public.estimates(share_token);
