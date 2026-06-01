/**
 * translator.js — Benesse Pilates Blog
 * Gerencia a barra de idiomas, chama a Cloud Function e cacheia no sessionStorage.
 */

(function () {
  "use strict";

  // ─── CONFIGURAÇÃO ──────────────────────────────────────────────────────────
  // Substitua pela URL real da sua Cloud Function após o deploy
  // Exemplo: https://us-central1-sanopilates-blog.cloudfunctions.net/translatePost
  const FUNCTION_URL = "https://us-central1-SEU-PROJETO-ID.cloudfunctions.net/translatePost";

  const LANGS = {
    pt: { label: "PT", flag: "🇧🇷", name: "Português" },
    en: { label: "EN", flag: "🇺🇸", name: "English" },
    zh: { label: "中文", flag: "🇨🇳", name: "中文" },
  };

  // ─── ESTADO ────────────────────────────────────────────────────────────────
  let currentLang = "pt";
  let originalContent = null;   // Markdown original (data-attribute no elemento)
  let postBody = null;          // Elemento .post-body
  let statusEl = null;          // ".translate-status"
  let noticeEl = null;          // ".lang-notice"

  // ─── CACHE ─────────────────────────────────────────────────────────────────
  function cacheKey(postId, lang) {
    return `bns_trans_${postId}_${lang}`;
  }

  function getCached(postId, lang) {
    try { return sessionStorage.getItem(cacheKey(postId, lang)); }
    catch { return null; }
  }

  function setCache(postId, lang, html) {
    try { sessionStorage.setItem(cacheKey(postId, lang), html); }
    catch { /* storage cheio — ignora */ }
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────
  // Converte Markdown simples em HTML (sem dependências externas)
  function mdToHtml(md) {
    return md
      // Titulos
      .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      // Negrito / itálico
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Blockquote
      .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
      // HR
      .replace(/^---$/gm, "<hr>")
      // Listas não-ordenadas
      .replace(/^\- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
      // Listas ordenadas
      .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
      // Links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      // Parágrafos (blocos separados por linha em branco)
      .split(/\n{2,}/)
      .map((block) => {
        block = block.trim();
        if (!block) return "";
        if (/^<(h[1-4]|ul|ol|li|blockquote|hr)/.test(block)) return block;
        return `<p>${block.replace(/\n/g, " ")}</p>`;
      })
      .join("\n");
  }

  function setContent(html) {
    if (!postBody) return;
    postBody.innerHTML = html;
  }

  // ─── UI ────────────────────────────────────────────────────────────────────
  function setActiveButton(lang) {
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
      btn.classList.remove("loading");
    });
  }

  function showStatus(visible) {
    statusEl && statusEl.classList.toggle("visible", visible);
  }

  function showNotice(lang) {
    if (!noticeEl) return;
    if (lang === "pt") {
      noticeEl.classList.remove("visible");
    } else {
      noticeEl.textContent = `🌐 Tradução automática para ${LANGS[lang].name} — pode conter imprecisões.`;
      noticeEl.classList.add("visible");
    }
  }

  // ─── TRADUÇÃO ──────────────────────────────────────────────────────────────
  async function translate(postId, targetLang) {
    // Verifica cache primeiro
    const cached = getCached(postId, targetLang);
    if (cached) {
      setContent(cached);
      setActiveButton(targetLang);
      showNotice(targetLang);
      currentLang = targetLang;
      return;
    }

    // Obtém o markdown original (gravado como atributo data no elemento)
    const markdown = originalContent;
    if (!markdown) return;

    // Bloqueia botões e mostra status
    document.querySelectorAll(".lang-btn").forEach((b) => b.classList.add("loading"));
    showStatus(true);

    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: markdown, targetLang }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const { translated } = await res.json();
      const html = mdToHtml(translated);

      setCache(postId, targetLang, html);
      setContent(html);
      setActiveButton(targetLang);
      showNotice(targetLang);
      currentLang = targetLang;

    } catch (err) {
      console.error("[translator]", err);
      alert("Não foi possível traduzir agora. Tente novamente em instantes.");
      setActiveButton(currentLang);
    } finally {
      showStatus(false);
    }
  }

  // ─── INIT ──────────────────────────────────────────────────────────────────
  function init() {
    postBody = document.querySelector(".post-body");
    statusEl = document.querySelector(".translate-status");
    noticeEl = document.querySelector(".lang-notice");

    if (!postBody) return; // Não é página de post

    // O post ID vem do atributo data-post-id no container
    const postId = document.body.dataset.postId || window.location.pathname;

    // Salva o HTML original como Markdown (o layout injeta via data-md)
    originalContent = postBody.dataset.md || postBody.innerText;

    // Cria a barra de idiomas dinamicamente e insere antes do post-body
    const bar = document.createElement("div");
    bar.className = "lang-bar";
    bar.innerHTML = `
      <span class="lang-bar__label">Idioma</span>
      ${Object.entries(LANGS).map(([code, info]) => `
        <button class="lang-btn${code === "pt" ? " active" : ""}" data-lang="${code}">
          <span class="flag">${info.flag}</span> ${info.label}
        </button>
      `).join("")}
    `;

    // Insere barra + status + notice antes do conteúdo
    const statusHtml = `
      <div class="translate-status">
        <span class="translate-status__spinner"></span>
        Traduzindo…
      </div>
      <div class="lang-notice"></div>
    `;

    postBody.insertAdjacentHTML("beforebegin", statusHtml);
    postBody.insertAdjacentElement("beforebegin", bar);

    // Captura referências após inserção no DOM
    statusEl = document.querySelector(".translate-status");
    noticeEl = document.querySelector(".lang-notice");

    // Event listeners nos botões
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest(".lang-btn");
      if (!btn || btn.classList.contains("loading")) return;

      const lang = btn.dataset.lang;
      if (lang === currentLang) return;

      if (lang === "pt") {
        // Volta para o original (já está no DOM — basta restaurar)
        postBody.innerHTML = postBody.dataset.originalHtml || postBody.innerHTML;
        setActiveButton("pt");
        showNotice("pt");
        currentLang = "pt";
        return;
      }

      translate(postId, lang);
    });

    // Guarda o HTML original para poder voltar ao PT
    postBody.dataset.originalHtml = postBody.innerHTML;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
