-- ============ DZIENNIK SNÓW: limity analizy AI (chroni Twój portfel) ============
create table if not exists ai_uzycie (
  dzien date not null default current_date,
  urzadzenie text not null,
  ile int not null default 0,
  primary key (dzien, urzadzenie)
);
alter table ai_uzycie enable row level security;
revoke all on ai_uzycie from anon, authenticated;

-- true = można analizować; false = limit wyczerpany
create or replace function ai_zuzyj(p_urz text, p_limit_urz int, p_limit_dzien int) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_urz int; v_dzien int;
begin
  select coalesce(sum(ile), 0) into v_dzien from ai_uzycie where dzien = current_date;
  if v_dzien >= p_limit_dzien then return false; end if;
  insert into ai_uzycie(dzien, urzadzenie, ile) values (current_date, p_urz, 1)
  on conflict (dzien, urzadzenie) do update set ile = ai_uzycie.ile + 1
  returning ile into v_urz;
  return v_urz <= p_limit_urz;
end $$;
revoke all on function ai_zuzyj(text, int, int) from public, anon, authenticated;
grant execute on function ai_zuzyj(text, int, int) to service_role;
