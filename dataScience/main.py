import csv
from datetime import datetime
import os
import statistics
import time

import requests


SENSORES = {
    "geral": "http://10.110.12.37:5000/sensores/distancia",
    "indutivo": "http://10.110.12.37:5000/sensores/indutivo",
    "capacitivo": "http://10.110.12.37:5000/sensores/capacitivo",
}

# Limites confirmados anteriormente.
LIMITE_MIN_METALICA = 7000
LIMITE_MAX_METALICA = 10000

LIMITE_MIN_NAO_METALICA = 1800
LIMITE_MAX_NAO_METALICA = 2000

# Sensor geral: faixas anteriores de queda no tanque.
LIMITE_MIN_QUEDA_METALICA = 220
LIMITE_MAX_QUEDA_METALICA = 250
LIMITE_MIN_QUEDA_NAO_METALICA = 90
LIMITE_MAX_QUEDA_NAO_METALICA = 110

CAPACIDADE_TANQUE = 5
FATOR_DISTANCIA_CM = 0.1

DURACAO_MONITORAMENTO = 20
TIMEOUT_REQUISICAO = 3

INTERVALO_LEITURA = 0.05
INTERVALO_EXIBICAO = 1.0
INTERVALO_ENVIO_DISTANCIA = 1.0

# Repete a contagem metálica enquanto o indutivo estiver na faixa.
INTERVALO_CONTAGEM_METALICA = 1.0

API_URL = os.environ.get(
    "API_URL",
    "http://localhost:8080/records",
)
ENVIAR_PARA_API = True

sessao = requests.Session()

CABECALHO_CSV = [
    "timestamp",
    "sensor_1_distancia_dec",
    "sensor_1_distancia_hex",
    "sensor_1_cm",
    "sensor_2_indutivo_dec",
    "sensor_2_indutivo_hex",
    "sensor_2_presenca_metalica",
    "sensor_3_capacitivo_dec",
    "sensor_3_capacitivo_hex",
    "sensor_3_presenca_nao_metalica",
    "evento",
    "classificacao",
    "novas_metalicas",
    "novas_nao_metalicas",
    "total_pecas_geral",
    "total_pecas_metalicas",
    "total_pecas_nao_metalicas",
    "pecas_no_tanque",
]


def ler_sensor(url):
    """Retorna (decimal, hexadecimal) ou (None, None)."""
    try:
        resposta = sessao.get(url, timeout=TIMEOUT_REQUISICAO)
        resposta.raise_for_status()
        dados = resposta.json()

        if not isinstance(dados, dict) or dados.get("code") != 200:
            return None, None

        hexadecimal = dados["data"]["value"]
        return int(hexadecimal, 16), hexadecimal

    except (
        requests.exceptions.RequestException,
        ValueError,
        KeyError,
        TypeError,
    ):
        return None, None


def dentro_da_faixa(valor, minimo, maximo):
    if valor is None:
        return None
    return minimo <= valor <= maximo


def classificar_queda(valor):
    if valor is None:
        return None

    if LIMITE_MIN_QUEDA_METALICA <= valor <= LIMITE_MAX_QUEDA_METALICA:
        return "metalica"

    if (
        LIMITE_MIN_QUEDA_NAO_METALICA
        <= valor
        <= LIMITE_MAX_QUEDA_NAO_METALICA
    ):
        return "nao_metalica"

    return None


def enviar_api(
    novas_metalicas,
    novas_nao_metalicas,
    distancia_cm,
    tempo_decorrido,
    total_metalicas,
    total_nao_metalicas,
    total_tanque,
):
    """Envia somente os incrementos de peças deste ciclo."""
    if not ENVIAR_PARA_API:
        return

    total = total_metalicas + total_nao_metalicas
    taxa = (
        total * 60 / tempo_decorrido
        if tempo_decorrido > 0
        else 0
    )

    payload = {
        "metalPieces": novas_metalicas,
        "nonMetalPieces": novas_nao_metalicas,
        "situation": (
            "cheio"
            if total_tanque >= CAPACIDADE_TANQUE
            else "ok"
        ),
        "productionRate": round(taxa, 2),
        "distance": distancia_cm,
    }

    try:
        resposta = sessao.post(
            API_URL,
            json=payload,
            timeout=TIMEOUT_REQUISICAO,
        )

        if not resposta.ok:
            print(
                f"[API] Erro HTTP {resposta.status_code}: "
                f"{resposta.text[:300]}",
                flush=True,
            )
            return

        if novas_metalicas or novas_nao_metalicas:
            print(
                "[API] Enviado: "
                f"{novas_metalicas} metálica(s), "
                f"{novas_nao_metalicas} não metálica(s)",
                flush=True,
            )

    except requests.exceptions.RequestException as erro:
        print(f"[API] Falha no envio: {erro}", flush=True)


