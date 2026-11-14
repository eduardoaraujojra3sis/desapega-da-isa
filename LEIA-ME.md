# Desapega da Isa: site pronto para publicar

Site estático, sem etapa de build. Todos os arquivos ficam juntos na mesma pasta (sem subpastas):

- `index.html`: a loja
- `painel.html`: a área da Isa (login com o e-mail e a senha do Supabase)
- `config.js`: endereço e chave pública do Supabase
- `data.js`: leitura e gravação no Supabase
- `dc-lite.js` e `preact-htm.js`: o motor das páginas
- `painel.css`: estilos do painel

## Publicar no Netlify

1. Acesse https://app.netlify.com/drop
2. Arraste a pasta inteira (`desapega-da-isa`) para a página.
3. Pronto. A loja abre em `https://SEU-SITE.netlify.app/` e o painel em `/painel.html`.

Se preferir usar o GitHub, suba a pasta para um repositório. No Netlify, escolha "Add new site › Import from Git", deixe o *Build command* vazio e use `.` como *Publish directory*.

## Publicar na Vercel

1. Suba a pasta para um repositório no GitHub.
2. Na Vercel, clique em "Add New › Project" e importe o repositório.
3. Em *Framework Preset*, escolha **Other**. Deixe o comando de build vazio e o *Output Directory* como `.`.
4. Clique em Deploy.

Pela linha de comando: entre na pasta e rode `npx vercel` (e `npx vercel --prod` para publicar).

## Conferir no Supabase (se o login ainda falhar)

O painel agora mostra o motivo exato do erro:

- **"E-mail ou senha incorretos"**: em Authentication › Users, use "Reset password" ou crie o usuário de novo.
- **"E-mail ainda não foi confirmado"**: confirme o e-mail pelo link recebido ou crie o usuário com **Auto Confirm User** marcado.
- **"Não consegui conectar ao Supabase"**: confira a internet e os dados em `config.js` (Project Settings › API).

O banco precisa ter isto (rode no SQL Editor, caso ainda não tenha feito):

```sql
create table if not exists public.loja (
  id int primary key,
  dados jsonb not null
);
alter table public.loja enable row level security;

create policy "loja leitura publica" on public.loja
  for select using (true);
create policy "loja insert logado" on public.loja
  for insert to authenticated with check (true);
create policy "loja update logado" on public.loja
  for update to authenticated using (true) with check (true);

-- Fotos: crie em Storage um bucket público chamado "fotos" e depois:
create policy "fotos upload logado" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');
```

## Estatísticas do painel (visitas, cliques e pedidos)

A aba **Visão geral** do painel mostra faturamento, ticket médio, visitas, cliques em cada peça, peças colocadas na sacola e pedidos enviados ao WhatsApp. Faturamento e vendas funcionam sem nada extra. Para visitas e cliques, rode este SQL **uma vez** no SQL Editor do Supabase:

```sql
-- ===== Estatísticas do painel (visitas, cliques, sacola, pedidos) =====
create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('visita', 'clique', 'sacola', 'pedido', 'pedido_item')),
  produto text,
  criado_em timestamptz not null default now()
);
create index if not exists eventos_criado_em_idx on public.eventos (criado_em);

alter table public.eventos enable row level security;

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
```

Observações:

- As visitas da própria Isa não entram na conta: depois que ela entra no painel, aquele navegador deixa de ser contado.
- Uma venda é registrada quando a peça é marcada como **Vendida** (pela lista ou pelo cadastro). Se ela vendeu com desconto, dá para informar o valor recebido no cadastro da peça.
- Peças que já estavam como vendidas antes desta atualização entram no total geral, mas sem data de venda.

## Links das fotos no WhatsApp

Na mensagem do pedido, o link da foto usa o endereço do próprio site (`/foto/nome.jpg`). Os arquivos `vercel.json` (Vercel) e `_redirects` (Netlify) fazem esse endereço buscar a foto no armazenamento. Se trocar de projeto no Supabase, atualize o endereço nesses dois arquivos também.
