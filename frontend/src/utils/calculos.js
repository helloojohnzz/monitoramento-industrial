import { ALTURA_RESERVATORIO_CM, NIVEL_ATENCAO, NIVEL_CRITICO } from '../config'

// O back-end (Lombok) pode enviar o campo como "metal" ou "isMetal"
export const ehMetal = (leitura) => leitura.metal ?? leitura.isMetal

// Converte a distância medida pelo sensor em % de ocupação do reservatório
export const calcularNivel = (distancia) => {
  const nivel = ((ALTURA_RESERVATORIO_CM - distancia) / ALTURA_RESERVATORIO_CM) * 100
  return Math.min(100, Math.max(0, Math.round(nivel)))
}

// Retorna a situação do reservatório conforme o nível
export const situacaoNivel = (nivel) => {
  if (nivel >= NIVEL_CRITICO) return { texto: 'Crítico', cor: 'danger' }
  if (nivel >= NIVEL_ATENCAO) return { texto: 'Atenção', cor: 'warning' }
  return { texto: 'Normal', cor: 'success' }
}

// Monta o resumo usado no dashboard a partir da lista de leituras
export const calcularResumo = (leituras) => {
  const metalicas = leituras.filter((l) => ehMetal(l)).length
  const naoMetalicas = leituras.length - metalicas
  const ultima = leituras[leituras.length - 1]
  const nivel = ultima ? calcularNivel(ultima.distance) : 0

  return {
    total: leituras.length,
    metalicas,
    naoMetalicas,
    nivel,
    atualizadoEm: ultima ? ultima.dateTime : null,
  }
}

// Formata a data/hora vinda da API para o padrão brasileiro
export const formatarData = (dataHora) =>
  dataHora ? new Date(dataHora).toLocaleString('pt-BR') : '-'
