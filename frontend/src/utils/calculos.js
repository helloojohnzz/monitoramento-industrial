import { ALTURA_RESERVATORIO_CM, NIVEL_ATENCAO, NIVEL_CRITICO } from '../config'

export const contarPecas = (leitura) => {
  const metal = leitura.metal ?? leitura.isMetal
  return {
    metalicas: leitura.metalPieces ?? Number(metal === true),
    naoMetalicas: leitura.nonMetalPieces ?? Number(metal === false),
  }
}

// Converte a distância medida pelo sensor em % de ocupação do reservatório
export const calcularNivel = (distancia) => {
  if (!Number.isFinite(distancia)) return null
  const nivel = ((ALTURA_RESERVATORIO_CM - distancia) / ALTURA_RESERVATORIO_CM) * 100
  return Math.min(100, Math.max(0, Math.round(nivel)))
}

// Retorna a situação do reservatório conforme o nível
export const situacaoNivel = (nivel) => {
  if (nivel == null) return { texto: 'Sem medição', cor: 'secondary' }
  if (nivel >= NIVEL_CRITICO) return { texto: 'Crítico', cor: 'danger' }
  if (nivel >= NIVEL_ATENCAO) return { texto: 'Atenção', cor: 'dark' }
  return { texto: 'Normal', cor: 'secondary' }
}

// Monta o resumo usado no dashboard a partir da lista de leituras
export const calcularResumo = (leituras) => {
  let metalicas = 0
  let naoMetalicas = 0
  for (const leitura of leituras) {
    const contagem = contarPecas(leitura)
    metalicas += contagem.metalicas
    naoMetalicas += contagem.naoMetalicas
  }
  const ultima = leituras[leituras.length - 1]
  const nivel = calcularNivel(ultima?.distance)

  return {
    total: metalicas + naoMetalicas,
    taxa: ultima?.productionRate,
    metalicas,
    naoMetalicas,
    nivel,
    atualizadoEm: ultima ? ultima.dateTime : null,
  }
}

// Formata a data/hora vinda da API para o padrão brasileiro
export const formatarData = (dataHora) =>
  dataHora ? new Date(dataHora).toLocaleString('pt-BR') : '-'
