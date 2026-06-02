# Guia: Blog + Post Automático + Notificação WhatsApp

Passo a passo completo de tudo que montamos no site **sanopilates.com.br** (Estúdio Benesse Pilates), para **replicar em outro site da empresa** no mesmo formato.

Stack: **GitHub Pages + Jekyll** (gera o site no push), **Decap CMS** (painel opcional), **GitHub Actions + Gemini + Google Trends** (post automático semanal), **CallMeBot** (aviso no WhatsApp).

> Custo total: **R$ 0** — tudo em camada gratuita.

---

## 1. Visão geral dos arquivos

```
_config.yml                          — config do Jekyll (título, url, permalink)
Gemfile                              — gem github-pages
CNAME                                — domínio customizado (ex: sanopilates.com.br)
index.html                           — landing page (página inicial)
_layouts/default.html                — moldura (topo + rodapé) de todas as páginas
_layouts/post.html                   — layout de cada post (capa, corpo, CTA do estúdio)
blog/index.html                      — listagem dos posts
_posts/AAAA-MM-DD-titulo.md          — cada post (Markdown com front matter)
admin/index.html                     — painel Decap CMS (opcional)
admin/config.yml                     — config do painel
images/                              — logos e imagens
.github/workflows/weekly-blog-post.yml — agenda o post semanal
.github/scripts/gerar-post.js        — gera o post (Gemini + Trends + fotos)
.github/scripts/package.json         — dependências do script
```

---

## 2. Hospedagem: GitHub Pages + domínio

1. Repositório no GitHub (ex.: `usuario/nome-do-site`).
2. **Settings → Pages** → Source: `Deploy from a branch` → branch `main` → `/ (root)`.
3. Domínio próprio: criar arquivo `CNAME` na raiz com o domínio (ex.: `sanopilates.com.br`) e apontar o DNS do domínio para o GitHub Pages (registros A do GitHub + CNAME `www`).
4. O site publica sozinho a cada `git push origin main` (leva 1-2 min).

---

## 3. Estrutura do blog (Jekyll)

**`_config.yml`** define o permalink dos posts:
```yaml
permalink: /blog/:year/:month/:day/:title/
```

**Cada post** é um `.md` em `_posts/` com nome `AAAA-MM-DD-titulo.md` e front matter no topo:
```markdown
---
layout: post
title: "Título do post"
date: 2026-06-02 10:00:00 -0300
excerpt: "Resumo de uma linha."
author: "Equipe Benesse"
cover: "https://images.unsplash.com/photo-XXXX?w=1200&q=80"
---

Texto em Markdown aqui...
```

> ⚠️ **Erro clássico:** se faltar `layout: post`, o post sai **sem diagramação** (texto cru). Sempre incluir.

**Capa por URL externa:** no `_layouts/post.html`, o filtro `relative_url` quebra URLs `http`. Usar:
```liquid
{% if page.cover %}
{% if page.cover contains '://' %}{% assign cover_url = page.cover %}{% else %}{% assign cover_url = page.cover | relative_url %}{% endif %}
<img src="{{ cover_url }}" alt="{{ page.title }}" class="post-cover" />
{% endif %}
```

---

## 4. Painel /admin (Decap CMS) — opcional

> No nosso caso optamos pela **opção simples**: a página `/admin` só leva o usuário a criar/editar posts direto na interface do GitHub, **sem login**. Isso evita a complexidade de OAuth.

### Regras importantes do Decap (erros já cometidos)
- **Script sempre no fim do `<body>`**, nunca no `<head>` — no `<head>` dá página em branco (`Cannot read properties of null (reading 'appendChild')`).
- **Login GitHub exige servidor OAuth próprio.** Sem Netlify:
  - `auth_type: implicit` → cai no proxy da Netlify (quebra se não tem conta).
  - `auth_type: pkce` → **não funciona com GitHub** (só GitLab/Bitbucket).
  - Para login de verdade no GitHub Pages é preciso um **proxy OAuth** (ex.: Cloudflare Worker grátis) e o `config.yml` aponta para ele via `base_url` + `auth_endpoint`.

### Opção simples que usamos (`admin/index.html`)
Página que monta um link "novo post" já com o modelo preenchido e a data de hoje, abrindo o editor do GitHub:
```
https://github.com/USUARIO/REPO/new/main?filename=_posts/DATA-novo-post.md&value=MODELO_URLENCODED
```
(ver o `admin/index.html` deste repositório como referência)

---

## 5. Post automático semanal (GitHub Actions + Gemini + Google Trends)

### 5.1 Chave do Gemini
1. Gerar em https://aistudio.google.com/apikey — **a chave válida começa com `AIza`**.
   > ⚠️ Chave que começa com `AQ.` ou outro prefixo é inválida → erro **403 "Method doesn't allow unregistered callers"**.
2. Cadastrar em **Settings → Secrets → Actions → New repository secret**:
   - Nome: `GEMINI_API_KEY` · Valor: a chave `AIza...`

### 5.2 Modelo do Gemini
No `.github/scripts/gerar-post.js`, usar **sempre a versão estável mais recente**:
```js
model: 'gemini-2.5-flash',   // não usar 2.0 (defasado)
```

