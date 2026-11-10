// Endereço da API (definido no arquivo .env). Se não existir, usa o JSON Server.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Endpoint com as leituras da esteira (entidade Record do back-end)
export const URL_LEITURAS = `${API_URL}/records`

// Tempo entre cada atualização dos dados (em milissegundos)
export const INTERVALO_ATUALIZACAO = 3000

// Reservatório: o sensor de distância fica no topo.
// Quanto MENOR a distância, MAIS cheio está o reservatório.
export const ALTURA_RESERVATORIO_CM = 30

// Limites de alerta do nível do reservatório (em %)
export const NIVEL_ATENCAO = 70
export const NIVEL_CRITICO = 90
