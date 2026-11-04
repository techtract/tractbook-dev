-- Void instead of delete: sent/paid invoices are kept on record and marked void.
alter table public.invoices add column if not exists void_reason text;
alter table public.invoices add column if not exists voided_at timestamptz;

-- If invoices.status has a CHECK constraint that does not allow 'void', replace it.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.invoices'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.invoices drop constraint %I', c.conname);
  end loop;
  alter table public.invoices
    add constraint invoices_status_check
    check (status in ('draft','sent','paid','void'));
end $$;
