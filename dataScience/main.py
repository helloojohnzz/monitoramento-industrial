import statistics
import time

# Configuração dos sensores simulados
SENSORES_SIMULADOS = {
    "sensor_geral": {"id": 1, "tipo": "geral"},
    "sensor_metalico": {"id": 2, "tipo": "metalica"},
    "sensor_nao_metalico": {"id": 3, "tipo": "nao_metalica"},
}

# Sequência determinística de distâncias (em centímetros) que vai subindo e descendo
# Substitui o uso de números randômicos
SEQUENCIA_DADOS_CM = [15, 22, 30, 42, 50, 38, 25, 12, 18, 28, 35, 48, 20, 14]
indice_global = 0

# Históricos e contadores
historico_contagens_combinado = []
historico_distancias_geral = []
total_pecas_metalicas = 0
total_pecas_nao_metalicas = 0

# Limites e configurações
LIMITE_MINIMO_PECA = 10
LIMITE_MAXIMO_PECA = 40
ALTURA_MAXIMA_GERAL = 50


def obter_proximo_valor_deterministico():
  """Retorna o próximo valor da sequência de forma controlada (não randômica)."""
  global indice_global
  valor_cm = SEQUENCIA_DADOS_CM[indice_global]
  # Avança para o próximo valor e reinicia o ciclo se chegar ao fim da lista
  indice_global = (indice_global + 1) % len(SEQUENCIA_DADOS_CM)
  return valor_cm


def exibir_estatisticas_finais(tempo_total_decorrido):
  """Exibe estatísticas completas, incluindo média, mediana arredondada, desvio padrão e proporção."""
  print("\n" + "=" * 60)
  print("🏁 MONITORAMENTO ENCERRADO - ESTATÍSTICAS FINAIS (DETERMINÍSTICO)")
  print("=" * 60)

  # --- 1. ESTATÍSTICAS DO SENSOR GERAL (ALTURA) ---
  print("\n📏 [SENSOR GERAL - ALTURA / DISTÂNCIA DE QUEDA]")
  if len(historico_distancias_geral) > 0:
    alturas = historico_distancias_geral

    media_alt = round(statistics.mean(alturas))
    mediana_alt = round(statistics.median(alturas))

    if len(alturas) > 1:
      desvio_padrao_alt = statistics.stdev(alturas)
    else:
      desvio_padrao_alt = 0.0

    print(f" - Total de leituras de altura: {len(alturas)}")
    print(f" - Média (arredondada): {media_alt} cm")
    print(f" - Mediana (arredondada): {mediana_alt} cm")
    print(f" - Desvio Padrão: {desvio_padrao_alt:.2f} cm")
  else:
    print(" - Nenhuma leitura registrada para o sensor geral.")

  # --- 2. ESTATÍSTICAS DE PEÇAS CONTADAS (METÁLICO + NÃO METÁLICO) ---
  total_geral_pecas = total_pecas_metalicas + total_pecas_nao_metalicas
  print(f"\n📦 [PEÇAS CONTADAS - METÁLICO + NÃO METÁLICO]")
  print(f" - Total geral acumulado: {total_geral_pecas}")
  print(f"   • Metálicas: {total_pecas_metalicas}")
  print(f"   • Não Metálicas: {total_pecas_nao_metalicas}")

  if total_geral_pecas > 0:
    prop_metalica = (total_pecas_metalicas / total_geral_pecas) * 100
    prop_nao_metalica = (total_pecas_nao_metalicas / total_geral_pecas) * 100
    print(
        f" - Proporção: Metálicas {prop_metalica:.2f}% | Não Metálicas"
        f" {prop_nao_metalica:.2f}%"
    )

  if tempo_total_decorrido > 0:
    taxa_por_minuto = (total_geral_pecas / tempo_total_decorrido) * 60
    print(f" - 🚀 Taxa de Produção: {taxa_por_minuto:.2f} peças/minuto")

  print("\n" + "=" * 60)


def monitorar_producao():
  global total_pecas_metalicas, total_pecas_nao_metalicas

  print(
      "Iniciando monitoramento determinístico (dados fixos em sequência) por 10"
      " segundos...\n"
  )

  tempo_inicio = time.time()
  duracao_limite = 10  # segundos

  while True:
    tempo_atual_execucao = time.time()
    tempo_decorrido = tempo_atual_execucao - tempo_inicio
    if tempo_decorrido >= duracao_limite:
      break

    pecas_neste_ciclo = 0

    for nome_sensor, config in SENSORES_SIMULADOS.items():
      try:
        id_sensor = config["id"]
        tipo_peca = config["tipo"]

        # Obtém a distância de forma determinística da lista pré-definida
        distancia_cm = obter_proximo_valor_deterministico()
        hex_gerado = format(distancia_cm, "x")

        # Estrutura JSON solicitada: id, data: {"value": ...}, code
        dados = {"id": id_sensor, "data": {"value": hex_gerado}, "code": 200}

        # Validação do código HTTP simulado
        if dados.get("code") == 200:
          hex_value = dados["data"]["value"]
          val_decimal = int(hex_value, 16)

          # Processamento do Sensor Geral
          if tipo_peca == "geral":
            historico_distancias_geral.append(val_decimal)
            print(
                f"[SENSOR GERAL] ID: {dados['id']} | Altura: {val_decimal} cm"
                f" (Hex: {hex_value})"
            )

          # Processamento dos Sensores de Peças
          else:
            if LIMITE_MINIMO_PECA <= val_decimal <= LIMITE_MAXIMO_PECA:
              pecas_neste_ciclo += 1
              if tipo_peca == "metalica":
                total_pecas_metalicas += 1
              elif tipo_peca == "nao_metalica":
                total_pecas_nao_metalicas += 1

              print(
                  f"[{tipo_peca.upper()}] ID: {dados['id']} -> Peça detectada"
                  f" a {val_decimal} cm (Hex: {hex_value})"
              )

      except ValueError:
        print(f"[{nome_sensor}] Erro ao processar o valor.")

    if pecas_neste_ciclo > 0:
      total_parcial = total_pecas_metalicas + total_pecas_nao_metalicas
      print(
          f"   ✅ Peças válidas neste ciclo: {pecas_neste_ciclo} | Acumulado"
          f" geral: {total_parcial}\n"
      )

    time.sleep(2)

  tempo_total_real = time.time() - tempo_inicio
  exibir_estatisticas_finais(tempo_total_real)


if __name__ == "__main__":
  monitorar_producao()