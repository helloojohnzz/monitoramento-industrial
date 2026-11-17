import csv
from datetime import datetime
import os
import statistics
import time
import requests

# Endpoints IO-Link usados (ajustado para o mock local ou IP real)
SENSORES = {
    "sensor_geral": {
        "url": "http://localhost:5000/sensores/distancia",
        "id": 1,
        "tipo": "geral",
    },
    "sensor_metalico": {
        "url": "http://localhost:5000/sensores/capacitivo",
        "id": 2,
        "tipo": "metalica",
    },
}

# Históricos e contadores consolidados
historico_distancias_tanque = []
total_pecas_metalicas = 0
total_pecas_nao_metalicas = 0

# Faixas do sensor metálico (porta 2)
LIMITE_MIN_METALICA = 7000
LIMITE_MAX_METALICA = 10000

LIMITE_MIN_NAO_METALICA = 1500
LIMITE_MAX_NAO_METALICA = 2500

# Faixas do sensor de distância (Sensor 1)
LIMITE_MIN_QUEDA_METALICA = 220
LIMITE_MAX_QUEDA_METALICA = 250

LIMITE_MIN_QUEDA_NAO_METALICA = 90
LIMITE_MAX_QUEDA_NAO_METALICA = 110

CAPACIDADE_TANQUE = 2
TIMEOUT_REQUISICAO = 3


def ler_env_do_projeto(nome):
  """Lê uma variável do arquivo .env da raiz do projeto."""
  caminho = os.path.join(
      os.path.dirname(os.path.abspath(__file__)), "..", ".env"
  )
  try:
    with open(caminho, encoding="utf-8") as arquivo:
      for linha in arquivo:
        chave, _, valor = linha.strip().partition("=")
        if chave == nome:
          return valor.strip()
  except OSError:
    pass
  return ""


API_URL = os.environ.get("API_URL", "http://localhost:8080/records")
API_KEY = os.environ.get("API_KEY") or ler_env_do_projeto("API_KEY")
ENVIAR_PARA_API = True
FATOR_DISTANCIA_CM = 0.1
DURACAO_MONITORAMENTO = 20

INTERVALO_LEITURA_PECAS = 0.05  # 50 ms

sessao = requests.Session()

pecas_metalicas_no_tanque = 0
pecas_nao_metalicas_no_tanque = 0
queda_atual = None

# Configuração do arquivo CSV unificado
NOME_ARQUIVO_CSV = (
    f"dados_sensores_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
)
CABECALHO_CSV = [
    "timestamp",
    "sensor_1_distancia_dec",
    "sensor_1_distancia_hex",
    "sensor_1_cm",
    "sensor_2_capacitivo_dec",
    "sensor_2_capacitivo_hex",
    "evento",
    "classificacao",
    "total_pecas_geral",
    "pecas_no_tanque",
]


def registrar_csv(
    writer,
    arquivo_csv,
    s1_dec,
    s1_hex,
    s1_cm,
    s2_dec,
    s2_hex,
    evento,
    classificacao="",
    tot_geral="",
    tot_tanque="",
):
  """Escreve uma linha consolidando ambos os sensores no CSV."""
  agora_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
  writer.writerow([
      agora_str,
      s1_dec,
      s1_hex,
      s1_cm,
      s2_dec,
      s2_hex,
      evento,
      classificacao,
      tot_geral,
      tot_tanque,
  ])
  arquivo_csv.flush()


def consultar_sensor_iolink(url):
  """Faz a requisição HTTP real para a API do IO-Link."""
  try:
    resposta = sessao.get(url, timeout=TIMEOUT_REQUISICAO)
    if resposta.status_code == 200:
      return resposta.json()
    else:
      return None
  except requests.exceptions.RequestException:
    return None


def ler_valor(config):
  """Lê um sensor e devolve (valor decimal, hex) ou (None, None) se falhar."""
  dados = consultar_sensor_iolink(config["url"])
  if not dados or dados.get("code") != 200:
    return None, None
  try:
    hex_value = dados["data"]["value"]
    return int(hex_value, 16), hex_value
  except (ValueError, KeyError):
    return None, None


def classificar_peca(valor):
  if LIMITE_MIN_METALICA <= valor <= LIMITE_MAX_METALICA:
    return "metalica"
  if LIMITE_MIN_NAO_METALICA <= valor <= LIMITE_MAX_NAO_METALICA:
    return "nao_metalica"
  return None


def classificar_queda(valor):
  if LIMITE_MIN_QUEDA_METALICA <= valor <= LIMITE_MAX_QUEDA_METALICA:
    return "metalica"
  if LIMITE_MIN_QUEDA_NAO_METALICA <= valor <= LIMITE_MAX_QUEDA_NAO_METALICA:
    return "nao_metalica"
  return None


def enviar_peca_api(tipo_peca, distancia_cm, tempo_decorrido, total_tanque):
  """Grava a peça na API (POST /records)."""
  if not ENVIAR_PARA_API:
    return
  total_pecas = total_pecas_metalicas + total_pecas_nao_metalicas
  taxa_por_minuto = total_pecas * 60 / tempo_decorrido if tempo_decorrido > 0 else 0
  peca = {
      "metalPieces": int(tipo_peca == "metalica"),
      "nonMetalPieces": int(tipo_peca == "nao_metalica"),
      "situation": "cheio" if total_tanque >= CAPACIDADE_TANQUE else "ok",
      "productionRate": round(taxa_por_minuto, 2),
      "distance": distancia_cm,
  }
  cabecalhos = {"X-API-Key": API_KEY} if API_KEY else {}
  try:
    resposta = sessao.post(
        API_URL, json=peca, headers=cabecalhos, timeout=TIMEOUT_REQUISICAO
    )
    resposta.raise_for_status()
  except requests.exceptions.RequestException as erro:
    print(f"Falha ao gravar peça na API: {erro}", flush=True)


