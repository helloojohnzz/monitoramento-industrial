import { useEffect, useRef, useState } from 'react'

// Custom Hook: mede a largura de um elemento e atualiza quando a tela muda.
// Os gráficos usam isso para desenhar o SVG no tamanho real (texto sempre legível).
export const useLargura = () => {
  const ref = useRef(null)
  const [largura, setLargura] = useState(0)

  useEffect(() => {
    if (!ref.current) return
    const observador = new ResizeObserver(([entrada]) => setLargura(entrada.contentRect.width))
    observador.observe(ref.current)
    return () => observador.disconnect()
  }, [])

  return [ref, largura]
}