def exibir_sensores(
    leituras,
    distancia_cm,
    presenca_metalica,
    presenca_nao_metalica,
    total_metalicas,
    total_nao_metalicas,
    total_tanque,
):
    print(
        f"\n[{datetime.now().strftime('%H:%M:%S')}] "
        "LEITURA DOS SENSORES",
        flush=True,
    )

    geral_dec, geral_hex = leituras["geral"]
    indutivo_dec, indutivo_hex = leituras["indutivo"]
    capacitivo_dec, capacitivo_hex = leituras["capacitivo"]

    if geral_dec is None:
        print("  Geral: indisponível")
    else:
        print(
            f"  Geral: decimal={geral_dec} | "
            f"hex={geral_hex} | distância={distancia_cm:.1f} cm"
        )

    if indutivo_dec is None:
        print("  Indutivo: indisponível")
    else:
        estado = (
            "METÁLICA PRESENTE"
            if presenca_metalica
            else "fora da faixa"
        )
        print(
            f"  Indutivo: decimal={indutivo_dec} | "
            f"hex={indutivo_hex} | {estado}"
        )

    if capacitivo_dec is None:
        print("  Capacitivo: indisponível")
    else:
        estado = (
            "NÃO METÁLICA PRESENTE"
            if presenca_nao_metalica
            else "fora da faixa"
        )
        print(
            f"  Capacitivo: decimal={capacitivo_dec} | "
            f"hex={capacitivo_hex} | {estado}"
        )

    print(
        f"  Total: {total_metalicas + total_nao_metalicas} | "
        f"metálicas={total_metalicas} | "
        f"não metálicas={total_nao_metalicas}"
    )
    print(
        f"  Peças no tanque: {total_tanque}/{CAPACIDADE_TANQUE}",
        flush=True,
    )


def exibir_estatisticas(
    historicos,
    tempo_decorrido,
    total_metalicas,
    total_nao_metalicas,
    total_tanque,
    caminho_csv,
):
    print("\n" + "=" * 60)
    print("MONITORAMENTO ENCERRADO")
    print("=" * 60)
    print(f"Tempo: {tempo_decorrido:.1f} segundos")

    for chave, nome, unidade in [
        ("distancia_cm", "SENSOR GERAL", " cm"),
        ("indutivo", "SENSOR INDUTIVO", ""),
        ("capacitivo", "SENSOR CAPACITIVO", ""),
    ]:
        valores = historicos[chave]
        print(f"\n{nome}")

        if not valores:
            print("Nenhuma leitura válida.")
            continue

        print(f"Leituras: {len(valores)}")
        print(f"Último: {valores[-1]}{unidade}")
        print(f"Média: {statistics.mean(valores):.1f}{unidade}")
        print(f"Mínimo: {min(valores)}{unidade}")
        print(f"Máximo: {max(valores)}{unidade}")

    print("\nCONTAGEM")
    print(f"Total geral: {total_metalicas + total_nao_metalicas}")
    print(f"Metálicas — indutivo: {total_metalicas}")
    print(f"Não metálicas — capacitivo: {total_nao_metalicas}")
    print(f"Peças no tanque: {total_tanque}/{CAPACIDADE_TANQUE}")
    print(f"\nCSV: {caminho_csv}")
    print("=" * 60)


