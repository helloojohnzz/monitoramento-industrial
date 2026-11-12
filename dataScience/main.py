import time
import requests

# Mapeamento completo dos 3 endpoints IO-Link
SENSORES = {
    "sensor_geral": {
        "url": "http://10.110.12.41/iolinkmaster/port[1]/iolinkdevice/pdin/getdata",
        "tipo": "geral"
    },
    "sensor_metalico": {
        "url": "http://10.110.12.41/iolinkmaster/port[2]/iolinkdevice/pdin/getdata",
        "tipo": "metalica"
    },
    "sensor_nao_metalico": {
        "url": "http://10.110.12.41/iolinkmaster/port[3]/iolinkdevice/pdin/getdata",
        "tipo": "nao_metalica"
    }
}

def monitorar_producao():
    print("Iniciando monitoramento da linha de produção (3 sensores)... Pressione Ctrl+C para parar.\n")

    while True:
        timestamp_atual = time.strftime("%Y-%m-%d %H:%M:%S")
        
        for nome_sensor, config in SENSORES.items():
            try:
                resposta = requests.get(config["url"], timeout=3)
                dados = resposta.json()

                if dados.get("code") == 200:
                    hex_value = dados["data"]["value"]
                    # Converte de Hexadecimal para Decimal (Centímetros)
                    distancia_cm = int(hex_value, 16)
                    
                    tipo_peca = config["tipo"]
                    
                    # Exibindo de forma diferenciada no console
                    if tipo_peca == "metalica":
                        print(f"[{timestamp_atual}] [PEÇA METÁLICA] Sensor P2 -> Distância: {distancia_cm} cm (Hex: {hex_value})")
                    elif tipo_peca == "nao_metalica":
                        print(f"[{timestamp_atual}] [PEÇA NÃO METÁLICA] Sensor P3 -> Distância: {distancia_cm} cm (Hex: {hex_value})")
                    else:
                        print(f"[{timestamp_atual}] [SENSOR GERAL] Sensor P1 -> Distância: {distancia_cm} cm (Hex: {hex_value})")
                        
                    # 💡 DICA: É exatamente aqui que você salvaria esses dados no seu banco de dados 
                    # (inserindo: timestamp, tipo_peca, distancia_cm)

                else:
                    print(f"[{timestamp_atual}] [{nome_sensor}] Erro de código retornado: {dados.get('code')}")

            except requests.exceptions.RequestException as e:
                print(f"[{timestamp_atual}] [{nome_sensor}] Erro de conexão com o IO-Link: {e}")
            except ValueError:
                print(f"[{timestamp_atual}] [{nome_sensor}] Erro ao converter o valor hex: {hex_value}")

        print("-" * 60)
        # Pausa de 2 segundos antes da próxima varredura
        time.sleep(2)

if __name__ == "__main__":
    monitorar_producao()