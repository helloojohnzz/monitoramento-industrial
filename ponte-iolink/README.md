# Ponte IO-Link → API

Programa que lê os sensores ligados no IO-Link master (ifm AL13xx) e envia cada peça
que passa na esteira para o `POST /records` do back-end Spring Boot, que grava no MySQL.

```
IO-Link master → ponte (este programa) → POST /records (Spring) → MySQL → front-end
```

Precisa só do **Node.js 18 ou mais novo**. Não tem dependências para instalar.

## Como rodar

O PC precisa estar na rede do laboratório (a mesma do master, `10.110.12.41`).

```bash
cd ponte-iolink
npm run teste   # só mostra os valores dos sensores na tela
npm start       # lê os sensores e envia as peças para a API
```

Antes do `npm start`, o back-end precisa estar rodando em `http://localhost:8080`.

## Como funciona

A cada 50 ms a ponte lê duas portas do master
(`/iolinkmaster/port[N]/iolinkdevice/pdin/getdata`), com a mesma lógica calibrada do
script `dataScience/main.py`:

1. **Porta 2 (sensor de peças):** enquanto a peça passa, o valor sobe. A ponte guarda o
   maior valor (pico). Quando a peça sai, ela classifica pelo pico:
   - 7000 a 10000: **metálica** (vai para o `TANK1`);
   - 1500 a 2500: **não metálica** (vai para o `TANK2`).
2. **Porta 1 (sensor de distância):** a leitura atual vira o campo `distance`, em cm.
3. Envia para a API:
   ```json
   { "isMetal": true, "distance": 22.4, "tank": "TANK1" }
   ```

Se a API estiver fora do ar, as leituras ficam numa fila e são reenviadas depois.
Se o tanque estiver cheio (a API responde 409), a peça é avisada na tela e descartada.

## Configuração (`config.json`)

| Campo | O que é |
|---|---|
| `masterUrl` | Endereço do IO-Link master |
| `apiUrl` | Endereço do `POST /records` do back-end |
| `intervaloLeituraMs` | De quanto em quanto tempo lê os sensores |
| `sensores.distancia.porta` / `fatorParaCm` | Porta do sensor de distância e o fator para converter o valor em cm (0.1 = valor em mm) |
| `sensores.peca.porta` | Porta do sensor que classifica as peças |
| `sensores.peca.presencaAPartirDe` | Valor a partir do qual há uma peça na frente do sensor |
| `sensores.peca.faixaMetalica` / `faixaNaoMetalica` | Faixas do pico para cada tipo de peça |
| `tanques.metalica` / `tanques.naoMetalica` | Para qual tanque vai cada tipo de peça |

Também dá para trocar os endereços sem mexer no arquivo:

```bash
MASTER_URL=http://10.110.12.41 API_URL=http://localhost:8080/records npm start
```

No Windows (cmd), com a chave da API:

```bash
set API_KEY=sua-chave&& npm start
```

## Calibrando os sensores

1. Rode `npm run teste`: ele mostra o valor das duas portas a cada meio segundo.
2. Passe uma peça metálica e uma não metálica e veja o pico de cada uma.
3. Se precisar, ajuste as faixas e o `fatorParaCm` no `config.json`.

### API na nuvem

Quando a API estiver publicada na nuvem, ela exige uma chave para gravar dados.
Passe o endereço da API e a mesma chave configurada no back-end (`API_KEY`):

```bash
API_URL=https://ENDERECO-DA-API/records API_KEY=sua-chave npm start
```

Não coloque a chave no `config.json`, porque esse arquivo vai para o GitHub.

## Calibrando os sensores

As portas e regras do `config.json` são um **palpite inicial**, baseado nas leituras
`port[1]=0331`, `port[2]=0767` e `port[3]=7FE0`. Para confirmar:

1. Rode `npm run teste`.
2. Passe uma peça metálica, uma não metálica e aproxime a mão do sensor de nível.
3. Veja qual valor muda em cada caso e ajuste `porta`, `ativoQuando` e `fatorParaCm`.

O manual de cada sensor (seção *Process Data*) mostra como o valor é codificado.