### 5.3 O que o script faz
1. Busca temas em alta no **Google Trends Brasil**.
2. Pede ao Gemini um post no formato `TITULO / RESUMO / CORPO` (sem front matter, sem hashtags).
3. **Monta o arquivo final**: front matter completo (com `layout: post`, autor, capa) + 2 fotos inseridas no meio (1 após a introdução, 1 antes da conclusão).
4. As fotos vêm de uma **galeria curada** (Unsplash, livres) que **varia a cada semana**.
5. Salva em `_posts/`, commita e dá push (o site publica sozinho).

### 5.4 Agendamento (`weekly-blog-post.yml`)
```yaml
on:
  schedule:
    - cron: '0 11 * * 1'   # toda segunda, 8h de Brasília
  workflow_dispatch:         # botão "Run workflow" manual
permissions:
  contents: write            # necessário para o bot commitar
```

### 5.5 Permissões do repositório
**Settings → Actions → General → Workflow permissions** → marcar **Read and write permissions**.

---

## 6. Aviso no WhatsApp quando o post é publicado (CallMeBot — grátis)

### 6.1 Ativar o CallMeBot (uma vez por número)
1. Adicionar o número **+34 644 51 95 23** nos contatos.
2. Enviar a mensagem exata por WhatsApp: **`I allow callmebot to send me messages`**
3. O bot responde com sua **API key**.

### 6.2 Cadastrar os secrets no GitHub
**Settings → Secrets → Actions:**
- `WHATSAPP_PHONE` → número com DDI, só dígitos (ex.: `5511947221012`)
- `CALLMEBOT_APIKEY` → a chave recebida

### 6.3 Passo no workflow (já incluído)
```yaml
- name: Avisar no WhatsApp (CallMeBot)
  if: success()
  env:
    PHONE:  ${{ secrets.WHATSAPP_PHONE }}
    APIKEY: ${{ secrets.CALLMEBOT_APIKEY }}
  run: |
    if [ -z "$PHONE" ] || [ -z "$APIKEY" ]; then
      echo "Secrets não configurados — pulando aviso."; exit 0
    fi
    MENSAGEM="✅ Novo post no blog: $TITULO — $POST_URL"
    curl -s -G "https://api.callmebot.com/whatsapp.php" \
      --data-urlencode "phone=$PHONE" \
      --data-urlencode "text=$MENSAGEM" \
      --data-urlencode "apikey=$APIKEY"
```

> Se os secrets não existirem, o workflow **não quebra** — só pula o aviso.

### 6.4 Teste manual da API (sem esperar o workflow)
```bash
curl -s -G "https://api.callmebot.com/whatsapp.php" \
  --data-urlencode "phone=SEU_NUMERO" \
  --data-urlencode "text=teste" \
  --data-urlencode "apikey=SUA_CHAVE"
```
Resposta `Message queued` = funcionando.

---

## 7. Landing page — botões de ação

Na seção final (`<section class="final">` do `index.html`), fileira de 4 botões lado a lado (empilham no celular):
- 💰 Tabela de valores
- 🧘 Aula experimental
- 💆 Agende sua massagem
- 📝 Nosso blog (`/blog/`)

> Evitar **botões duplicados**: se o link já está no topo (hero) e nos botões da CTA, não repetir o mesmo botão mais de uma vez na mesma seção.

---

## 8. Checklist para replicar em um site novo

- [ ] Criar repositório e ativar GitHub Pages (branch `main`, root)
- [ ] `CNAME` com o domínio + apontar DNS
- [ ] Copiar `_config.yml`, `Gemfile`, `_layouts/`, `blog/`, `index.html`, `images/`
- [ ] Ajustar nome/endereço/links da empresa nos arquivos
- [ ] Criar 1 post de exemplo em `_posts/`
- [ ] (Opcional) `admin/index.html` apontando para o repositório novo
- [ ] Copiar `.github/workflows/` e `.github/scripts/`, ajustar o `repo` e a galeria de fotos
- [ ] Secret `GEMINI_API_KEY` (começa com `AIza`)
- [ ] Marcar **Read and write permissions** em Actions
- [ ] Ativar CallMeBot e cadastrar `WHATSAPP_PHONE` + `CALLMEBOT_APIKEY`
- [ ] Rodar o workflow manual (`Run workflow`) para testar tudo de uma vez

---

## 9. Erros já cometidos (não repetir)

| Erro | Sintoma | Correção |
|------|---------|----------|
| Script Decap no `<head>` | Página `/admin` em branco | Script no fim do `<body>` |
| `auth_type: implicit` | Login cai na Netlify | Não usar sem Netlify |
| `auth_type: pkce` no GitHub | Login não funciona | PKCE não existe p/ GitHub; usar proxy OAuth ou edição direta |
| Chave Gemini `AQ.…` | 403 unregistered callers | Gerar chave `AIza…` |
| Modelo `gemini-2.0-flash` | Versão defasada | Usar `gemini-2.5-flash` |
| Post sem `layout: post` | Sem diagramação | Incluir no front matter |
| `cover` com `relative_url` | Capa quebrada | Tratar URL `http` no layout |
| Botão repetido na CTA | Poluição visual | 1 ação = 1 botão por seção |