def exibir_estatisticas_finais(tempo_total_decorrido):
  print("\n" + "=" * 60)
  print(" MONITORAMENTO ENCERRADO - ESTATÍSTICAS FINAIS")
  print("=" * 60)

  print("\n [SENSOR 1 - TANQUE]")
  if len(historico_distancias_tanque) > 0:
    media = round(statistics.mean(historico_distancias_tanque))
    print(f" - Média de nível: {media} cm")
  pecas_tanque = pecas_metalicas_no_tanque + pecas_nao_metalicas_no_tanque
  print(f" - Peças no tanque: {pecas_tanque}/{CAPACIDADE_TANQUE}")

  total_geral = total_pecas_metalicas + total_pecas_nao_metalicas
  print(f"\n [PEÇAS CONTADAS - SENSOR 2]")
  print(f" - Total geral: {total_geral}")
  print(f"   • Metálicas: {total_pecas_metalicas}")
  print(f"   • Não Metálicas: {total_pecas_nao_metalicas}")

  print(f"\n Arquivo CSV gerado: {os.path.abspath(NOME_ARQUIVO_CSV)}")
  print("=" * 60)


def monitorar_producao():
  global total_pecas_metalicas, total_pecas_nao_metalicas
  global pecas_metalicas_no_tanque, pecas_nao_metalicas_no_tanque
  global queda_atual

  print(
      "Iniciando monitoramento unificado de ambos os sensores por"
      f" {DURACAO_MONITORAMENTO} segundos..."
  )
  print(f"Salvando dados em: {NOME_ARQUIVO_CSV}\n")

  with open(
      NOME_ARQUIVO_CSV, mode="w", newline="", encoding="utf-8-sig"
  ) as arquivo_csv:
    writer_csv = csv.writer(arquivo_csv, delimiter=";")
    writer_csv.writerow(CABECALHO_CSV)

    tempo_inicio = time.time()
    peca_presente = False
    maior_valor_peca = 0
    maior_hex_peca = ""

    while time.time() - tempo_inicio < DURACAO_MONITORAMENTO:
      # 1. Leitura dos DOIS sensores no mesmo ciclo
      val_s1, hex_s1 = ler_valor(SENSORES["sensor_geral"])
      val_s2, hex_s2 = ler_valor(SENSORES["sensor_metalico"])

      if val_s1 is None or val_s2 is None:
        time.sleep(INTERVALO_LEITURA_PECAS)
        continue

      dist_cm_s1 = round(val_s1 * FATOR_DISTANCIA_CM, 1)
      historico_distancias_tanque.append(val_s1)

      evento_atual = "leitura_normal"
      classificacao_atual = ""

      # 2. Processamento do Sensor 1 (Tanque / Queda)
      tipo_queda = classificar_queda(val_s1)
      if tipo_queda is not None and tipo_queda != queda_atual:
        if tipo_queda == "metalica":
          pecas_metalicas_no_tanque += 1
        else:
          pecas_nao_metalicas_no_tanque += 1
        evento_atual = "queda_tanque"
        classificacao_atual = tipo_queda
        print(f"[SENSOR 1] Queda de peça {tipo_queda} detectada (Valor: {val_s1})")
      queda_atual = tipo_queda

      # 3. Processamento do Sensor 2 (Peças / Capacitivo)
      tem_peca = val_s2 >= LIMITE_MIN_NAO_METALICA
      if tem_peca:
        peca_presente = True
        if val_s2 > maior_valor_peca:
          maior_valor_peca = val_s2
          maior_hex_peca = hex_s2
      elif peca_presente:
        tipo_peca = classificar_peca(maior_valor_peca)
        if tipo_peca == "metalica":
          total_pecas_metalicas += 1
          evento_atual = "peca_detectada"
          classificacao_atual = "metalica"
        elif tipo_peca == "nao_metalica":
          total_pecas_nao_metalicas += 1
          evento_atual = "peca_detectada"
          classificacao_atual = "nao_metalica"
        else:
          evento_atual = "peca_ignorada"
          classificacao_atual = "fora_faixa"

        print(
            f"[SENSOR 2] Peça classificada: {classificacao_atual} (Pico:"
            f" {maior_valor_peca})"
        )
        if tipo_peca:
          enviar_peca_api(
              tipo_peca, dist_cm_s1, time.time() - tempo_inicio,
              pecas_metalicas_no_tanque + pecas_nao_metalicas_no_tanque,
          )

        peca_presente = False
        maior_valor_peca = 0
        maior_hex_peca = ""

      # 4. Grava a linha consolidando ambos os sensores no CSV
      total_geral = total_pecas_metalicas + total_pecas_nao_metalicas
      total_tanque = pecas_metalicas_no_tanque + pecas_nao_metalicas_no_tanque
      registrar_csv(
          writer_csv,
          arquivo_csv,
          s1_dec=val_s1,
          s1_hex=hex_s1,
          s1_cm=dist_cm_s1,
          s2_dec=val_s2,
          s2_hex=hex_s2,
          evento=evento_atual,
          classificacao=classificacao_atual,
          tot_geral=total_geral,
          tot_tanque=total_tanque,
      )

      time.sleep(INTERVALO_LEITURA_PECAS)

    tempo_total_real = time.time() - tempo_inicio
    exibir_estatisticas_finais(tempo_total_real)


if __name__ == "__main__":
  monitorar_producao()