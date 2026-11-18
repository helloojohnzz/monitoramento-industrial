from flask import Flask, jsonify
import random

app = Flask(__name__)

@app.route('/sensores/distancia', methods=['GET'])
def sensor_distancia():
    # Simula o sensor de distância do tanque com pequenas variações ou quedas
    r = random.random()
    if r < 0.15:
        # Queda de peça metálica (faixa: 220 - 250)
        valor_dec = random.randint(220, 250)
    elif r < 0.30:
        # Queda de peça não metálica (faixa: 90 - 110)
        valor_dec = random.randint(90, 110)
    else:
        # Nível normal do tanque com leve oscilação (repouso)
        valor_dec = random.randint(480, 520)
        
    return jsonify({
        "code": 200,
        "data": {
            "value": hex(valor_dec)[2:].upper()
        }
    })

@app.route('/sensores/capacitivo', methods=['GET'])
def sensor_capacitivo():
    # Simula o sensor capacitivo de peças (porta 2)
    r = random.random()
    if r < 0.15:
        # Peça metálica passando (faixa: 7000 - 10000)
        valor_dec = random.randint(7000, 10000)
    elif r < 0.30:
        # Peça não metálica passando (faixa: 1500 - 2500)
        valor_dec = random.randint(1500, 2500)
    else:
        # Sem peça (repouso com leve ruído)
        valor_dec = random.randint(180, 220)
        
    return jsonify({
        "code": 200,
        "data": {
            "value": hex(valor_dec)[2:].upper()
        }
    })

if __name__ == '__main__':
    print("Servidor Mock IO-Link (Dinâmico) rodando em http://localhost:5000")
    app.run(host='0.0.0.0', port=5000)
