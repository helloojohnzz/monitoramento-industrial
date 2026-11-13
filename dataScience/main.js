// Monitoramento da esteira — versão em JavaScript (Node.js 18+) do main.py
//
// Lê os sensores do IO-Link master por um tempo, conta as peças metálicas e
// não metálicas, acompanha o nível do tanque e, no final:
//   - mostra as estatísticas no terminal (igual ao script Python);
//   - gera o arquivo relatorio.html com dois gráficos:
//       • barras: proporção de peças metálicas x não metálicas;
//       • segmentos (linha): distâncias medidas pelo sensor do tanque.
//
// Uso:
//   node main.js            -> lê os sensores reais (precisa estar na rede do laboratório)
//   node main.js --simular  -> gera leituras de teste (para rodar fora do laboratório)

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Endpoints IO-Link usados (tanque e sensor de peças)
const SENSORES = {
  sensor_geral: {
    url: 'http://10.110.12.41/iolinkmaster/port[1]/iolinkdevice/pdin/getdata',
    id: 1,
    tipo: 'geral',
  },
  sensor_metalico: {
    url: 'http://10.110.12.41/iolinkmaster/port[2]/iolinkdevice/pdin/getdata',
    id: 2,
    tipo: 'metalica',
  },
}

// Faixas do sensor metálico (porta 2): o mesmo sensor identifica os dois tipos de peça
const LIMITE_MIN_METALICA = 7000
const LIMITE_MAX_METALICA = 10000

const LIMITE_MIN_NAO_METALICA = 1500
const LIMITE_MAX_NAO_METALICA = 2500

// Faixas do sensor de distância (Sensor 1) que indicam a queda de uma peça no tanque
const LIMITE_MIN_QUEDA_METALICA = 220
const LIMITE_MAX_QUEDA_METALICA = 250

const LIMITE_MIN_QUEDA_NAO_METALICA = 90
const LIMITE_MAX_QUEDA_NAO_METALICA = 110

// Quantidade de peças (metálicas + não metálicas) que caem no tanque até ele ficar cheio
const CAPACIDADE_TANQUE = 2

const TIMEOUT_REQUISICAO = 3 // segundos para o timeout da API
const DURACAO_MONITORAMENTO = 20 // segundos

// Os dois sensores são lidos rápido para não perder peças em movimento.
// O nível do tanque entra no histórico (estatísticas) só de tempos em tempos.
const INTERVALO_LEITURA_PECAS = 0.05 // segundos (50 ms)
const INTERVALO_HISTORICO_TANQUE = 1.0 // segundos

const MODO_SIMULACAO = process.argv.includes('--simular')
const ARQUIVO_RELATORIO = fileURLToPath(new URL('./relatorio.html', import.meta.url))

// Históricos e contadores consolidados
const historicoDistanciasTanque = [] // { segundo, valor }
let totalPecasMetalicas = 0
let totalPecasNaoMetalicas = 0

// Contagem de peças que caíram no tanque (detectadas pelo sensor de distância)
let pecasMetalicasNoTanque = 0
let pecasNaoMetalicasNoTanque = 0
let quedaAtual = null // tipo de queda em andamento: evita contar a mesma peça em leituras seguidas
let tanqueCheio = false

const esperar = (segundos) => new Promise((r) => setTimeout(r, segundos * 1000))

// ---------------------------------------------------------------
// Estatística (equivalente ao módulo statistics do Python)
// ---------------------------------------------------------------
const media = (v) => v.reduce((a, b) => a + b, 0) / v.length

function mediana(v) {
  const o = [...v].sort((a, b) => a - b)
  const m = Math.floor(o.length / 2)
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2
}

// Desvio padrão amostral (igual ao statistics.stdev)
function desvioPadrao(v) {
  if (v.length < 2) return 0
  const m = media(v)
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1))
}

// ---------------------------------------------------------------
// Leitura dos sensores
// ---------------------------------------------------------------

/** Faz a requisição HTTP real para a API do IO-Link e retorna o JSON estruturado. */
async function consultarSensorIolink(url) {
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_REQUISICAO * 1000) })
    if (resposta.status === 200) return await resposta.json()
    console.log(`⚠️ Erro HTTP ${resposta.status} na URL: ${url}`)
    return null
  } catch (e) {
    console.log(`❌ Falha de conexão com o IO-Link (${url}): ${e.message}`)
    return null
  }
}

