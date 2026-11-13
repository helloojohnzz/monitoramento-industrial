import statistics
import time
import requests

# Endpoints IO-Link usados (tanque e sensor de peças)
SENSORES = {
    "sensor_geral": {
        "url": "http://10.110.12.41/iolinkmaster/port[1]/iolinkdevice/pdin/getdata",
        "id": 1,
        "tipo": "geral"
    },
    "sensor_metalico": {
        "url": "http://10.110.12.41/iolinkmaster/port[2]/iolinkdevice/pdin/getdata",
        "id": 2,
        "tipo": "metalica"
    }
}

# Históricos e contadores consolidados
historico_distancias_tanque = []
total_pecas_metalicas = 0
total_pecas_nao_metalicas = 0

# Faixas do sensor metálico (porta 2): o mesmo sensor identifica os dois tipos de peça
LIMITE_MIN_METALICA = 7000
LIMITE_MAX_METALICA = 10000

LIMITE_MIN_NAO_METALICA = 1500
LIMITE_MAX_NAO_METALICA = 2500

# Faixas do sensor de distância (Sensor 1) que indicam a queda de uma peça no tanque
LIMITE_MIN_QUEDA_METALICA = 220
LIMITE_MAX_QUEDA_METALICA = 250

LIMITE_MIN_QUEDA_NAO_METALICA = 90
LIMITE_MAX_QUEDA_NAO_METALICA = 110

# Quantidade de peças (metálicas + não metálicas) que caem no tanque até ele ficar cheio
CAPACIDADE_TANQUE = 2

TIMEOUT_REQUISICAO = 3  # segundos para o timeout da API
DURACAO_MONITORAMENTO = 20  # segundos

# Os dois sensores são lidos rápido para não perder peças em movimento.
# O nível do tanque entra no histórico (estatísticas) só de tempos em tempos.
INTERVALO_LEITURA_PECAS = 0.05   # segundos (50 ms)
INTERVALO_HISTORICO_TANQUE = 1.0  # segundos

# Sessão HTTP reaproveitada entre as leituras (deixa cada requisição mais rápida)
sessao = requests.Session()

# Contagem de peças que caíram no tanque (detectadas pelo sensor de distância)
pecas_metalicas_no_tanque = 0
pecas_nao_metalicas_no_tanque = 0
queda_atual = None  # tipo de queda em andamento: evita contar a mesma peça em leituras seguidas
tanque_cheio = False


def consultar_sensor_iolink(url):
  """Faz a requisição HTTP real para a API do IO-Link e retorna o JSON estruturado."""
  try:
    resposta = sessao.get(url, timeout=TIMEOUT_REQUISICAO)
    if resposta.status_code == 200:
      return resposta.json()
    else:
      print(f"⚠️ Erro HTTP {resposta.status_code} na URL: {url}")
      return None
  except requests.exceptions.RequestException as e:
    print(f"❌ Falha de conexão com o IO-Link ({url}): {e}")
    return None


def exibir_estatisticas_finais(tempo_total_decorrido):
  """Exibe estatísticas completas ao fim do monitoramento."""
  print("\n" + "=" * 60)
  print("🏁 MONITORAMENTO ENCERRADO - ESTATÍSTICAS FINAIS (API REAL)")
  print("=" * 60)

  # --- 1. ESTATÍSTICAS DO SENSOR 1 (TANQUE) ---
  print("\n🌊 [SENSOR 1 - ENCHIMENTO DO TANQUE]")
  if len(historico_distancias_tanque) > 0:
    leituras = historico_distancias_tanque
    media_tanque = round(statistics.mean(leituras))
    mediana_tanque = round(statistics.median(leituras))

    desvio_padrao_tanque = statistics.stdev(leituras) if len(leituras) > 1 else 0.0

    print(f" - Total de leituras capturadas: {len(leituras)}")
    print(f" - Média de nível (arredondada): {media_tanque} cm")
    print(f" - Mediana de nível (arredondada): {mediana_tanque} cm")
    print(f" - Desvio Padrão: {desvio_padrao_tanque:.2f} cm")
  else:
    print(" - Nenhuma leitura registrada para o sensor do tanque.")

  pecas_no_tanque = pecas_metalicas_no_tanque + pecas_nao_metalicas_no_tanque
  print(f" - Peças que caíram no tanque: {pecas_no_tanque}/{CAPACIDADE_TANQUE}")
  print(f"   • Metálicas: {pecas_metalicas_no_tanque}")
  print(f"   • Não Metálicas: {pecas_nao_metalicas_no_tanque}")
  if tanque_cheio:
    print(" - 🚨 Situação: TANQUE CHEIO")
  else:
    print(f" - Situação: OK (faltam {CAPACIDADE_TANQUE - pecas_no_tanque} peças)")

  # --- 2. ESTATÍSTICAS DE PEÇAS (METÁLICO + NÃO METÁLICO) ---
  total_geral_pecas = total_pecas_metalicas + total_pecas_nao_metalicas
  print(f"\n📦 [PEÇAS CONTADAS - SENSOR 2]")
  print(f" - Total geral acumulado: {total_geral_pecas}")
  print(f"   • Metálicas: {total_pecas_metalicas}")
  print(f"   • Não Metálicas: {total_pecas_nao_metalicas}")

  if total_geral_pecas > 0:
    prop_metalica = (total_pecas_metalicas / total_geral_pecas) * 100
    prop_nao_metalica = (total_pecas_nao_metalicas / total_geral_pecas) * 100
    print(f" - Proporção: Metálicas {prop_metalica:.2f}% | Não Metálicas {prop_nao_metalica:.2f}%")

  if tempo_total_decorrido > 0:
    taxa_por_minuto = (total_geral_pecas / tempo_total_decorrido) * 60
    print(f" - 🚀 Taxa de Produção: {taxa_por_minuto:.2f} peças/minuto")

  print("\n" + "=" * 60)


