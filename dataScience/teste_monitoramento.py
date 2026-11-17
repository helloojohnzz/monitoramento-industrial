import csv
from datetime import datetime
import os
import statistics
import time
import requests

# Endpoints apontando para o seu Servidor Mock local
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

# Configurações de Produção e Limites
API_URL = os.environ.get("API_URL", "http://localhost:8080/records")
API_KEY = os.environ.get("API_KEY", "")  # Insira a chave se necessário
CAPACIDADE_TANQUE = 2
DURACAO_MONITORAMENTO = 20  # segundos
INTERVALO_LEITURA = 0.1  # 100 ms entre os ciclos
TIMEOUT_REQUISICAO = 2  # segundos

# Faixas do sensor capacitivo (Sensor 2)
LIMITE_MIN_METALICA = 7000
LIMITE_MAX_METALICA = 10000
LIMITE_MIN_NAO_METALICA = 1500
LIMITE_MAX_NAO_METALICA = 2500

# Faixas do sensor de distância do tanque (Sensor 1)
LIMITE_MIN_QUEDA_METALICA = 220
LIMITE_MAX_QUEDA_METALICA = 250
LIMITE_MIN_QUEDA_NAO_METALICA = 90
LIMITE_MAX_QUEDA_NAO_METALICA = 110

FATOR_DISTANCIA_CM = 0.1

# Contadores e Estados globais
total_pecas_metalicas = 0
total_pecas_nao_metalicas = 0
pecas_metalicas_no_tanque = 0
pecas_nao_metalicas_no_tanque = 0
tanque_cheio = False
historico_distancias = []

# Configuração do CSV
NOME_ARQUIVO_CSV = (
    f"teste_producao_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
)
CABECALHO_CSV = [
    "timestamp",
    "sensor_1_dec",
    "sensor_1_cm",
    "sensor_2_dec",
    "evento",
    "classificacao",
    "total_geral",
    "pecas_no_tanque",
]


def ler_sensor(url, sessao):
  """Faz a requisição HTTP segura para o sensor."""
  try:
    resp = sessao.get(url, timeout=TIMEOUT_REQUISICAO)
    if resp.status_code == 200:
      dados = resp.json()
      hex_val = dados["data"]["value"]
      return int(hex_val, 16)
  except requests.exceptions.RequestException:
    pass
  return None


def classificar_capacitivo(valor):
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


def enviar_resumo_api(
    total_metalicas, total_nao_metalicas, tempo_decorrido, tanque_cheio, sessao
):
  """Envia o resumo final em JSON no formato exato solicitado para a API."""
  situation = "cheio" if tanque_cheio else "ok"

  total_geral = total_metalicas + total_nao_metalicas
  taxa_por_minuto = (
      (total_geral / tempo_decorrido) * 60 if tempo_decorrido > 0 else 0.0
  )

  # Payload estruturado exatamente conforme solicitado
  payload = {
      "metalPieces": int(total_metalicas),
      "nonMetalPieces": int(total_nao_metalicas),
      "situation": situation,
      "productionRate": float(f"{taxa_por_minuto:.2f}"),
  }

  cabecalhos = {"X-API-Key": API_KEY} if API_KEY else {}
  print(f"\n🌐 Enviando resumo final para {API_URL}...")
  print(f"Payload: {payload}")

  try:
    resposta = sessao.post(
        API_URL, json=payload, headers=cabecalhos, timeout=TIMEOUT_REQUISICAO
    )
    if resposta.ok:
      print("   -> ✅ Resumo enviado com sucesso para a API!")
    else:
      print(
          f"   -> ⚠️ API respondeu com erro HTTP {resposta.status_code}:"
          f" {resposta.text[:200]}"
      )
  except requests.exceptions.RequestException as e:
    print(f"   -> ⚠️ Falha de conexão ao enviar para a API ({API_URL}): {e}")


