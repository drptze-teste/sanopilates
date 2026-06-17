const googleTrends = require('google-trends-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// ── Datas e semana ─────────────────────────────────────────────────────────
const hoje = new Date();
const inicioAno = new Date(hoje.getFullYear(), 0, 1);
const semana = Math.ceil(
  ((hoje - inicioAno) / 86400000 + inicioAno.getDay() + 1) / 7
);
const ano = hoje.getFullYear();
const pad = (n) => String(n).padStart(2, '0');
const dataHoje = `${ano}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;

// ── Temas rotativos de fallback ─────────────────────────────────────────────
// Temas baseados em análise competitiva (Google Trends + gaps de concorrentes)
// Ordenados por oportunidade de SEO e volume de busca
const temasFallback = [
  'Como o Pilates fortalece o core — e por que isso muda tudo na sua saúde',
  'Pilates em casa: guia completo para quem está começando do zero',
  'Longevidade e movimento: por que Pilates é a tendência fitness de 2026',
  'Pilates para saúde mental — como o exercício reduz ansiedade e melhora o humor',
  'Pilates clínico para hérnia de disco: funciona mesmo?',
  'Pilates vs Yoga: qual escolher para a sua saúde?',
  'Postura no trabalho: exercícios de Pilates para quem fica horas sentado',
  'Mobilidade + Pilates: a combinação do momento para quem quer se mover melhor',
  'Pilates depois dos 60: por que é a melhor escolha para saúde e qualidade de vida',
  'Escoliose e Pilates: posso fazer? Como? O que dizem os especialistas',
  'Pilates para atletas amadores — como melhorar performance e evitar lesões',
  'Cinesiofobia: como o Pilates ajuda quem tem medo de se mover por causa da dor',
];
const temaFallback = temasFallback[semana % temasFallback.length];

// ── Texto: tokenização e palavras a ignorar ────────────────────────────────
const STOP_WORDS = new Set([
  'a','o','e','de','do','da','dos','das','em','no','na','nos','nas',
  'por','para','com','como','que','se','um','uma','ao','aos',
  'sao','ou','vs','mas','nem','ja','nao','mais','menos','muito',
  'bem','mal','seu','sua','seus','suas','isso','esta','este','qual',
  'quem','quando','onde','porque','pois','tudo','todo','toda',
  'depois','antes','ainda','mesmo','entre','sobre','aqui','ali'
]);

// Quebra o texto em palavras significativas (sem acento, sem stop words)
function tokeniza(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(p => p.length > 2 && !STOP_WORDS.has(p));
}

// ── Fotos dinâmicas por tema (Unsplash API) ────────────────────────────────
// Extrai palavras significativas do tema para usar como query de busca
function extrairKeywords(tema) {
  const keywords = ['pilates', ...tokeniza(tema).slice(0, 4)];
  return [...new Set(keywords)].join(' ');
}

// ── Anti-repetição: comparar tema com os últimos posts ──────────────────────
// Lê os títulos dos últimos N posts já publicados (mais recentes primeiro)
function lerPostsRecentes(n = 3) {
  try {
    const dir = path.join(process.cwd(), '_posts');
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .sort().reverse().slice(0, n)        // nome começa com AAAA-MM-DD → ordem cronológica
      .map(f => {
        const txt = fs.readFileSync(path.join(dir, f), 'utf8');
        const m = txt.match(/^title:\s*(.+)$/im);
        return (m ? m[1].trim() : f).replace(/^["']|["']$/g, '');
      });
  } catch (e) {
    console.log(`Não foi possível ler posts recentes: ${e.message}`);
    return [];
  }
}

// Palavras-chave significativas de um texto, ignorando "pilates" (comum a todos)
function palavrasSignificativas(texto) {
  return new Set(tokeniza(texto).filter(p => p !== 'pilates'));
}

// Verifica se um tema candidato repete o assunto de algum post recente
function ehRepetitivo(candidato, recentes) {
  const cand = palavrasSignificativas(candidato);
  if (cand.size === 0) return false;
  for (const titulo of recentes) {
    const post = palavrasSignificativas(titulo);
    let comuns = 0;
    for (const p of cand) if (post.has(p)) comuns++;
    // Repetitivo se compartilha 2+ palavras-chave OU metade ou mais do candidato
    if (comuns >= 2 || comuns / cand.size >= 0.5) return true;
  }
  return false;
}

// Busca 3 fotos no Unsplash relevantes ao tema; cai no fallback se falhar
async function buscarFotosUnsplash(query) {
  const fallback = [
    { url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80', alt: 'Pilates no estúdio' },
    { url: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=1200&q=80', alt: 'Exercício de Pilates no mat' },
    { url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=1200&q=80', alt: 'Pilates com equipamentos' },
  ];
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    console.log('UNSPLASH_ACCESS_KEY não configurada — usando fotos genéricas.');
    return fallback;
  }
  try {
    const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5&client_id=${key}`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`Unsplash HTTP ${res.status}`);
    const data = await res.json();
    const fotos = (data.results || []).slice(0, 3).map(foto => ({
      url: `${foto.urls.raw}&w=1200&q=80&fit=crop`,
      alt: foto.alt_description || query,
    }));
    if (fotos.length < 3) return [...fotos, ...fallback].slice(0, 3);
    console.log(`Fotos Unsplash para "${query}": ${fotos.length} encontradas.`);
    return fotos;
  } catch (err) {
    console.log(`Erro Unsplash: ${err.message} — usando fotos genéricas.`);
    return fallback;
  }
}

