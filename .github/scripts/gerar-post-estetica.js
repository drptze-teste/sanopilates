const googleTrends = require('google-trends-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// ── Configuração desta seção ────────────────────────────────────────────────
const POSTS_DIR = 'estetica-e-bem-estar/_posts';
const BASE_FOTO = 'spa';                       // palavra-base para a busca de fotos
const SITE_URL  = 'https://sanopilates.com.br/estetica-e-bem-estar/';

// ── Datas e semana ─────────────────────────────────────────────────────────
const hoje = new Date();
const inicioAno = new Date(hoje.getFullYear(), 0, 1);
const semana = Math.ceil(
  ((hoje - inicioAno) / 86400000 + inicioAno.getDay() + 1) / 7
);
const ano = hoje.getFullYear();
const pad = (n) => String(n).padStart(2, '0');
const dataHoje = `${ano}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;

// ── Temas rotativos de fallback (estética & bem-estar) ──────────────────────
const temasFallback = [
  'Limpeza de pele: com que frequência fazer para cada tipo de pele',
  'Depilação com cera: mitos e verdades que você precisa saber',
  'Skincare para iniciantes: a rotina mínima que realmente funciona',
  'Massagem relaxante: benefícios para o corpo e para a mente',
  'Como cuidar da pele oleosa, principalmente no calor',
  'Drenagem linfática: o que é e para quem é indicada',
  'Cuidados com a pele masculina: guia simples para começar',
  'Pele seca: causas e como hidratar de verdade',
  'Acne na vida adulta: o que realmente ajuda',
  'Protetor solar: por que usar todos os dias, inclusive no inverno',
  'Massagem modeladora x drenagem: qual a diferença e quando indicar',
  'Autocuidado: por que reservar um tempo para você faz bem à saúde',
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

function tokeniza(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(p => p.length > 2 && !STOP_WORDS.has(p));
}

// Query de fotos: palavra-base + até 4 palavras do tema
function extrairKeywords(tema) {
  const keywords = [BASE_FOTO, ...tokeniza(tema).slice(0, 4)];
  return [...new Set(keywords)].join(' ');
}

// Lê os títulos dos últimos N posts de estética já publicados
function lerPostsRecentes(n = 3) {
  try {
    const dir = path.join(process.cwd(), POSTS_DIR);
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .sort().reverse().slice(0, n)
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

function palavrasSignificativas(texto) {
  return new Set(tokeniza(texto));
}

// Verifica se um tema candidato repete o assunto de algum post recente
function ehRepetitivo(candidato, recentes) {
  const cand = palavrasSignificativas(candidato);
  if (cand.size === 0) return false;
  for (const titulo of recentes) {
    const post = palavrasSignificativas(titulo);
    let comuns = 0;
    for (const p of cand) if (post.has(p)) comuns++;
    if (comuns >= 2 || comuns / cand.size >= 0.5) return true;
  }
  return false;
}

// Busca 3 fotos no Unsplash; fallback = fotos reais do estúdio
async function buscarFotosUnsplash(query) {
  const fallback = [
    { url: '/images/estetica/sala-estetica.jpg', alt: 'Sala de estética do Estúdio Benesse' },
    { url: '/images/estetica/maca-zen.jpg',      alt: 'Sala de massagem aconchegante' },
    { url: '/images/estetica/recepcao-cafe.jpg', alt: 'Recepção do Estúdio Benesse' },
  ];
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    console.log('UNSPLASH_ACCESS_KEY não configurada — usando fotos do estúdio.');
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
    console.log(`Erro Unsplash: ${err.message} — usando fotos do estúdio.`);
    return fallback;
  }
}

// ── Buscar tendências no Google Trends (Brasil) — termos de estética ────────
const palavrasChave = [
  'limpeza de pele',
  'depilação',
  'skincare',
  'massagem relaxante',
  'cuidados com a pele',
  'estética facial',
  'autocuidado',
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
    console.log('Buscando tendências no Google Trends Brasil (estética)...');
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
    systemInstruction: 'Você é o editor de conteúdo do Blog de Estética & Bem-Estar do Estúdio Benesse, localizado na Chácara Santo Antônio (São Paulo). O estúdio oferece depilação, limpeza de pele, massagens e recovery, num ambiente acolhedor que atende todos os públicos. Escreva sempre em português brasileiro, com tom leve, acolhedor e acessível, falando de autocuidado e beleza. Nunca prometa resultados milagrosos nem use linguagem médica ou diagnóstica. Refira-se ao espaço como "Estúdio Benesse · Estética & Bem-Estar". Siga exatamente o formato pedido pelo usuário.',
  });

  const userPrompt = `Gere um post de blog de estética e bem-estar para a semana ${semana} do ano ${ano}.

O tema principal vem das buscas mais quentes do Google Brasil: **${temaDestaque}**
Tema rotativo de apoio: ${temaFallback}
${contextoTrends}

Responda EXATAMENTE neste formato, sem nada antes nem depois:

TITULO: Título chamativo e direto com número ou promessa concreta (sem aspas)
RESUMO: Uma frase que desperta curiosidade e resume o benefício principal (sem aspas)
CORPO:
[introdução de 2-3 linhas conectando o tema à realidade do leitor]

---

## A Realidade: [subtítulo sobre o problema ou contexto do dia a dia]
[2-3 parágrafos com situações que o leitor reconhece]

## Por Que Funciona: [subtítulo sobre o cuidado/serviço e como ele ajuda]
[2-3 parágrafos explicando de forma simples — pode usar listas com ✅ ou ❌]

## Na Prática: [subtítulo com dicas ou passo a passo]
[2-3 parágrafos com orientações concretas e aplicáveis — use numeração ou lista]

## Erros Comuns
[3-4 erros que as pessoas cometem, no formato: ❌ **Erro X** — explicação breve + como fazer certo]

## Conclusão
[Parágrafo final resumindo o benefício + convite caloroso e sem pressão para conhecer o Estúdio Benesse · Estética & Bem-Estar e agendar pelo WhatsApp]

Links obrigatórios — insira naturalmente no texto em pelo menos 3 pontos diferentes:
- Site: [Estúdio Benesse · Estética & Bem-Estar](${SITE_URL}) — use ao mencionar o espaço pela primeira vez e na conclusão
- Instagram: [@benessestudiopilates](https://instagram.com/benessestudiopilates) — use em 1 dica ou callout no meio do texto
- Exemplo de callout Instagram: > 💡 Acompanhe dicas de [tema] no nosso Instagram: [@benessestudiopilates](https://instagram.com/benessestudiopilates)

Regras obrigatórias:
- Não use front matter YAML
- Não escreva "hashtags" nem "tags"
- Não inclua imagens (eu insiro depois)
- Use Markdown: ## para títulos, **negrito**, *itálico*, listas com - ou números
- Tom: leve, acolhedor, sem promessas milagrosas
- Não dê conselhos médicos; em casos específicos, oriente a procurar avaliação profissional`;

  async function gerarComRetry(tentativa = 1) {
    try {
      console.log(`\nChamando Gemini... (tentativa ${tentativa})`);
      const result = await model.generateContent(userPrompt);
      return result.response.text();
    } catch (err) {
      const isQuota = err.message && err.message.includes('quota');
      const isRate  = err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED'));
      if ((isQuota || isRate) && tentativa < 4) {
        const espera = tentativa * 30000;
        console.log(`Limite de quota atingido. Aguardando ${espera/1000}s antes de tentar novamente...`);
        await new Promise(r => setTimeout(r, espera));
        return gerarComRetry(tentativa + 1);
      }
      throw err;
    }
  }

  const bruto = await gerarComRetry();

  // ── Montar o post final ─────────────────────────────────────────────────────
  const limpaAspas = (s) => s.replace(/^["']|["']$/g, '').replace(/"/g, '').trim();

  const mTitulo = bruto.match(/TITULO:\s*(.+)/i);
  const mResumo = bruto.match(/RESUMO:\s*(.+)/i);
  const mCorpo  = bruto.match(/CORPO:\s*([\s\S]*)$/i);

  const titulo = mTitulo ? limpaAspas(mTitulo[1]) : temaDestaque;
  const resumo = mResumo ? limpaAspas(mResumo[1]) : `Dicas sobre ${temaDestaque} no Estúdio Benesse.`;

  let corpo = mCorpo ? mCorpo[1] : bruto;
  corpo = corpo
    .replace(/^---[\s\S]*?---/, '')
    .replace(/^\s*TITULO:.*$/gim, '')
    .replace(/^\s*RESUMO:.*$/gim, '')
    .replace(/^\s*CORPO:\s*$/gim, '')
    .replace(/^\s*hashtags?:.*$/gim, '')
    .trim();

  // 1ª foto antes do primeiro subtítulo
  corpo = corpo.replace(/\n#{2,3} /, `\n\n![${inline1.alt}](${inline1.url})\n\n## `);
  // 2ª foto antes da Conclusão
  if (/\n#{2,3}\s*Conclus/i.test(corpo)) {
    corpo = corpo.replace(/\n#{2,3}\s*Conclus[^\n]*/i, (m) =>
      `\n\n![${inline2.alt}](${inline2.url})${m}`);
  }

  // Callout SEO interno antes do 2º subtítulo
  let nTitulos = 0;
  corpo = corpo.replace(/\n#{2,3} /g, (m) => {
    nTitulos++;
    if (nTitulos === 2) {
      return `\n\n> 💡 **Dica:** quer cuidar de você num ambiente acolhedor? [Conheça a Estética & Bem-Estar do Estúdio Benesse](/estetica-e-bem-estar/) e agende pelo WhatsApp.\n${m}`;
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
  const slug = `estetica-semana-${String(semana).padStart(2, '0')}`;
  const nomeArquivo = `${POSTS_DIR}/${dataHoje}-${slug}.md`;
  fs.writeFileSync(path.join(process.cwd(), nomeArquivo), conteudo, 'utf8');

  console.log(`\nPost salvo: ${nomeArquivo}`);
  console.log('--- Prévia ---');
  console.log(conteudo.substring(0, 400));

  const temaSanitizado = temaDestaque
    .replace(/[^\w\sáéíóúãõâêîôûàèìòùçÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÇ-]/g, '')
    .trim()
    .substring(0, 60);

  const postUrl = `https://sanopilates.com.br/estetica-e-bem-estar/blog/${ano}/${pad(hoje.getMonth() + 1)}/${pad(hoje.getDate())}/${slug}/`;

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
