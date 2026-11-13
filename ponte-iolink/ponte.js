// Ponte IO-Link -> API Spring Boot
//
// Lê os sensores ligados no IO-Link master (ifm AL13xx) pela API REST dele
// e, a cada peça que passa na esteira, envia { isMetal, distance } para
// o POST /records do back-end, que grava no MySQL.
//
// Uso:
//   node ponte.js          -> modo normal (lê o master e envia para a API)
//   node ponte.js --teste  -> só mostra os valores dos sensores na tela
//                             (para descobrir qual porta é qual sensor)

import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8'))
const { masterUrl, apiUrl, intervaloLeituraMs, intervaloMinimoEntrePecasMs, sensores } = config

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

// Converte o valor bruto do sensor de nível em centímetros.
// Sensores ifm costumam usar os 2 bits finais para as saídas de comutação
// e o resto para a medição.
function converterNivel(bruto, sensor) {
  const medicao = bruto >> (sensor.descartarBits ?? 0)
  return Math.round(medicao * (sensor.fatorParaCm ?? 1) * 10) / 10
}

// Diz se um sensor do tipo liga/desliga está acionado, conforme a regra do config:
//   { "bit": 0 }                -> acionado quando aquele bit vale 1
//   { "valorAbaixoDe": 32000 }  -> acionado quando o valor é menor que o limite
//   { "valorAcimaDe": 100 }     -> acionado quando o valor é maior que o limite
// "inverter": true troca o resultado.
function estaAtivo(bruto, sensor) {
  const regra = sensor.ativoQuando
  let ativo
  if (regra.bit !== undefined) ativo = ((bruto >> regra.bit) & 1) === 1
  else if (regra.valorAbaixoDe !== undefined) ativo = bruto < regra.valorAbaixoDe
  else if (regra.valorAcimaDe !== undefined) ativo = bruto > regra.valorAcimaDe
  else throw new Error('Regra "ativoQuando" inválida no config.json')
  return regra.inverter ? !ativo : ativo
}

async function lerSensores() {
  const [nivel, presenca, metal] = await Promise.all([
    lerPorta(sensores.nivel.porta),
    lerPorta(sensores.presenca.porta),
    lerPorta(sensores.metal.porta),
  ])
  return {
    bruto: { nivel, presenca, metal },
    distancia: converterNivel(nivel, sensores.nivel),
    temPeca: estaAtivo(presenca, sensores.presenca),
    ehMetal: estaAtivo(metal, sensores.metal),
  }
}

// ---------------------------------------------------------------
// Envio para a API
// ---------------------------------------------------------------

// Leituras que não puderam ser enviadas (API fora do ar) ficam aqui
// e são reenviadas na próxima tentativa, para não perder peças.
const filaEnvio = []

async function enviarPendentes() {
  while (filaEnvio.length > 0) {
    const leitura = filaEnvio[0]
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(API_KEY && { 'X-API-Key': API_KEY }),
        },
        body: JSON.stringify(leitura),
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      filaEnvio.shift()
      console.log(`✔ enviado: ${leitura.isMetal ? 'METÁLICA' : 'não metálica'} | nível ${leitura.distance} cm`)
    } catch (e) {
      console.error(`✖ API indisponível (${e.message}). ${filaEnvio.length} leitura(s) aguardando.`)
      return
    }
  }
}

// ---------------------------------------------------------------
// Laço principal
// ---------------------------------------------------------------

let pecaNaFrente = false   // havia peça na leitura anterior?
let pecaEraMetal = false   // o sensor indutivo acionou enquanto a peça passava?
let ultimaPeca = 0         // horário da última peça registrada

function processar(s) {
  if (s.temPeca) {
    // Enquanto a peça está na frente do sensor, guarda se em algum momento
    // o indutivo detectou metal (a peça pode passar rápido pelo indutivo)
    pecaEraMetal = pecaEraMetal || s.ehMetal
    pecaNaFrente = true
    return
  }

  // A peça acabou de sair da frente do sensor: registra uma leitura
  if (pecaNaFrente) {
    const agora = Date.now()
    if (agora - ultimaPeca >= intervaloMinimoEntrePecasMs) {
      filaEnvio.push({ isMetal: pecaEraMetal, distance: s.distancia })
      ultimaPeca = agora
    }
    pecaNaFrente = false
    pecaEraMetal = false
  }
}

async function ciclo() {
  try {
    const s = await lerSensores()

    if (MODO_TESTE) {
      const hex = (n) => n.toString(16).toUpperCase().padStart(4, '0')
      console.log(
        `nível: ${hex(s.bruto.nivel)} (${s.distancia} cm) | ` +
        `presença: ${hex(s.bruto.presenca)} (${s.temPeca ? 'PEÇA' : '-'}) | ` +
        `metal: ${hex(s.bruto.metal)} (${s.ehMetal ? 'METAL' : '-'})`
      )
    } else {
      processar(s)
      await enviarPendentes()
    }
  } catch (e) {
    console.error(`✖ erro ao ler o IO-Link master em ${MASTER_URL}: ${e.message}`)
  }
  setTimeout(ciclo, MODO_TESTE ? 500 : intervaloLeituraMs)
}

console.log(`Ponte IO-Link iniciada${MODO_TESTE ? ' (modo teste)' : ''}`)
console.log(`  master: ${MASTER_URL}`)
if (!MODO_TESTE) console.log(`  API:    ${API_URL}`)
ciclo()
