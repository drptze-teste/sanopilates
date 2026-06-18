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
  - Para trocar o site: editar `data-goatcounter` no layout. **Conta correta: `sanopilates`** (não `benesseblogpilates`).
  - **Contador visível por post:** `post.html` consome o endpoint público `https://sanopilates.goatcounter.com/counter/<path>.json` e mostra 👁️ ao lado da data. Lê `count_unique` (visitantes únicos ≈ IP). Requer a opção **"Allow adding visitor counts on your website"** habilitada em GoatCounter → Settings (**já habilitada**).
- Para postar manualmente: criar `.md` em `_posts/` (`AAAA-MM-DD-titulo.md` com front matter) e push.

## Estética & Bem-Estar (segunda seção, mesmo domínio)
Seção dedicada a depilação, limpeza de pele e massagens em `sanopilates.com.br/estetica-e-bem-estar/`.
- **Landing:** `estetica-e-bem-estar/index.html` (hero + serviços + galeria com lightbox + vídeos + seção "Do nosso blog" + cross-link Pilates). CTA primário **"Agendar pelo app"** e WhatsApp secundário, no hero e na barra sticky mobile.
- **Blog:** `estetica-e-bem-estar/blog/index.html`; posts em `estetica-e-bem-estar/_posts/`.
- **Como funciona a separação:** posts em subpasta `_posts` ganham a categoria `estetica-e-bem-estar` (comportamento padrão do Jekyll). O permalink em `_config.yml` é `/:categories/blog/:year/:month/:day/:title/` → posts de Pilates (sem categoria) ficam em `/blog/...` e os de estética em `/estetica-e-bem-estar/blog/...`.
- **Filtros das listagens:** blog Pilates usa `where_exp post.categories == empty`; blog Estética usa `site.categories['estetica-e-bem-estar']`.
- **Tema visual:** `default.html` adiciona a classe `theme-estetica` ao `<body>` quando a URL/categoria é de estética, remapeando `--clay`/`--sage-deep` para tons rose (`--rose #C7678A`, `--gold`, `--lavender`). Assim `post.html` e a listagem recolorem sozinhos.
- **Fotos do estúdio:** `images/estetica/` (maca-zen, sala-estetica, recepcao-cafe, ambiente — já otimizadas ~1600px).
- **Vídeos:** ⏳ PENDENTE — placeholder na landing (bloco `videos-soon`) aponta para o canal `@BenesseStudioPilates-s8n`. Quando o dono enviar os links (YouTube/TikTok/Instagram, pode misturar), trocar o bloco por embeds em grid (`.video-embed` com `<iframe>`). TikTok/Instagram exigem o script de embed da plataforma.
- **WhatsApp:** `5511920000821` (mesmo da home).
- **App de agendamento:** `https://cadastroestudiobenesse.web.app/` (variável `agendaApp` na landing). Botão "Agendar pelo app" no hero, na barra sticky, nos 3 cards de serviço e no rodapé (`post-cta`) dos posts de estética. WhatsApp fica como ação secundária.
- Decap CMS tem 2 coleções: "Posts do Blog" (Pilates) e "Posts de Estética & Bem-Estar".
- **Automação:** `.github/workflows/weekly-estetica-post.yml` roda **quinta 18h UTC (15h Brasília)** e executa `.github/scripts/gerar-post-estetica.js` — mesma lógica do Pilates (Google Trends + anti-repetição + fotos Unsplash por tema), mas com temas de beleza, fotos-base `spa` e saída em `estetica-e-bem-estar/_posts/`. Fallback de fotos = fotos reais do estúdio. Reusa os mesmos secrets.

## Datas em português
- Include `_includes/data_pt.html` formata datas em pt-BR (Jekyll/GitHub Pages não traduz `%B`).
  - `{% include data_pt.html date=page.date %}` → "17 de junho de 2026"
  - `{% include data_pt.html date=post.date abbr=true %}` → "17 jun 2026"
  - Usado em `post.html` e nas duas listagens de blog.

## Landing Page Pilates (index.html) — Melhorias 2026-06-18
- **Google Maps link:** botão "Ao lado do Shopping Morumbi" agora abre Google Maps com endereço do estúdio
- **Navegação rápida para blogs:** 2 novos botões (📝 Blog Pilates + ✨ Blog Estética) no topo, ao lado do location pill
- **Seção "Por que escolher" expandida:** items 05 (Fisioterapeutas especializados) e 06 (Serviços de Estética) com link para `/estetica-e-bem-estar/`
- **Preço atualizado:** R$300 → R$260 com legenda "(valor para o plano semestral 1x por semana)"
- **Link estética no card massage:** novo parágrafo "Conheça mais sobre nossos serviços de estética →" antes do CTA
- **GoatCounter script:** adicionado diretamente antes do `</body>` em `index.html` (arquivo é HTML puro, não usa Jekyll layout)

## Convenções / armadilhas
- **Decap CMS:** o `<script>` do Decap deve ficar no **fim do `<body>`**, nunca no `<head>`.
- **Não apagar o `CNAME`** — é o que mantém o domínio `sanopilates.com.br` apontando para o Pages.
- É blog Jekyll, **não** React.
- **index.html é HTML puro** — não possui front matter Jekyll; scripts da layout precisam ser injetados manualmente (ex: GoatCounter).
- `GUIA-REPLICAR-BLOG.md` documenta como clonar este blog para um novo site.
