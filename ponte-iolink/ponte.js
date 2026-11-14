// Ponte IO-Link -> API Spring Boot
//
// Lê os sensores ligados no IO-Link master (ifm AL13xx) pela API REST dele
// e, a cada peça que passa na esteira, envia { isMetal, distance, tank } para
// o POST /records do back-end, que grava no MySQL.
//
// A classificação segue a lógica calibrada do script dataScience/main.py:
//   - porta 2 (sensor de peças): o valor sobe enquanto a peça passa; quando ela
//     sai, o maior valor (pico) diz o tipo: 7000-10000 = metálica,
//     1500-2500 = não metálica;
//   - porta 1 (sensor de distância): mede a distância no tanque.
//
// Uso:
//   node ponte.js          -> modo normal (lê o master e envia para a API)
//   node ponte.js --teste  -> só mostra os valores dos sensores na tela

import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8'))
const { masterUrl, apiUrl, intervaloLeituraMs, sensores, tanques } = config

// Variáveis de ambiente têm prioridade (ex.: MASTER_URL=http://10.110.12.41)
const MASTER_URL = process.env.MASTER_URL || masterUrl
const API_URL = process.env.API_URL || apiUrl
// Chave exigida pela API para gravar dados (variável API_KEY, a mesma do back-end)
const API_KEY = process.env.API_KEY || config.apiKey || ''
const MODO_TESTE = process.argv.includes('--teste')

// ---------------------------------------------------------------
// Leitura do IO-Link master
// ---------------------------------------------------------------

// Busca o dado de processo (pdin) de uma porta. O master responde:
// {"cid":-1,"data":{"value":"0331"},"code":200}
async function lerPorta(porta) {
  const url = `${MASTER_URL}/iolinkmaster/port[${porta}]/iolinkdevice/pdin/getdata`
  const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
  const json = await res.json()
  if (json.code !== 200) throw new Error(`porta ${porta} respondeu code ${json.code}`)
  return parseInt(json.data.value, 16)
}

const dentro = (valor, [min, max]) => valor >= min && valor <= max

/** Devolve 'metalica', 'nao_metalica' ou null conforme o pico do sensor de peças. */
function classificarPeca(pico) {
  if (dentro(pico, sensores.peca.faixaMetalica)) return 'metalica'
  if (dentro(pico, sensores.peca.faixaNaoMetalica)) return 'nao_metalica'
  return null
}

const paraCm = (bruto) => Math.round(bruto * (sensores.distancia.fatorParaCm ?? 1) * 10) / 10

// ---------------------------------------------------------------
// Envio para a API
// ---------------------------------------------------------------

// Leituras que não puderam ser enviadas (API fora do ar) ficam aqui
// e são reenviadas na próxima tentativa, para não perder peças.
const filaEnvio = []

async function enviarPendentes() {
  while (filaEnvio.length > 0) {
    const leitura = filaEnvio[0]
    let res
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(API_KEY && { 'X-API-Key': API_KEY }),
        },
        body: JSON.stringify(leitura),
        signal: AbortSignal.timeout(3000),
      })
    } catch (e) {
      // API fora do ar: mantém na fila e tenta de novo no próximo ciclo
      console.error(`✖ API indisponível (${e.message}). ${filaEnvio.length} leitura(s) aguardando.`)
      return
    }

    const tipo = leitura.isMetal ? 'METÁLICA' : 'não metálica'
    if (res.ok) {
      console.log(`✔ enviado: ${tipo} | ${leitura.tank} | distância ${leitura.distance} cm`)
      filaEnvio.shift()
    } else if (res.status === 409) {
      // Tanque cheio: a API recusa. Não adianta reenviar.
      console.error(`⚠ ${leitura.tank} está cheio: peça ${tipo} não registrada.`)
      filaEnvio.shift()
    } else if (res.status === 401) {
      console.error('✖ Chave de API recusada (401). Confira a variável API_KEY.')
      return
    } else if (res.status >= 500) {
      console.error(`✖ Erro na API (HTTP ${res.status}). Tentando de novo depois.`)
      return
    } else {
      // Outros erros (400 etc.): a leitura é inválida, descarta para não travar a fila
      console.error(`✖ API recusou a leitura (HTTP ${res.status}): ${await res.text()}`)
      filaEnvio.shift()
    }
  }
}

// ---------------------------------------------------------------
// Laço principal
// ---------------------------------------------------------------

let pecaPresente = false // há uma peça na frente do sensor agora?
let maiorValorPeca = 0 // maior valor lido enquanto a peça passa

function processar(valorPeca, distanciaCm) {
  if (valorPeca >= sensores.peca.presencaAPartirDe) {
    // Peça entrou ou continua na frente: guarda o maior valor visto.
    // (Uma peça metálica passa por 1500-2500 enquanto o valor sobe até 7000+,
    //  por isso a classificação só é feita quando a peça sai.)
    pecaPresente = true
    maiorValorPeca = Math.max(maiorValorPeca, valorPeca)
    return
  }

  if (!pecaPresente) return

  // Peça saiu da frente do sensor: classifica UMA vez pelo maior valor
  const tipo = classificarPeca(maiorValorPeca)
  if (tipo) {
    const isMetal = tipo === 'metalica'
    filaEnvio.push({
      isMetal,
      distance: distanciaCm,
      tank: isMetal ? tanques.metalica : tanques.naoMetalica,
    })
    console.log(`→ peça ${isMetal ? 'METÁLICA' : 'não metálica'} detectada (pico ${maiorValorPeca})`)
  } else {
    console.log(`⚠ peça ignorada: pico ${maiorValorPeca} fora das faixas`)
  }
  pecaPresente = false
  maiorValorPeca = 0
}

async function ciclo() {
  try {
    const [valorPeca, brutoDistancia] = await Promise.all([
      lerPorta(sensores.peca.porta),
      lerPorta(sensores.distancia.porta),
    ])
    const distanciaCm = paraCm(brutoDistancia)

    if (MODO_TESTE) {
      const tipo = valorPeca >= sensores.peca.presencaAPartirDe ? classificarPeca(valorPeca) ?? 'peça (subindo)' : '-'
      console.log(`peça (porta ${sensores.peca.porta}): ${valorPeca} [${tipo}] | distância (porta ${sensores.distancia.porta}): ${brutoDistancia} = ${distanciaCm} cm`)
    } else {
      processar(valorPeca, distanciaCm)
      await enviarPendentes()
    }
  } catch (e) {
    console.error(`✖ erro ao ler o IO-Link master em ${MASTER_URL}: ${e.message}`)
  }
  setTimeout(ciclo, MODO_TESTE ? 500 : intervaloLeituraMs)
}

console.log(`Ponte IO-Link iniciada${MODO_TESTE ? ' (modo teste)' : ''}`)
console.log(`  master: ${MASTER_URL}`)
if (!MODO_TESTE) {
  console.log(`  API:    ${API_URL}`)
  if (!API_KEY) console.log('  ⚠ sem API_KEY: se a API exigir chave, as peças serão recusadas (401)')
}
ciclo()