// Simulação: imita os valores dos sensores para testar o script fora do laboratório.
// Uma peça passa a cada ~2 s (metálica ou não) e o nível do tanque oscila.
const simulador = { inicio: Date.now() }
function lerSimulado(config) {
  const t = (Date.now() - simulador.inicio) / 1000
  const ciclo = Math.floor(t / 2)
  const fase = t % 2
  const metalica = ciclo % 3 !== 1
  let valor
  if (config.id === 2) {
    // sensor de peças: sobe enquanto a peça passa (0,0 a 0,6 s do ciclo)
    if (fase < 0.6) valor = metalica ? 1800 + Math.round(fase * 11000) : 2000
    else valor = 300
  } else {
    // sensor do tanque: valor base com ruído e uma "queda" depois de cada peça
    if (fase > 1.0 && fase < 1.2) valor = metalica ? 235 : 100
    else valor = Math.round(160 + 25 * Math.sin(t / 3) + (Math.random() - 0.5) * 10)
  }
  return { code: 200, data: { value: valor.toString(16).toUpperCase().padStart(4, '0') } }
}

/** Lê um sensor e devolve [valor decimal, hex] ou [null, null] se falhar. */
async function lerValor(config) {
  const dados = MODO_SIMULACAO ? lerSimulado(config) : await consultarSensorIolink(config.url)
  if (!dados || dados.code !== 200) return [null, null]
  const hex = dados.data?.value
  const valor = parseInt(hex, 16)
  if (Number.isNaN(valor)) {
    console.log(`⚠️ Erro ao processar os dados JSON do sensor ${config.id}`)
    return [null, null]
  }
  return [valor, hex]
}

/** Devolve 'metalica', 'nao_metalica' ou null conforme a faixa do sensor 2. */
function classificarPeca(valor) {
  if (valor >= LIMITE_MIN_METALICA && valor <= LIMITE_MAX_METALICA) return 'metalica'
  if (valor >= LIMITE_MIN_NAO_METALICA && valor <= LIMITE_MAX_NAO_METALICA) return 'nao_metalica'
  return null
}

/** Devolve 'metalica', 'nao_metalica' ou null conforme a faixa do sensor de distância. */
function classificarQueda(valor) {
  if (valor >= LIMITE_MIN_QUEDA_METALICA && valor <= LIMITE_MAX_QUEDA_METALICA) return 'metalica'
  if (valor >= LIMITE_MIN_QUEDA_NAO_METALICA && valor <= LIMITE_MAX_QUEDA_NAO_METALICA) return 'nao_metalica'
  return null
}

/** Lê o sensor de distância do tanque e conta as peças que caem nele. */
async function processarTanque(guardarNoHistorico, segundo) {
  const [valor, hex] = await lerValor(SENSORES.sensor_geral)
  if (valor === null) return

  if (guardarNoHistorico) {
    historicoDistanciasTanque.push({ segundo, valor })
    console.log(`[SENSOR 1 - TANQUE] Nível: ${valor} cm (Hex: ${hex})`)
  }

  // Conta só quando o valor ENTRA em uma das faixas de queda
  const tipo = classificarQueda(valor)
  if (tipo !== null && tipo !== quedaAtual) {
    let rotulo
    if (tipo === 'metalica') {
      pecasMetalicasNoTanque++
      rotulo = 'metálica'
    } else {
      pecasNaoMetalicasNoTanque++
      rotulo = 'não metálica'
    }

    const pecasNoTanque = pecasMetalicasNoTanque + pecasNaoMetalicasNoTanque
    console.log(`[SENSOR 1 - TANQUE] ⬇️ Peça ${rotulo} caiu no tanque | Valor: ${valor} (${pecasNoTanque}/${CAPACIDADE_TANQUE})`)

    if (pecasNoTanque >= CAPACIDADE_TANQUE && !tanqueCheio) {
      tanqueCheio = true
      console.log(`   -> 🚨 ALERTA: TANQUE CHEIO! Limite de ${CAPACIDADE_TANQUE} peças atingido.`)
    }
  }

  quedaAtual = tipo
}

