import { useState, useEffect } from 'react'

// Custom Hook baseado no useFetch visto em aula.
// Diferença: recebe um "intervalo" para buscar os dados de novo
// de tempos em tempos (monitoramento em tempo quase real).
export const useFetch = (url, intervalo) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(url)
        const json = await res.json()
        setData(json)
        setErro(null)
      } catch (e) {
        setErro('Não foi possível conectar à API')
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
  }, [url, intervalo])

  return { data, setData, loading, erro }
}