// ── Buscar tendências no Google Trends (Brasil) ─────────────────────────────
const palavrasChave = [
  'pilates',
  'dor nas costas',
  'emagrecimento',
  'postura',
  'saude no trabalho',
  'home office saude',
  'qualidade de vida',
];

async function buscarTendencias() {
  const tendencias = [];
  for (const palavra of palavrasChave) {
    try {
      const resultado = await googleTrends.relatedQueries({
        keyword: palavra,
        geo: 'BR',
        hl: 'pt-BR',
      });
      const dados = JSON.parse(resultado);
      const rising = dados?.default?.rankedList?.[0]?.rankedKeyword;
      if (rising && rising.length > 0) {
        rising.slice(0, 2).forEach(({ query, value }) => {
          tendencias.push({ query, value: value || 0, origem: palavra });
        });
      }
    } catch (e) {
      console.log(`Trends indisponível para "${palavra}": ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 800));
  }
  return tendencias;
}

async function main() {
  // ── Tendências ─────────────────────────────────────────────────────────────
  let contextoTrends = '';
  let trendQueries = [];

  try {
    console.log('Buscando tendências no Google Trends Brasil...');
    const tendencias = await buscarTendencias();

    if (tendencias.length > 0) {
      tendencias.sort((a, b) => b.value - a.value);
      const top5 = tendencias.slice(0, 5);
      trendQueries = top5.map(t => t.query);
      contextoTrends = `\n\nTendências atuais no Google Brasil (use como inspiração):\n` +
        top5.map((t, i) => `${i + 1}. "${t.query}" (relacionado a: ${t.origem})`).join('\n');
      console.log('Top tendências:');
      top5.forEach(t => console.log(`  - ${t.query} (valor: ${t.value})`));
    } else {
      console.log('Sem tendências — usando tema rotativo.');
    }
  } catch (e) {
    console.log(`Erro trends: ${e.message}. Usando tema rotativo.`);
  }

  // ── Escolher tema evitando repetir os últimos posts ──────────────────────────
  const recentes = lerPostsRecentes(3);
  console.log(`Posts recentes: ${recentes.join(' | ') || '(nenhum)'}`);

  // Candidatos em ordem de preferência: tendências primeiro, depois fallback rotativo
  const candidatos = [...trendQueries];
  for (let i = 0; i < temasFallback.length; i++) {
    candidatos.push(temasFallback[(semana + i) % temasFallback.length]);
  }

  let temaDestaque = candidatos.find(c => !ehRepetitivo(c, recentes));
  if (!temaDestaque) {
    temaDestaque = candidatos[0] || temaFallback;
    console.log('Todos os candidatos repetem posts recentes — usando o primeiro mesmo assim.');
  }

  console.log(`\nSemana: ${semana} | Tema escolhido: ${temaDestaque}`);

  // ── Fotos relevantes ao tema ────────────────────────────────────────────────
  const keywords = extrairKeywords(temaDestaque);
  console.log(`Keywords para fotos: "${keywords}"`);
  const [capa, inline1, inline2] = await buscarFotosUnsplash(keywords);

  // ── Gemini ──────────────────────────────────────────────────────────────────
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: 'Você é o editor de conteúdo do Blog do Estúdio Benesse Pilates, um estúdio de pilates focado em saúde, bem-estar, terceira idade e qualidade de vida, localizado na Chácara Santo Antônio (São Paulo), numa região com muitos moradores brasileiros e chineses. Sempre que se referir ao estúdio, use o nome "Estúdio Benesse Pilates" (nunca "BNS"). Escreva sempre em português brasileiro, com tom leve e acessível, como se estivesse explicando para uma amiga de 60 anos curiosa sobre saúde. Siga exatamente o formato pedido pelo usuário.',
  });

  const userPrompt = `Gere um post de blog para a semana ${semana} do ano ${ano}.

O tema principal vem das buscas mais quentes do Google Brasil: **${temaDestaque}**
Tema rotativo de apoio: ${temaFallback}
${contextoTrends}

Responda EXATAMENTE neste formato, sem nada antes nem depois:

TITULO: Título chamativo e direto com número ou promessa concreta (sem aspas)
RESUMO: Uma frase que desperta curiosidade e resume o benefício principal (sem aspas)
CORPO:
[introdução de 2-3 linhas conectando o tema à realidade do leitor — use dado ou estatística se possível]

---

## A Realidade: [subtítulo sobre o problema ou contexto]
[2-3 parágrafos com números, fatos ou situações do dia a dia que o leitor reconhece]

## Por Que Funciona: [subtítulo sobre a solução/mecanismo]
[2-3 parágrafos explicando como o Pilates resolve — pode usar listas com ✅ ou ❌]

## Na Prática: [subtítulo com dicas, exercícios ou passo a passo]
[2-3 parágrafos com orientações concretas e aplicáveis — use numeração ou lista]

## Erros Comuns
[3-4 erros que as pessoas cometem, no formato: ❌ **Erro X** — explicação breve + como fazer certo]

## Conclusão
[Parágrafo final resumindo o benefício + convite caloroso e sem pressão para conhecer o Estúdio Benesse Pilates e agendar uma aula experimental]

Links obrigatórios — insira naturalmente no texto em pelo menos 3 pontos diferentes:
- Site: [Estúdio Benesse Pilates](https://sanopilates.com.br) — use ao mencionar o estúdio pela primeira vez e na conclusão
- Instagram: [@benessestudiopilates](https://instagram.com/benessestudiopilates) — use em 1 dica ou callout no meio do texto
- Exemplo de callout Instagram: > 💡 Acompanhe dicas de [tema] no nosso Instagram: [@benessestudiopilates](https://instagram.com/benessestudiopilates)

Regras obrigatórias:
- Não use front matter YAML
- Não escreva "hashtags" nem "tags"
- Não inclua imagens (eu insiro depois)
- Use Markdown: ## para títulos, **negrito**, *itálico*, listas com - ou números
- Tom: leve, acessível, como explicando para uma amiga de 60 anos
- Sempre chame o estúdio de "Estúdio Benesse Pilates" (nunca "BNS" nem "estúdio")`;

  // Chama Gemini com retry automático em caso de quota
  async function gerarComRetry(tentativa = 1) {
    try {
      console.log(`\nChamando Gemini... (tentativa ${tentativa})`);
      const result = await model.generateContent(userPrompt);
      return result.response.text();
    } catch (err) {
      const isQuota = err.message && err.message.includes('quota');
      const isRate  = err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED'));
      if ((isQuota || isRate) && tentativa < 4) {
        const espera = tentativa * 30000; // 30s, 60s, 90s
        console.log(`Limite de quota atingido. Aguardando ${espera/1000}s antes de tentar novamente...`);
        await new Promise(r => setTimeout(r, espera));
        return gerarComRetry(tentativa + 1);
      }
      throw err;
    }
  }

  const bruto = await gerarComRetry();

  // ── Montar o post final (front matter + capa + fotos no meio) ───────────────
  const limpaAspas = (s) => s.replace(/^["']|["']$/g, '').replace(/"/g, '').trim();

  // Extrai TITULO / RESUMO / CORPO da resposta do modelo
  const mTitulo = bruto.match(/TITULO:\s*(.+)/i);
  const mResumo = bruto.match(/RESUMO:\s*(.+)/i);
  const mCorpo  = bruto.match(/CORPO:\s*([\s\S]*)$/i);

  const titulo = mTitulo ? limpaAspas(mTitulo[1]) : temaDestaque;
  const resumo = mResumo ? limpaAspas(mResumo[1]) : `Novidades sobre ${temaDestaque} no Estúdio Benesse.`;

  // Corpo: usa o que vem após "CORPO:"; se o rótulo não existir, remove as
  // linhas TITULO:/RESUMO: que o modelo possa ter deixado no começo.
  let corpo = mCorpo ? mCorpo[1] : bruto;
  corpo = corpo
    .replace(/^---[\s\S]*?---/, '')              // front matter que escape
    .replace(/^\s*TITULO:.*$/gim, '')            // rótulo TITULO vazado
    .replace(/^\s*RESUMO:.*$/gim, '')            // rótulo RESUMO vazado
    .replace(/^\s*CORPO:\s*$/gim, '')            // rótulo CORPO sozinho
    .replace(/^\s*hashtags?:.*$/gim, '')         // linha de hashtags
    .trim();

  // Insere as 2 fotos com linhas em branco garantidas ao redor:
  // 1ª foto logo antes do primeiro subtítulo (após a introdução)
  corpo = corpo.replace(/\n#{2,3} /, `\n\n![${inline1.alt}](${inline1.url})\n\n## `);
  // 2ª foto logo antes da Conclusão (ou do último subtítulo, como reserva)
  if (/\n#{2,3}\s*Conclus/i.test(corpo)) {
    corpo = corpo.replace(/\n#{2,3}\s*Conclus[^\n]*/i, (m) =>
      `\n\n![${inline2.alt}](${inline2.url})${m}`);
  }

  // Link interno (SEO) no meio do texto: callout antes do 2º subtítulo
  let nTitulos = 0;
  corpo = corpo.replace(/\n#{2,3} /g, (m) => {
    nTitulos++;
    if (nTitulos === 2) {
      return `\n\n> 💡 **Na prática:** quer sentir esses benefícios no corpo? [Conheça o Estúdio Benesse Pilates](/) e agende uma aula experimental.\n${m}`;
    }
    return m;
  });

  const frontMatter = [
    '---',
    'layout: post',
    `title: "${titulo}"`,
    `date: ${dataHoje} 10:00:00 -0300`,
    `excerpt: "${resumo}"`,
    'author: "Equipe Benesse"',
    `cover: "${capa.url}"`,
    '---',
    '',
  ].join('\n');

  const conteudo = `${frontMatter}\n${corpo}\n`;

  // ── Salvar ──────────────────────────────────────────────────────────────────
  const nomeArquivo = `_posts/${dataHoje}-post-semana-${String(semana).padStart(2, '0')}.md`;
  fs.writeFileSync(path.join(process.cwd(), nomeArquivo), conteudo, 'utf8');

  console.log(`\nPost salvo: ${nomeArquivo}`);
  console.log('--- Prévia ---');
  console.log(conteudo.substring(0, 400));

  // Sanitiza tema para mensagem de commit
  const temaSanitizado = temaDestaque
    .replace(/[^\w\sáéíóúãõâêîôûàèìòùçÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÇ-]/g, '')
    .trim()
    .substring(0, 60);

  // Monta o link público do post (permalink: /blog/:year/:month/:day/:title/)
  const slug = `post-semana-${String(semana).padStart(2, '0')}`;
  const postUrl = `https://sanopilates.com.br/blog/${ano}/${pad(hoje.getMonth() + 1)}/${pad(hoje.getDate())}/${slug}/`;

  // Exporta variáveis para o GitHub Actions
  const envFile = process.env.GITHUB_ENV;
  if (envFile) {
    fs.appendFileSync(envFile, `NOME_ARQUIVO=${nomeArquivo}\n`);
    fs.appendFileSync(envFile, `SEMANA=${semana}\n`);
    fs.appendFileSync(envFile, `TEMA=${temaSanitizado}\n`);
    fs.appendFileSync(envFile, `TITULO=${titulo}\n`);
    fs.appendFileSync(envFile, `POST_URL=${postUrl}\n`);
  }
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
