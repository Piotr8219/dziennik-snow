-- ============ DZIENNIK SNÓW: anonimowe statystyki odwiedzin ============
-- Bez adresów IP, bez ciasteczek, bez danych osobowych.
create table if not exists wizyty (
  id bigint generated always as identity primary key,
  czas timestamptz not null default now(),
  strona text not null check (char_length(strona) <= 40),
  odwiedzajacy text not null check (char_length(odwiedzajacy) <= 40),
  nowy boolean not null default false,
  zrodlo text check (char_length(zrodlo) <= 60),
  urzadzenie text check (char_length(urzadzenie) <= 20),
  przegladarka text check (char_length(przegladarka) <= 20),
  region text check (char_length(region) <= 60),
  jezyk text check (char_length(jezyk) <= 12),
  zainstalowana boolean not null default false
);
alter table wizyty enable row level security;
revoke all on wizyty from anon, authenticated;
grant insert on wizyty to anon;
drop policy if exists "wizyty_dodawanie" on wizyty;
create policy "wizyty_dodawanie" on wizyty for insert to anon with check (true);
create index if not exists wizyty_czas on wizyty (czas);

-- Zbiorcze statystyki do strony statystyki.html (same liczby, bez danych osobowych)
create or replace function statystyki(p_dni int default 30) returns json
language sql security definer set search_path = public as $$
  with z as (select * from wizyty where czas > now() - make_interval(days => greatest(1, least(p_dni, 365))))
  select json_build_object(
    'dzis',       (select json_build_object('wizyty', count(*), 'osoby', count(distinct odwiedzajacy)) from wizyty where czas >= date_trunc('day', now() at time zone 'Europe/Warsaw') at time zone 'Europe/Warsaw'),
    'okres',      (select json_build_object('wizyty', count(*), 'osoby', count(distinct odwiedzajacy), 'nowi', count(distinct odwiedzajacy) filter (where nowy)) from z),
    'wszystko',   (select json_build_object('wizyty', count(*), 'osoby', count(distinct odwiedzajacy)) from wizyty),
    'instalacje', (select count(distinct odwiedzajacy) from z where zainstalowana),
    'dni',        (select coalesce(json_agg(d order by d.dzien), '[]') from (select (czas at time zone 'Europe/Warsaw')::date as dzien, count(*) as wizyty, count(distinct odwiedzajacy) as osoby from z group by 1) d),
    'zrodla',     (select coalesce(json_agg(x), '[]') from (select coalesce(zrodlo,'?') as nazwa, count(*) as ile from z group by 1 order by 2 desc limit 10) x),
    'urzadzenia', (select coalesce(json_agg(x), '[]') from (select coalesce(urzadzenie,'?') as nazwa, count(*) as ile from z group by 1 order by 2 desc limit 10) x),
    'regiony',    (select coalesce(json_agg(x), '[]') from (select coalesce(region,'?') as nazwa, count(*) as ile from z group by 1 order by 2 desc limit 10) x),
    'strony',     (select coalesce(json_agg(x), '[]') from (select strona as nazwa, count(*) as ile from z group by 1 order by 2 desc limit 10) x),
    'ostatnie',   (select coalesce(json_agg(x), '[]') from (select czas, strona, zrodlo, urzadzenie, przegladarka, region, nowy, zainstalowana from wizyty order by czas desc limit 30) x)
  );
$$;
revoke all on function statystyki(int) from public;
grant execute on function statystyki(int) to anon;
