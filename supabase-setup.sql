-- =====================================================================
--  Desapega da Isa — configuração completa do Supabase
--  Pode rodar quantas vezes quiser: não apaga peças, fotos nem estatísticas.
--  (Os "drop policy" só recriam as regras de permissão.)
-- =====================================================================

-- ---------- 1. Tabela da loja (peças + configurações) ----------
create table if not exists public.loja (
  id int primary key,
  dados jsonb not null
);
alter table public.loja enable row level security;

grant select on public.loja to anon, authenticated;
grant insert, update on public.loja to authenticated;

drop policy if exists "loja leitura publica" on public.loja;
create policy "loja leitura publica" on public.loja
  for select to anon, authenticated using (true);

drop policy if exists "loja insert logado" on public.loja;
create policy "loja insert logado" on public.loja
  for insert to authenticated with check (true);

drop policy if exists "loja update logado" on public.loja;
create policy "loja update logado" on public.loja
  for update to authenticated using (true) with check (true);

-- ---------- 2. Fotos e vídeos (bucket público "fotos") ----------
-- Aceita imagens e vídeos; o limite de tamanho fica o do plano (50 MB no gratuito).
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('fotos', 'fotos', true, null, null)
on conflict (id) do update set public = true, allowed_mime_types = null, file_size_limit = null;

drop policy if exists "fotos leitura publica" on storage.objects;
create policy "fotos leitura publica" on storage.objects
  for select to anon, authenticated using (bucket_id = 'fotos');

drop policy if exists "fotos upload logado" on storage.objects;
create policy "fotos upload logado" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');

drop policy if exists "fotos update logado" on storage.objects;
create policy "fotos update logado" on storage.objects
  for update to authenticated using (bucket_id = 'fotos') with check (bucket_id = 'fotos');

drop policy if exists "fotos delete logado" on storage.objects;
create policy "fotos delete logado" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos');

-- ---------- 3. Estatísticas (visitas, cliques, sacola, pedidos) ----------
create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('visita', 'clique', 'sacola', 'pedido', 'pedido_item')),
  produto text,
  criado_em timestamptz not null default now()
);
create index if not exists eventos_criado_em_idx on public.eventos (criado_em);
alter table public.eventos enable row level security;

grant insert on public.eventos to anon, authenticated;
grant select on public.eventos to authenticated;

drop policy if exists "eventos registrar" on public.eventos;
create policy "eventos registrar" on public.eventos
  for insert to anon, authenticated with check (true);

drop policy if exists "eventos ler logado" on public.eventos;
create policy "eventos ler logado" on public.eventos
  for select to authenticated using (true);

create or replace function public.painel_resumo(desde timestamptz)
returns json
language sql
stable
as $$
  select json_build_object(
    'por_dia', coalesce((
      select json_agg(d order by d.dia) from (
        select (criado_em at time zone 'America/Sao_Paulo')::date as dia,
               count(*) filter (where tipo = 'visita') as visitas,
               count(*) filter (where tipo = 'clique') as cliques,
               count(*) filter (where tipo = 'pedido') as pedidos
        from public.eventos
        where criado_em >= desde
        group by 1
      ) d), '[]'::json),
    'por_peca', coalesce((
      select json_agg(p) from (
        select produto,
               count(*) filter (where tipo = 'clique') as cliques,
               count(*) filter (where tipo = 'sacola') as sacola,
               count(*) filter (where tipo = 'pedido_item') as pedidos
        from public.eventos
        where criado_em >= desde and produto is not null
        group by 1
      ) p), '[]'::json)
  );
$$;

revoke execute on function public.painel_resumo(timestamptz) from public, anon;
grant execute on function public.painel_resumo(timestamptz) to authenticated;

-- Pronto! Deve aparecer "Success. No rows returned".