def monitorar_producao():
    total_metalicas = 0
    total_nao_metalicas = 0

    metalicas_no_tanque = 0
    nao_metalicas_no_tanque = 0

    indutivo_ativo = False
    capacitivo_ativo = False
    queda_anterior = None

    ultima_contagem_metalica = float("-inf")

    historicos = {
        "distancia_cm": [],
        "indutivo": [],
        "capacitivo": [],
    }

    nome_csv = (
        f"dados_sensores_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    )
    caminho_csv = os.path.abspath(nome_csv)

    print(f"Monitoramento por {DURACAO_MONITORAMENTO} segundos")
    print(f"API: {API_URL}")
    print(
        "Indutivo — metálicas: "
        f"{LIMITE_MIN_METALICA} a {LIMITE_MAX_METALICA}"
    )
    print(
        "Recontagem metálica enquanto acionado: "
        f"a cada {INTERVALO_CONTAGEM_METALICA} segundo(s)"
    )
    print(
        "Capacitivo — não metálicas: "
        f"{LIMITE_MIN_NAO_METALICA} a {LIMITE_MAX_NAO_METALICA}"
    )
    print(f"CSV: {caminho_csv}")
    print("Pressione Ctrl+C para encerrar.\n")

    with open(
        caminho_csv,
        mode="w",
        newline="",
        encoding="utf-8-sig",
    ) as arquivo_csv:
        writer = csv.writer(arquivo_csv, delimiter=";")
        writer.writerow(CABECALHO_CSV)

        inicio = time.monotonic()
        ultima_exibicao = inicio - INTERVALO_EXIBICAO
        ultimo_envio_distancia = inicio - INTERVALO_ENVIO_DISTANCIA

        try:
            while time.monotonic() - inicio < DURACAO_MONITORAMENTO:
                leituras = {
                    nome: ler_sensor(url)
                    for nome, url in SENSORES.items()
                }

                timestamp = datetime.now().strftime(
                    "%Y-%m-%d %H:%M:%S.%f"
                )[:-3]

                geral_dec, geral_hex = leituras["geral"]
                indutivo_dec, indutivo_hex = leituras["indutivo"]
                capacitivo_dec, capacitivo_hex = leituras["capacitivo"]

                distancia_cm = None
                eventos = []
                classificacoes = []

                novas_metalicas = 0
                novas_nao_metalicas = 0

                # 1. Sensor geral: distância e queda no tanque.
                if geral_dec is not None:
                    distancia_cm = round(
                        geral_dec * FATOR_DISTANCIA_CM,
                        1,
                    )
                    historicos["distancia_cm"].append(distancia_cm)

                    tipo_queda = classificar_queda(geral_dec)

                    if (
                        tipo_queda is not None
                        and tipo_queda != queda_anterior
                    ):
                        if tipo_queda == "metalica":
                            metalicas_no_tanque += 1
                        else:
                            nao_metalicas_no_tanque += 1

                        eventos.append("queda_tanque")
                        classificacoes.append(tipo_queda)

                        print(
                            f"[GERAL] Queda: {tipo_queda} "
                            f"| valor={geral_dec}",
                            flush=True,
                        )

                    queda_anterior = tipo_queda
                else:
                    eventos.append("falha_sensor_geral")

                # 2. Indutivo:
                # conta na entrada e repete a cada segundo ativo.
                presenca_metalica = dentro_da_faixa(
                    indutivo_dec,
                    LIMITE_MIN_METALICA,
                    LIMITE_MAX_METALICA,
                )

                if presenca_metalica is not None:
                    historicos["indutivo"].append(indutivo_dec)
                    agora_contagem = time.monotonic()

                    if presenca_metalica and (
                        not indutivo_ativo
                        or agora_contagem - ultima_contagem_metalica
                        >= INTERVALO_CONTAGEM_METALICA
                    ):
                        novas_metalicas = 1
                        total_metalicas += 1
                        ultima_contagem_metalica = agora_contagem

                        eventos.append("peca_metalica_indutivo")
                        classificacoes.append("metalica")

                        print(
                            "[INDUTIVO] METÁLICA contada! "
                            f"Valor={indutivo_dec} | "
                            f"Total metálicas={total_metalicas}",
                            flush=True,
                        )

                    indutivo_ativo = presenca_metalica
                else:
                    # Não conta nem muda o estado durante uma falha.
                    eventos.append("falha_sensor_indutivo")

                # 3. Capacitivo:
                # conta uma vez ao entrar na faixa.
                presenca_nao_metalica = dentro_da_faixa(
                    capacitivo_dec,
                    LIMITE_MIN_NAO_METALICA,
                    LIMITE_MAX_NAO_METALICA,
                )

                if presenca_nao_metalica is not None:
                    historicos["capacitivo"].append(capacitivo_dec)

                    if presenca_nao_metalica and not capacitivo_ativo:
                        novas_nao_metalicas = 1
                        total_nao_metalicas += 1

                        eventos.append("peca_nao_metalica_capacitivo")
                        classificacoes.append("nao_metalica")

                        print(
                            "[CAPACITIVO] NÃO METÁLICA detectada! "
                            f"Valor={capacitivo_dec} | "
                            f"Total não metálicas={total_nao_metalicas}",
                            flush=True,
                        )

                    capacitivo_ativo = presenca_nao_metalica
                else:
                    eventos.append("falha_sensor_capacitivo")

                total_geral = total_metalicas + total_nao_metalicas
                total_tanque = (
                    metalicas_no_tanque + nao_metalicas_no_tanque
                )

                # 4. Salva as leituras e contagens no CSV.
                writer.writerow([
                    timestamp,
                    geral_dec,
                    geral_hex,
                    distancia_cm,
                    indutivo_dec,
                    indutivo_hex,
                    (
                        int(presenca_metalica)
                        if presenca_metalica is not None
                        else ""
                    ),
                    capacitivo_dec,
                    capacitivo_hex,
                    (
                        int(presenca_nao_metalica)
                        if presenca_nao_metalica is not None
                        else ""
                    ),
                    "|".join(eventos) if eventos else "leitura_normal",
                    "|".join(classificacoes),
                    novas_metalicas,
                    novas_nao_metalicas,
                    total_geral,
                    total_metalicas,
                    total_nao_metalicas,
                    total_tanque,
                ])
                arquivo_csv.flush()

                # 5. Exibição periódica.
                agora = time.monotonic()

                if agora - ultima_exibicao >= INTERVALO_EXIBICAO:
                    exibir_sensores(
                        leituras,
                        distancia_cm,
                        presenca_metalica,
                        presenca_nao_metalica,
                        total_metalicas,
                        total_nao_metalicas,
                        total_tanque,
                    )
                    ultima_exibicao = time.monotonic()

                # 6. Envio à API:
                # incrementos de peças ou atualização de distância.
                agora = time.monotonic()

                ha_novas_pecas = (
                    novas_metalicas > 0 or novas_nao_metalicas > 0
                )
                enviar_distancia = (
                    distancia_cm is not None
                    and agora - ultimo_envio_distancia
                    >= INTERVALO_ENVIO_DISTANCIA
                )

                if ha_novas_pecas or enviar_distancia:
                    enviar_api(
                        novas_metalicas=novas_metalicas,
                        novas_nao_metalicas=novas_nao_metalicas,
                        distancia_cm=distancia_cm,
                        tempo_decorrido=agora - inicio,
                        total_metalicas=total_metalicas,
                        total_nao_metalicas=total_nao_metalicas,
                        total_tanque=total_tanque,
                    )

                    if distancia_cm is not None:
                        ultimo_envio_distancia = time.monotonic()

                time.sleep(INTERVALO_LEITURA)

        except KeyboardInterrupt:
            print("\nMonitoramento interrompido pelo usuário.")

        finally:
            exibir_estatisticas(
                historicos=historicos,
                tempo_decorrido=time.monotonic() - inicio,
                total_metalicas=total_metalicas,
                total_nao_metalicas=total_nao_metalicas,
                total_tanque=(
                    metalicas_no_tanque + nao_metalicas_no_tanque
                ),
                caminho_csv=caminho_csv,
            )


if __name__ == "__main__":
    try:
        monitorar_producao()
    finally:
        sessao.close()