// ---------------------------------------------------------------
// Estatísticas finais (terminal)
// ---------------------------------------------------------------

function calcularResumo(tempoTotal) {
  const leituras = historicoDistanciasTanque.map((l) => l.valor)
  const total = totalPecasMetalicas + totalPecasNaoMetalicas
  return {
    duracao: tempoTotal,
    leituras: leituras.length,
    mediaTanque: leituras.length ? Math.round(media(leituras)) : null,
    medianaTanque: leituras.length ? Math.round(mediana(leituras)) : null,
    desvioTanque: leituras.length ? desvioPadrao(leituras) : null,
    minTanque: leituras.length ? Math.min(...leituras) : null,
    maxTanque: leituras.length ? Math.max(...leituras) : null,
    pecasNoTanque: pecasMetalicasNoTanque + pecasNaoMetalicasNoTanque,
    pecasMetalicasNoTanque,
    pecasNaoMetalicasNoTanque,
    tanqueCheio,
    total,
    metalicas: totalPecasMetalicas,
    naoMetalicas: totalPecasNaoMetalicas,
    propMetalica: total ? (totalPecasMetalicas / total) * 100 : 0,
    propNaoMetalica: total ? (totalPecasNaoMetalicas / total) * 100 : 0,
    taxaPorMinuto: tempoTotal > 0 ? (total / tempoTotal) * 60 : 0,
  }
}

function exibirEstatisticasFinais(r) {
  console.log('\n' + '='.repeat(60))
  console.log(`🏁 MONITORAMENTO ENCERRADO - ESTATÍSTICAS FINAIS (${MODO_SIMULACAO ? 'SIMULAÇÃO' : 'API REAL'})`)
  console.log('='.repeat(60))

  // --- 1. ESTATÍSTICAS DO SENSOR 1 (TANQUE) ---
  console.log('\n🌊 [SENSOR 1 - ENCHIMENTO DO TANQUE]')
  if (r.leituras > 0) {
    console.log(` - Total de leituras capturadas: ${r.leituras}`)
    console.log(` - Média de nível (arredondada): ${r.mediaTanque} cm`)
    console.log(` - Mediana de nível (arredondada): ${r.medianaTanque} cm`)
    console.log(` - Desvio Padrão: ${r.desvioTanque.toFixed(2)} cm`)
  } else {
    console.log(' - Nenhuma leitura registrada para o sensor do tanque.')
  }

  console.log(` - Peças que caíram no tanque: ${r.pecasNoTanque}/${CAPACIDADE_TANQUE}`)
  console.log(`   • Metálicas: ${r.pecasMetalicasNoTanque}`)
  console.log(`   • Não Metálicas: ${r.pecasNaoMetalicasNoTanque}`)
  if (r.tanqueCheio) console.log(' - 🚨 Situação: TANQUE CHEIO')
  else console.log(` - Situação: OK (faltam ${CAPACIDADE_TANQUE - r.pecasNoTanque} peças)`)

  // --- 2. ESTATÍSTICAS DE PEÇAS (METÁLICO + NÃO METÁLICO) ---
  console.log('\n📦 [PEÇAS CONTADAS - SENSOR 2]')
  console.log(` - Total geral acumulado: ${r.total}`)
  console.log(`   • Metálicas: ${r.metalicas}`)
  console.log(`   • Não Metálicas: ${r.naoMetalicas}`)
  if (r.total > 0) {
    console.log(` - Proporção: Metálicas ${r.propMetalica.toFixed(2)}% | Não Metálicas ${r.propNaoMetalica.toFixed(2)}%`)
  }
  if (r.duracao > 0) console.log(` - 🚀 Taxa de Produção: ${r.taxaPorMinuto.toFixed(2)} peças/minuto`)

  console.log('\n' + '='.repeat(60))
}

// ---------------------------------------------------------------
// Relatório HTML com os gráficos
// ---------------------------------------------------------------

