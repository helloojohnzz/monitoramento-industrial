import { useState, useEffect } from 'react'

// Custom Hook baseado no useFetch visto em aula.
// Diferença: recebe um "intervalo" para buscar os dados de novo
// de tempos em tempos (monitoramento em tempo quase real).
// Se a API falhar e houver "dadosReserva", usa esses dados (modo demonstração),
// mas só enquanto nenhum dado real tiver chegado.
export const useFetch = (url, intervalo, dadosReserva) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    // Marca se a API já respondeu com dados reais pelo menos uma vez
    let recebeuDadosReais = false

    const fetchData = async () => {
      try {
        const res = await fetch(url)
        // Erros HTTP (404, 500...) não disparam o catch sozinhos
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        // O front espera uma lista de leituras
        if (!Array.isArray(json)) throw new Error('Resposta inesperada da API')
        recebeuDadosReais = true
        setData(json)
        setErro(null)
      } catch (e) {
        if (recebeuDadosReais) {
          // Mantém as últimas leituras reais na tela e só avisa
          setErro('Conexão com a API perdida, exibindo as últimas leituras recebidas')
        } else if (dadosReserva) {
          setData(dadosReserva)
          setErro('demo')
        } else {
          setErro('Não foi possível conectar à API')
        }
      }
      setLoading(false)
    }

    setLoading(true)
    fetchData()

    // Se tiver intervalo, repete a busca. A função de limpeza
    // cancela o temporizador quando o componente sai da tela.
    if (intervalo) {
      const timer = setInterval(fetchData, intervalo)
      return () => clearInterval(timer)
    }
  }, [url, intervalo, dadosReserva])

  return { data, setData, loading, erro }
}
