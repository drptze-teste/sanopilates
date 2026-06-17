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
  - **Anti-repetição:** o script lê os títulos dos 3 últimos posts e escolhe o 1º tema candidato (tendência ou fallback) que não repita o assunto recente — evita semanas seguidas sobre o mesmo tópico.
  - **Aviso WhatsApp:** o step final do workflow manda via CallMeBot uma legenda pronta (título + link + @) para o dono colar no Status do WhatsApp. WhatsApp **não tem API de Status** — postar é sempre manual.

## Analytics
- **Contador de acessos:** GoatCounter (script no fim do `<body>` de `_layouts/default.html`).
  - Privacidade: sem cookies, sem IP armazenado, sem aviso LGPD. Conta visitantes únicos/dia.
  - Painel: **https://sanopilates.goatcounter.com** (requer conta gratuita com o código `sanopilates`).
  - Para trocar o site: editar `data-goatcounter` no layout.
- Para postar manualmente: criar `.md` em `_posts/` (`AAAA-MM-DD-titulo.md` com front matter) e push.

## Estética & Bem-Estar (segunda seção, mesmo domínio)
Seção dedicada a depilação, limpeza de pele e massagens em `sanopilates.com.br/estetica-e-bem-estar/`.
- **Landing:** `estetica-e-bem-estar/index.html` (hero + serviços + galeria com lightbox + vídeos YouTube + cross-link Pilates + CTA WhatsApp).
- **Blog:** `estetica-e-bem-estar/blog/index.html`; posts em `estetica-e-bem-estar/_posts/`.
- **Como funciona a separação:** posts em subpasta `_posts` ganham a categoria `estetica-e-bem-estar` (comportamento padrão do Jekyll). O permalink em `_config.yml` é `/:categories/blog/:year/:month/:day/:title/` → posts de Pilates (sem categoria) ficam em `/blog/...` e os de estética em `/estetica-e-bem-estar/blog/...`.
- **Filtros das listagens:** blog Pilates usa `where_exp post.categories == empty`; blog Estética usa `site.categories['estetica-e-bem-estar']`.
- **Tema visual:** `default.html` adiciona a classe `theme-estetica` ao `<body>` quando a URL/categoria é de estética, remapeando `--clay`/`--sage-deep` para tons rose (`--rose #C7678A`, `--gold`, `--lavender`). Assim `post.html` e a listagem recolorem sozinhos.
- **Fotos do estúdio:** `images/estetica/` (maca-zen, sala-estetica, recepcao-cafe, ambiente — já otimizadas ~1600px).
- **Vídeos:** placeholder na landing aponta para o canal `@BenesseStudioPilates-s8n`; trocar o bloco `videos-soon` por `<iframe>` quando houver vídeos.
- **WhatsApp:** `5511920000821` (mesmo da home).
- Decap CMS tem 2 coleções: "Posts do Blog" (Pilates) e "Posts de Estética & Bem-Estar".

## Convenções / armadilhas
- **Decap CMS:** o `<script>` do Decap deve ficar no **fim do `<body>`**, nunca no `<head>`.
- **Não apagar o `CNAME`** — é o que mantém o domínio `sanopilates.com.br` apontando para o Pages.
- É blog Jekyll, **não** React.
- `GUIA-REPLICAR-BLOG.md` documenta como clonar este blog para um novo site.