function gerarRelatorio(r) {
  const dados = {
    geradoEm: new Date().toLocaleString('pt-BR'),
    simulacao: MODO_SIMULACAO,
    resumo: r,
    distancias: historicoDistanciasTanque,
  }
  // "<" escapado para o JSON não fechar a tag <script> por engano
  const json = JSON.stringify(dados).replace(/</g, '\\u003c')
  writeFileSync(ARQUIVO_RELATORIO, MODELO_RELATORIO.replace('__DADOS__', json), 'utf8')
  console.log(`\n📊 Relatório com os gráficos salvo em: ${ARQUIVO_RELATORIO}`)
  console.log('   Abra esse arquivo no navegador.')
}

const MODELO_RELATORIO = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório da esteira</title>
<style>
  :root {
    --surface: #f5f0e6; --card: #fbf8f2; --border: #e0d7c6; --grid: #e6dece;
    --text-1: #0b0b0b; --text-2: #4a4a4a; --text-3: #6f6a60;
    --metal: #eb6834; --nao-metal: #2952cc; --linha: #2952cc;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --surface: #1a1a19; --card: #232321; --border: #3a3935; --grid: #34332f;
      --text-1: #f0efec; --text-2: #c3c2b7; --text-3: #9c9a90;
      --metal: #d95926; --nao-metal: #3987e5; --linha: #3987e5;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--surface); color: var(--text-1);
         font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 17px; margin: 0 0 2px; }
  .sub { color: var(--text-2); margin: 0 0 20px; }
  .aviso { display: inline-block; font-size: 13px; padding: 2px 10px; border-radius: 999px;
           border: 1px solid var(--border); color: var(--text-2); }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .tile, .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; }
  .tile { padding: 12px 14px; }
  .tile .rot { color: var(--text-2); font-size: 13px; }
  .tile .val { font-size: 22px; font-weight: 650; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .card { padding: 16px; margin-bottom: 16px; position: relative; }
  .card .desc { color: var(--text-2); font-size: 13px; margin: 0 0 12px; }
  .legenda { display: flex; gap: 16px; font-size: 13px; color: var(--text-2); margin-bottom: 8px; flex-wrap: wrap; }
  .legenda span::before { content: ""; display: inline-block; width: 10px; height: 10px; border-radius: 2px;
                          margin-right: 6px; background: var(--c); vertical-align: -1px; }
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  svg text { fill: var(--text-2); font-size: 12px; font-variant-numeric: tabular-nums; }
  .tip { position: absolute; pointer-events: none; background: var(--card); border: 1px solid var(--border);
         border-radius: 8px; padding: 6px 10px; font-size: 13px; box-shadow: 0 4px 14px rgba(0,0,0,.12);
         opacity: 0; transition: opacity .1s; white-space: nowrap; }
  .tip b { font-variant-numeric: tabular-nums; }
  details { margin-top: 10px; font-size: 13px; color: var(--text-2); }
  table { border-collapse: collapse; margin-top: 6px; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 3px 14px 3px 0; border-bottom: 1px solid var(--grid); }
  .vazio { color: var(--text-3); padding: 24px 0; text-align: center; }
</style>
</head>
<body>
<main>
  <h1>Relatório da esteira de triagem</h1>
  <p class="sub" id="sub"></p>

  <div class="tiles" id="tiles"></div>

  <section class="card" id="card-barras">
    <h2>Peças metálicas x não metálicas</h2>
    <p class="desc">Quantidade e proporção de cada tipo de peça contada pelo sensor 2.</p>
    <div class="legenda">
      <span style="--c: var(--metal)">Metálicas</span>
      <span style="--c: var(--nao-metal)">Não metálicas</span>
    </div>
    <div id="barras"></div>
    <div class="tip" id="tip-barras"></div>
  </section>

  <section class="card" id="card-linha">
    <h2>Distâncias medidas no tanque</h2>
    <p class="desc">Leituras do sensor de distância (sensor 1) ao longo do monitoramento.</p>
    <div id="linha"></div>
    <div class="tip" id="tip-linha"></div>
    <details><summary>Ver dados em tabela</summary><div id="tabela"></div></details>
  </section>
</main>

<script>
const DADOS = __DADOS__;
const r = DADOS.resumo;
const fmt = (n, d = 0) => n == null ? '–' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, pai) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (pai) pai.appendChild(e); return e; };

