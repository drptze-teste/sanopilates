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
    model: 'gemini-1.5-flash',
    systemInstruction: 'Você é o editor de conteúdo do Blog do Estúdio BNS, um estúdio de pilates focado em saúde, bem-estar, terceira idade e qualidade de vida, localizado numa região com muitos moradores brasileiros e chineses. Escreva sempre em português brasileiro, com tom leve e acessível, como se estivesse explicando para uma amiga de 60 anos curiosa sobre saúde. Retorne APENAS o Markdown do post, sem explicações, sem texto antes ou depois.',
  });

  const userPrompt = `Gere um post completo para a semana ${semana} do ano ${ano}.

O tema principal vem das buscas mais quentes do Google Brasil: **${temaDestaque}**
Tema rotativo de apoio: ${temaFallback}
${contextoTrends}

Use o formato abaixo (mantenha exatamente o front matter YAML no topo):

---
title: "Título do post"
date: ${dataHoje}
excerpt: "Resumo de 1 linha"
---

[introdução de 2-3 linhas]

## Subtítulo 1
[2-3 parágrafos]

## Subtítulo 2
[2-3 parágrafos]

## Subtítulo 3
[2-3 parágrafos]

## Conclusão
[parágrafo final com CTA suave convidando para uma aula experimental no estúdio]

hashtags: #pilates #saude #bemestar`;

  console.log('\nChamando Gemini...');
  const result = await model.generateContent(userPrompt);
  const conteudo = result.response.text();

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

  // Exporta variáveis para o GitHub Actions
  const envFile = process.env.GITHUB_ENV;
  if (envFile) {
    fs.appendFileSync(envFile, `NOME_ARQUIVO=${nomeArquivo}\n`);
    fs.appendFileSync(envFile, `SEMANA=${semana}\n`);
    fs.appendFileSync(envFile, `TEMA=${temaSanitizado}\n`);
  }
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
