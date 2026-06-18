# 📍 ONDE PAREI — Blog & Landing Page do Estúdio (sanopilates)

> Arquivo de estado para retomar o trabalho. Última atualização: **18/06/2026**.
> Para contexto técnico completo (stack, deploy, automação), ver `CLAUDE.md`.

## Identidade (confirmar antes de mexer)
- **Pasta:** `C:\Users\User\Downloads\sanopilates`
- **Remote:** `https://github.com/drptze-teste/sanopilates` · branch `main`
- **URL:** https://sanopilates.com.br (GitHub Pages + CNAME)
- ⚠️ A pasta `Downloads` mistura vários projetos — **não confundir** com NR-1, financeiro-B, app-rh etc.

## O que é este projeto (mapa rápido)
O site tem **2 seções** no mesmo domínio, cada uma com **landing + blog**:

| Seção | Landing | Blog | Posts automáticos |
|-------|---------|------|-------------------|
| **Pilates** | `index.html` (HTML puro, raiz) | `blog/index.html` | Segunda 15h Brasília |
| **Estética & Bem-Estar** | `estetica-e-bem-estar/index.html` | `estetica-e-bem-estar/blog/index.html` | Quinta 15h Brasília |

- Posts Pilates → `_posts/` · Posts Estética → `estetica-e-bem-estar/_posts/`
- Layout base de tudo que é Jekyll: `_layouts/default.html` (topbar + footer + contador)
- Posts usam `_layouts/post.html`
- **`index.html` (home Pilates) é HTML puro** — NÃO usa layout Jekyll; scripts precisam ser inseridos manualmente nela.

## ✅ Feito recentemente (junho/2026)

### Seção Estética & Bem-Estar (completa, no ar)
- Landing com hero, 3 serviços, galeria com lightbox, bloco de vídeos, teaser do blog, cross-link Pilates
- Blog de estética com listagem própria + posts automáticos (Gemini + Google Trends, temas de beleza)
- Tema visual rose/gold aplicado via classe `theme-estetica` (em `default.html`)
- Decap CMS com 2 coleções (Pilates + Estética)

### Melhorias na landing Pilates (`index.html`)
- Botão "Ao lado do Shopping Morumbi" → link Google Maps
- 2 botões no topo: 📝 Blog Pilates + ✨ Blog Estética
- Seção "Por que escolher" com itens 05 (Fisioterapeutas especializados) e 06 (Estética & Depilação)
- Preço ajustado: **R$ 260/mês** + legenda "(valor para o plano semestral 1x por semana)"
- Link "Conheça mais sobre estética" no card de massagem

### Navegação cross-links (Pilates ↔ Estética)
- Link "Blog Estética" adicionado na topbar (`default.html`)
- Seção/card "Conheça nosso blog de Pilates" no blog de estética

### Contador de visitas (GoatCounter) — RESOLVIDO
- Diagnóstico: nunca esteve quebrado (15 visitas no painel); faltava número visível
- Badge "👁️ X visitas no site" no rodapé de **todas** as páginas (busca `/counter/TOTAL.json`)
- Contador por matéria nos posts agora aparece **sempre** (antes escondia com 0)
- Fix: `src` do script `//gc.zgo.at` → `https://gc.zgo.at`
- Conta visitantes únicos por IP/dia (recarregar do mesmo device não incrementa)

## ⏳ Pendências conhecidas
- **Vídeos da Estética:** placeholder "Conteúdos em breve" na landing (`estetica-e-bem-estar/index.html`, bloco `videos-soon`). Quando o dono enviar os links (YouTube/TikTok/Instagram), trocar por embeds em grid `.video-embed`. TikTok/Instagram exigem script de embed da plataforma.

## Como mexer / publicar
```bash
# Editar arquivo → commit → push (deploy automático via GitHub Pages, ~2 min)
git add <arquivos>
git commit -m "mensagem"
git pull --rebase origin main   # o bot de posts commita sozinho; rebase evita rejeição
git push origin main
```
- **Verificar deploy no ar:** `Invoke-WebRequest https://sanopilates.com.br/` e procurar pelo trecho alterado.
- **Sempre atualizar `CLAUDE.md` e este arquivo** ao final de cada mudança relevante.