document.getElementById('sub').innerHTML =
  'Gerado em ' + DADOS.geradoEm + ' · ' + fmt(r.duracao, 1) + ' s de monitoramento ' +
  (DADOS.simulacao ? '<span class="aviso">dados simulados</span>' : '');

// ---------- Indicadores ----------
const tiles = [
  ['Total de peças', fmt(r.total)],
  ['Metálicas', fmt(r.metalicas) + ' (' + fmt(r.propMetalica, 1) + '%)'],
  ['Não metálicas', fmt(r.naoMetalicas) + ' (' + fmt(r.propNaoMetalica, 1) + '%)'],
  ['Peças por minuto', fmt(r.taxaPorMinuto, 1)],
  ['Distância média', r.mediaTanque == null ? '–' : fmt(r.mediaTanque) + ' cm'],
  ['Desvio padrão', r.desvioTanque == null ? '–' : fmt(r.desvioTanque, 2) + ' cm'],
];
document.getElementById('tiles').innerHTML = tiles.map(([a, b]) =>
  '<div class="tile"><div class="rot">' + a + '</div><div class="val">' + b + '</div></div>').join('');

function mostrarTip(tip, card, html, x, y) {
  tip.innerHTML = html; tip.style.opacity = 1;
  const w = tip.offsetWidth, max = card.clientWidth - w - 8;
  tip.style.left = Math.max(8, Math.min(max, x + 12)) + 'px';
  tip.style.top = (y - tip.offsetHeight - 10) + 'px';
}
const esconderTip = (tip) => { tip.style.opacity = 0; };

// ---------- Gráfico de barras (horizontal) ----------
function barras() {
  const alvo = document.getElementById('barras'), card = document.getElementById('card-barras'), tip = document.getElementById('tip-barras');
  alvo.innerHTML = '';
  if (!r.total) { alvo.innerHTML = '<p class="vazio">Nenhuma peça contada.</p>'; return; }
  const itens = [
    { nome: 'Metálicas', valor: r.metalicas, pct: r.propMetalica, cor: 'var(--metal)' },
    { nome: 'Não metálicas', valor: r.naoMetalicas, pct: r.propNaoMetalica, cor: 'var(--nao-metal)' },
  ];
  const W = Math.max(280, alvo.clientWidth), estreito = W < 500, rotW = estreito ? 96 : 120, valW = estreito ? 92 : 110, barH = 24, passo = 52, H = itens.length * passo;
  const larg = W - rotW - valW;
  const max = Math.max(...itens.map((i) => i.valor), 1);
  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Barras: metálicas ' + r.metalicas + ', não metálicas ' + r.naoMetalicas }, alvo);
  el('line', { x1: rotW, x2: rotW, y1: 0, y2: H, stroke: 'var(--grid)', 'stroke-width': 1 }, svg);
  itens.forEach((it, i) => {
    const y = i * passo + (passo - barH) / 2, w = Math.max(2, (it.valor / max) * larg), rr = Math.min(4, w / 2);
    const t = el('text', { x: rotW - 10, y: y + barH / 2 + 4, 'text-anchor': 'end' }, svg); t.textContent = it.nome;
    // barra com ponta arredondada (4px) e base reta
    el('path', { d: 'M' + rotW + ',' + y + 'h' + (w - rr) + 'a' + rr + ',' + rr + ' 0 0 1 ' + rr + ',' + rr + 'v' + (barH - 2 * rr) +
      'a' + rr + ',' + rr + ' 0 0 1 ' + (-rr) + ',' + rr + 'h' + (rr - w) + 'z', fill: it.cor }, svg);
    const v = el('text', { x: rotW + w + 8, y: y + barH / 2 + 4, style: 'fill: var(--text-1); font-weight: 600' }, svg);
    v.textContent = fmt(it.valor) + '  ·  ' + fmt(it.pct, 1) + '%';
    const alvoHover = el('rect', { x: 0, y: i * passo, width: W, height: passo, fill: 'transparent' }, svg);
    alvoHover.addEventListener('mousemove', (e) => {
      const b = card.getBoundingClientRect();
      mostrarTip(tip, card, it.nome + ': <b>' + fmt(it.valor) + '</b> peças (' + fmt(it.pct, 1) + '%)', e.clientX - b.left, e.clientY - b.top);
    });
    alvoHover.addEventListener('mouseleave', () => esconderTip(tip));
  });
}