def ler_valor(config):
  """Lê um sensor e devolve (valor decimal, hex) ou (None, None) se falhar."""
  dados = consultar_sensor_iolink(config["url"])
  if not dados or dados.get("code") != 200:
    return None, None
  try:
    hex_value = dados["data"]["value"]
    return int(hex_value, 16), hex_value
  except (ValueError, KeyError) as e:
    print(f"⚠️ Erro ao processar os dados JSON do sensor {config['id']}: {e}")
    return None, None


def classificar_peca(valor):
  """Devolve 'metalica', 'nao_metalica' ou None conforme a faixa do sensor 2."""
  if LIMITE_MIN_METALICA <= valor <= LIMITE_MAX_METALICA:
    return "metalica"
  if LIMITE_MIN_NAO_METALICA <= valor <= LIMITE_MAX_NAO_METALICA:
    return "nao_metalica"
  return None


def classificar_queda(valor):
  """Devolve 'metalica', 'nao_metalica' ou None conforme a faixa do sensor de distância."""
  if LIMITE_MIN_QUEDA_METALICA <= valor <= LIMITE_MAX_QUEDA_METALICA:
    return "metalica"
  if LIMITE_MIN_QUEDA_NAO_METALICA <= valor <= LIMITE_MAX_QUEDA_NAO_METALICA:
    return "nao_metalica"
  return None


def processar_tanque(guardar_no_historico):
  """Lê o sensor de distância do tanque e conta as peças que caem nele."""
  global pecas_metalicas_no_tanque, pecas_nao_metalicas_no_tanque, queda_atual, tanque_cheio

  valor, hex_value = ler_valor(SENSORES["sensor_geral"])
  if valor is None:
    return

  if guardar_no_historico:
    historico_distancias_tanque.append(valor)
    print(f"[SENSOR 1 - TANQUE] Nível: {valor} cm (Hex: {hex_value})")

  # Conta só quando o valor ENTRA em uma das faixas de queda
  tipo = classificar_queda(valor)
  if tipo is not None and tipo != queda_atual:
    if tipo == "metalica":
      pecas_metalicas_no_tanque += 1
      rotulo = "metálica"
    else:
      pecas_nao_metalicas_no_tanque += 1
      rotulo = "não metálica"

    pecas_no_tanque = pecas_metalicas_no_tanque + pecas_nao_metalicas_no_tanque
    print(f"[SENSOR 1 - TANQUE] ⬇️ Peça {rotulo} caiu no tanque | Valor: {valor} ({pecas_no_tanque}/{CAPACIDADE_TANQUE})")

    if pecas_no_tanque >= CAPACIDADE_TANQUE and not tanque_cheio:
      tanque_cheio = True
      print(f"   -> 🚨 ALERTA: TANQUE CHEIO! Limite de {CAPACIDADE_TANQUE} peças atingido.")

  queda_atual = tipo


def monitorar_producao():
  global total_pecas_metalicas, total_pecas_nao_metalicas

  print(f"Iniciando monitoramento conectado aos endpoints IO-Link por {DURACAO_MONITORAMENTO} segundos...")
  print(f"Sensores lidos a cada {INTERVALO_LEITURA_PECAS * 1000:.0f} ms\n")

  tempo_inicio = time.time()
  ultimo_historico_tanque = 0.0
  peca_presente = False   # há uma peça na frente do sensor agora?
  maior_valor_peca = 0    # maior valor lido enquanto a peça passa

  while time.time() - tempo_inicio < DURACAO_MONITORAMENTO:
    agora = time.time()

    # --- Sensor 2 (peças): lido em todo ciclo ---
    valor, hex_value = ler_valor(SENSORES["sensor_metalico"])
    if valor is not None:
      # Qualquer valor a partir do início da faixa não metálica indica peça na frente
      tem_peca = valor >= LIMITE_MIN_NAO_METALICA

      if tem_peca:
        # Peça entrou ou continua na frente: guarda o maior valor visto.
        # (Uma peça metálica passa por 1500-2500 enquanto o valor sobe até 7000+,
        #  por isso a classificação só é feita quando a peça sai.)
        peca_presente = True
        maior_valor_peca = max(maior_valor_peca, valor)

      elif peca_presente:
        # Peça saiu da frente do sensor: classifica UMA vez pelo maior valor
        tipo = classificar_peca(maior_valor_peca)
        if tipo == "metalica":
          total_pecas_metalicas += 1
          rotulo = "METÁLICA"
        elif tipo == "nao_metalica":
          total_pecas_nao_metalicas += 1
          rotulo = "NÃO METÁLICA"
        else:
          rotulo = None
          print(f"[SENSOR 2 - PEÇAS] ⚠️ Peça ignorada: pico {maior_valor_peca} fora das faixas")

        if rotulo:
          total = total_pecas_metalicas + total_pecas_nao_metalicas
          print(f"[SENSOR 2 - PEÇAS] ✅ Peça {rotulo} | Pico: {maior_valor_peca} | Acumulado: {total}")

        peca_presente = False
        maior_valor_peca = 0

    # --- Sensor 1 (tanque): lido em todo ciclo para não perder quedas ---
    guardar = agora - ultimo_historico_tanque >= INTERVALO_HISTORICO_TANQUE
    if guardar:
      ultimo_historico_tanque = agora
    processar_tanque(guardar)

    time.sleep(INTERVALO_LEITURA_PECAS)

  tempo_total_real = time.time() - tempo_inicio
  exibir_estatisticas_finais(tempo_total_real)


if __name__ == "__main__":
  monitorar_producao()