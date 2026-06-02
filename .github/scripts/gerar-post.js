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
const temasFallback = [
  'Pilates para iniciantes',
  'Dor nas costas — causas e como aliviar',
  'Exercício físico depois dos 60',
  'Postura no dia a dia',
  'Pilates e saúde mental',
  'Mobilidade e flexibilidade',
  'Como dormir melhor com exercício',
  'Pilates para quem trabalha sentado',
];
const temaFallback = temasFallback[semana % temasFallback.length];

// ── Galeria de fotos (Unsplash, livres) — pilates / bem-estar ───────────────
// Variam a cada semana para os posts não ficarem repetitivos.
const galeria = [
  { url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80', alt: 'Mulheres praticando Pilates no estúdio' },
  { url: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=1200&q=80', alt: 'Movimento consciente sobre o mat' },
  { url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80', alt: 'Alongamento e bem-estar ao entardecer' },
  { url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80', alt: 'Respiração e equilíbrio' },
  { url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=1200&q=80', alt: 'Acessórios de Pilates e mobilidade' },
  { url: 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=1200&q=80', alt: 'Tapetes de Pilates prontos para a aula' },
];
const n = galeria.length;
const capa    = galeria[semana % n];
const inline1 = galeria[(semana + 2) % n];
const inline2 = galeria[(semana + 4) % n];

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
  let temaDestaque = temaFallback;

  try {
    console.log('Buscando tendências no Google Trends Brasil...');
    const tendencias = await buscarTendencias();

    if (tendencias.length > 0) {
      tendencias.sort((a, b) => b.value - a.value);
      const top5 = tendencias.slice(0, 5);
      temaDestaque = top5[0].query;
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

  console.log(`\nSemana: ${semana} | Tema: ${temaDestaque}`);

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

TITULO: Um título chamativo (sem aspas)
RESUMO: Um resumo de uma linha que desperta curiosidade (sem aspas)
CORPO:
[introdução de 2-3 linhas]

## Subtítulo 1
[2-3 parágrafos]

## Subtítulo 2
[2-3 parágrafos]

## Subtítulo 3
[2-3 parágrafos]

## Conclusão
[parágrafo final com convite suave para uma aula experimental no estúdio]

Regras: não use front matter YAML, não escreva "hashtags", não inclua imagens — eu cuido disso. Use apenas Markdown no corpo (títulos com ##, negrito com **).`;

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
  let corpo    = (mCorpo ? mCorpo[1] : bruto)
    .replace(/^---[\s\S]*?---/, '')            // remove qualquer front matter que escape
    .replace(/^\s*hashtags?:.*$/gim, '')        // remove linha de hashtags que vaze
    .trim();

  // Insere as 2 fotos: a 1ª após a introdução, a 2ª antes da Conclusão
  const blocos = corpo.split(/\n(?=## )/);
  if (blocos.length >= 1) blocos[0] += `\n\n![${inline1.alt}](${inline1.url})`;
  const idxConclusao = blocos.findIndex(b => /^##\s*Conclus/i.test(b));
  if (idxConclusao > 0) {
    blocos[idxConclusao - 1] += `\n\n![${inline2.alt}](${inline2.url})`;
  } else if (blocos.length >= 3) {
    blocos[blocos.length - 2] += `\n\n![${inline2.alt}](${inline2.url})`;
  }
  corpo = blocos.join('\n');

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