def executar_monitoramento():
  global total_pecas_metalicas, total_pecas_nao_metalicas
  global pecas_metalicas_no_tanque, pecas_nao_metalicas_no_tanque, tanque_cheio

  print("🚀 Iniciando novo script de teste conectado ao Mock...")
  print(f"📁 Salvando logs em: {NOME_ARQUIVO_CSV}\n")

  sessao = requests.Session()

  with open(NOME_ARQUIVO_CSV, mode="w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f, delimiter=";")
    writer.writerow(CABECALHO_CSV)

    inicio = time.time()
    peca_na_esteira = False
    pico_capacitivo = 0
    ultima_queda = None

    while time.time() - inicio < DURACAO_MONITORAMENTO:
      # 1. Leitura simultânea dos dois sensores
      val_tanque = ler_sensor(SENSORES["sensor_geral"]["url"], sessao)
      val_capacitivo = ler_sensor(SENSORES["sensor_metalico"]["url"], sessao)

      if val_tanque is None or val_capacitivo is None:
        time.sleep(INTERVALO_LEITURA)
        continue

      cm_tanque = round(val_tanque * FATOR_DISTANCIA_CM, 1)
      historico_distancias.append(val_tanque)

      evento = "leitura_normal"
      classificacao = ""

      # 2. Lógica do Sensor 1 (Tanque / Queda) - Estritamente limitada à capacidade
      tipo_queda = classificar_queda(val_tanque)
      total_tanque_atual = (
          pecas_metalicas_no_tanque + pecas_nao_metalicas_no_tanque
      )

      if tipo_queda and tipo_queda != ultima_queda and not tanque_cheio:
        if total_tanque_atual < CAPACIDADE_TANQUE:
          if tipo_queda == "metalica":
            pecas_metalicas_no_tanque += 1
          else:
            pecas_nao_metalicas_no_tanque += 1

          evento = "queda_tanque"
          classificacao = tipo_queda
          print(f"📦 [TANQUE] Peça {tipo_queda} caiu! (Nível: {val_tanque})")

          if (
              pecas_metalicas_no_tanque + pecas_nao_metalicas_no_tanque
          ) >= CAPACIDADE_TANQUE:
            tanque_cheio = True
            print(
                "🛑 [ALERTA] Tanque cheio atingido! Nenhuma nova queda será"
                " aceita."
            )

      ultima_queda = tipo_queda

      # 3. Lógica do Sensor 2 (Capacitivo / Contagem de Peças)
      tem_objeto = val_capacitivo >= LIMITE_MIN_NAO_METALICA

      if tem_objeto:
        peca_na_esteira = True
        if val_capacitivo > pico_capacitivo:
          pico_capacitivo = val_capacitivo
      elif peca_na_esteira:
        tipo_peca = classificar_capacitivo(pico_capacitivo)
        if tipo_peca == "metalica":
          total_pecas_metalicas += 1
          evento = "peca_detectada"
          classificacao = "metalica"
        elif tipo_peca == "nao_metalica":
          total_pecas_nao_metalicas += 1
          evento = "peca_detectada"
          classificacao = "nao_metalica"
        else:
          evento = "peca_ignorada"
          classificacao = "fora_de_faixa"

        if tipo_peca:
          print(
              f"⚙️ [ESTEIRA] Peça classificada: {tipo_peca.upper()} (Pico:"
              f" {pico_capacitivo})"
          )

        peca_na_esteira = False
        pico_capacitivo = 0

      # 4. Registros consolidados no CSV
      tot_geral = total_pecas_metalicas + total_pecas_nao_metalicas
      tot_tanque = pecas_metalicas_no_tanque + pecas_nao_metalicas_no_tanque

      timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
      writer.writerow([
          timestamp_str,
          val_tanque,
          cm_tanque,
          val_capacitivo,
          evento,
          classificacao,
          tot_geral,
          tot_tanque,
      ])
      f.flush()

      time.sleep(INTERVALO_LEITURA)

    tempo_total_real = time.time() - inicio

    # Estatísticas Finais
    print("\n" + "=" * 50)
    print("🏁 TESTE ENCERRADO - ESTATÍSTICAS FINAIS")
    print("=" * 50)
    print(
        "• Total de Peças Contadas na Esteira:"
        f" {total_pecas_metalicas + total_pecas_nao_metalicas}"
    )
    print(f"  - Metálicas: {total_pecas_metalicas}")
    print(f"  - Não Metálicas: {total_pecas_nao_metalicas}")
    print(
        "• Peças no Tanque:"
        f" {pecas_metalicas_no_tanque + pecas_nao_metalicas_no_tanque}/{CAPACIDADE_TANQUE}"
    )
    print(
        "• Status do Tanque:"
        f" {'CHEIO 🛑' if tanque_cheio else 'OK (Não Cheio)'}"
    )
    print(f"• Arquivo CSV salvo em: {os.path.abspath(NOME_ARQUIVO_CSV)}")
    print("=" * 50)

    # Envia o JSON final formatado para a API
    enviar_resumo_api(
        total_pecas_metalicas,
        total_pecas_nao_metalicas,
        tempo_total_real,
        tanque_cheio,
        sessao,
    )


if __name__ == "__main__":
  executar_monitoramento()