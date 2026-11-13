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