// ---------- Gráfico de segmentos (linha) ----------
function linha() {
  const alvo = document.getElementById('linha'), card = document.getElementById('card-linha'), tip = document.getElementById('tip-linha');
  const pts = DADOS.distancias;
  document.getElementById('tabela').innerHTML = pts.length
    ? '<table><tr><th>Tempo (s)</th><th>Distância (cm)</th></tr>' + pts.map((p) => '<tr><td>' + fmt(p.segundo, 1) + '</td><td>' + fmt(p.valor) + '</td></tr>').join('') + '</table>'
    : '<p>Sem leituras.</p>';
  alvo.innerHTML = '';
  if (!pts.length) { alvo.innerHTML = '<p class="vazio">Nenhuma leitura do sensor de distância.</p>'; return; }

  const W = Math.max(280, alvo.clientWidth), H = W < 500 ? 220 : 300, m = { t: 12, r: 56, b: 34, l: 44 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const xs = pts.map((p) => p.segundo), ys = pts.map((p) => p.valor);
  const x0 = Math.min(...xs), x1 = Math.max(...xs, x0 + 1);
  // eixo y com números "redondos"
  const bruto = (Math.max(...ys) - Math.min(...ys)) || 10;
  const passo = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000].find((s) => bruto / s <= 5) || 2000;
  const y0 = Math.floor(Math.min(...ys) / passo) * passo, y1 = Math.ceil(Math.max(...ys) / passo) * passo || passo;
  const sx = (v) => m.l + ((v - x0) / (x1 - x0)) * pw;
  const sy = (v) => m.t + ph - ((v - y0) / ((y1 - y0) || 1)) * ph;

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Linha com ' + pts.length + ' leituras de distância' }, alvo);
  for (let v = y0; v <= y1 + 1e-9; v += passo) {
    el('line', { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v), stroke: 'var(--grid)', 'stroke-width': 1 }, svg);
    const t = el('text', { x: m.l - 8, y: sy(v) + 4, 'text-anchor': 'end' }, svg); t.textContent = fmt(v);
  }
  const nx = Math.min(W < 500 ? 4 : 6, pts.length);
  for (let i = 0; i < nx; i++) {
    const v = x0 + (i / Math.max(1, nx - 1)) * (x1 - x0);
    const t = el('text', { x: sx(v), y: H - 10, 'text-anchor': 'middle' }, svg); t.textContent = fmt(v, 0) + ' s';
  }
  el('path', { d: pts.map((p, i) => (i ? 'L' : 'M') + sx(p.segundo).toFixed(1) + ',' + sy(p.valor).toFixed(1)).join(''),
    fill: 'none', stroke: 'var(--linha)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
  // ponto e rótulo só na última leitura
  const ult = pts[pts.length - 1];
  el('circle', { cx: sx(ult.segundo), cy: sy(ult.valor), r: 4, fill: 'var(--linha)', stroke: 'var(--card)', 'stroke-width': 2 }, svg);
  const tu = el('text', { x: sx(ult.segundo) + 8, y: sy(ult.valor) + 4, style: 'fill: var(--text-1); font-weight: 600' }, svg); tu.textContent = fmt(ult.valor) + ' cm';

  // camada de hover: linha vertical + ponto + tooltip
  const cruz = el('line', { y1: m.t, y2: m.t + ph, stroke: 'var(--text-3)', 'stroke-width': 1, opacity: 0 }, svg);
  const marca = el('circle', { r: 5, fill: 'var(--linha)', stroke: 'var(--card)', 'stroke-width': 2, opacity: 0 }, svg);
  const area = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent' }, svg);
  area.addEventListener('mousemove', (e) => {
    const caixa = svg.getBoundingClientRect(), xv = x0 + ((e.clientX - caixa.left) * (W / caixa.width) - m.l) / pw * (x1 - x0);
    let p = pts[0]; for (const q of pts) if (Math.abs(q.segundo - xv) < Math.abs(p.segundo - xv)) p = q;
    cruz.setAttribute('x1', sx(p.segundo)); cruz.setAttribute('x2', sx(p.segundo)); cruz.setAttribute('opacity', 1);
    marca.setAttribute('cx', sx(p.segundo)); marca.setAttribute('cy', sy(p.valor)); marca.setAttribute('opacity', 1);
    const b = card.getBoundingClientRect(), k = caixa.width / W;
    mostrarTip(tip, card, fmt(p.segundo, 1) + ' s: <b>' + fmt(p.valor) + ' cm</b>', caixa.left - b.left + sx(p.segundo) * k, caixa.top - b.top + sy(p.valor) * k);
  });
  area.addEventListener('mouseleave', () => { cruz.setAttribute('opacity', 0); marca.setAttribute('opacity', 0); esconderTip(tip); });
}

// Desenha os gráficos na largura real da tela e redesenha quando ela muda
function desenhar() { barras(); linha(); }
desenhar();
let redim; window.addEventListener('resize', () => { clearTimeout(redim); redim = setTimeout(desenhar, 150); });
</script>
</body>
</html>`

// ---------------------------------------------------------------
// Laço principal
// ---------------------------------------------------------------

async function monitorarProducao() {
  console.log(`Iniciando monitoramento ${MODO_SIMULACAO ? 'SIMULADO' : 'conectado aos endpoints IO-Link'} por ${DURACAO_MONITORAMENTO} segundos...`)
  console.log(`Sensores lidos a cada ${(INTERVALO_LEITURA_PECAS * 1000).toFixed(0)} ms\n`)

  const tempoInicio = Date.now()
  const decorrido = () => (Date.now() - tempoInicio) / 1000
  let ultimoHistoricoTanque = -Infinity
  let pecaPresente = false // há uma peça na frente do sensor agora?
  let maiorValorPeca = 0 // maior valor lido enquanto a peça passa

  while (decorrido() < DURACAO_MONITORAMENTO) {
    const agora = decorrido()

    // --- Sensor 2 (peças): lido em todo ciclo ---
    const [valor] = await lerValor(SENSORES.sensor_metalico)
    if (valor !== null) {
      // Qualquer valor a partir do início da faixa não metálica indica peça na frente
      const temPeca = valor >= LIMITE_MIN_NAO_METALICA

      if (temPeca) {
        // Peça entrou ou continua na frente: guarda o maior valor visto.
        // (Uma peça metálica passa por 1500-2500 enquanto o valor sobe até 7000+,
        //  por isso a classificação só é feita quando a peça sai.)
        pecaPresente = true
        maiorValorPeca = Math.max(maiorValorPeca, valor)
      } else if (pecaPresente) {
        // Peça saiu da frente do sensor: classifica UMA vez pelo maior valor
        const tipo = classificarPeca(maiorValorPeca)
        let rotulo = null
        if (tipo === 'metalica') {
          totalPecasMetalicas++
          rotulo = 'METÁLICA'
        } else if (tipo === 'nao_metalica') {
          totalPecasNaoMetalicas++
          rotulo = 'NÃO METÁLICA'
        } else {
          console.log(`[SENSOR 2 - PEÇAS] ⚠️ Peça ignorada: pico ${maiorValorPeca} fora das faixas`)
        }

        if (rotulo) {
          const total = totalPecasMetalicas + totalPecasNaoMetalicas
          console.log(`[SENSOR 2 - PEÇAS] ✅ Peça ${rotulo} | Pico: ${maiorValorPeca} | Acumulado: ${total}`)
        }

        pecaPresente = false
        maiorValorPeca = 0
      }
    }

    // --- Sensor 1 (tanque): lido em todo ciclo para não perder quedas ---
    const guardar = agora - ultimoHistoricoTanque >= INTERVALO_HISTORICO_TANQUE
    if (guardar) ultimoHistoricoTanque = agora
    await processarTanque(guardar, Math.round(agora * 10) / 10)

    await esperar(INTERVALO_LEITURA_PECAS)
  }

  const resumo = calcularResumo(decorrido())
  exibirEstatisticasFinais(resumo)
  gerarRelatorio(resumo)
}

monitorarProducao()
