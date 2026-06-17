# sanopilates — Contexto do Projeto

> ⚠️ Projeto **sanopilates** (blog do Studio Benesse Pilates). NÃO confundir com os outros
> projetos da pasta `Downloads`. Confirmar a pasta/remote antes de qualquer git/deploy.

## O que é
Blog do **Studio de Pilates Benesse** (Chácara Santo Antônio) — artigos sobre Pilates e bem-estar.
Posts publicados **automaticamente toda semana** por IA. Serve de **template** para replicar o blog em outros sites
(ver `GUIA-REPLICAR-BLOG.md`).

## Stack
- **Jekyll** (site estático) — `_config.yml`, `_layouts/`, `_posts/`, `Gemfile`
- Hospedagem: **GitHub Pages** com **domínio customizado** (`CNAME` → `sanopilates.com.br`)
- CMS: **Decap CMS** em `admin/` (`admin/config.yml` + `admin/index.html`)
- Automação: **GitHub Actions** + Gemini + Google Trends
- `functions/` — pacote Node auxiliar (ex.: notificação/integração; tem `package-lock.json` próprio)

## Identidade (confirmar antes de agir)
- Pasta: `C:\Users\User\Downloads\sanopilates`
- Remote git: `https://github.com/drptze-teste/sanopilates` · branch `main`
- URL publicada: **https://sanopilates.com.br** (domínio próprio via CNAME; baseurl vazio)

## Deploy & automação
- **Deploy:** automático via GitHub Pages no push para `main`.
- **Post semanal automático:** `.github/workflows/weekly-blog-post.yml`
  - Roda **toda segunda-feira 18h UTC (15h Brasília)** (`cron: '0 18 * * 1'`)
  - Executa `.github/scripts/gerar-post.js` (Node 20): gera o post com **Gemini + Google Trends**, commita e dá push.
  - Requer secrets do GitHub: `GEMINI_API_KEY` (obrigatório) e `UNSPLASH_ACCESS_KEY` (opcional — fotos dinâmicas por tema; sem ela usa 3 fotos genéricas de fallback).
  - `UNSPLASH_ACCESS_KEY`: app gratuito em https://unsplash.com/developers → copiar o **Access Key**.
- Para postar manualmente: criar `.md` em `_posts/` (`AAAA-MM-DD-titulo.md` com front matter) e push.

## Convenções / armadilhas
- **Decap CMS:** o `<script>` do Decap deve ficar no **fim do `<body>`**, nunca no `<head>`.
- **Não apagar o `CNAME`** — é o que mantém o domínio `sanopilates.com.br` apontando para o Pages.
- É blog Jekyll, **não** React.
- `GUIA-REPLICAR-BLOG.md` documenta como clonar este blog para um novo site.
