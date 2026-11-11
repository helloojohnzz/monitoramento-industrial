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

A cada 200 ms a ponte lê as 3 portas do master
(`/iolinkmaster/port[N]/iolinkdevice/pdin/getdata`) e:

1. Quando o **sensor de presença** detecta uma peça, começa a acompanhar a peça.
2. Enquanto a peça está na frente dele, verifica se o **sensor indutivo** detectou metal.
3. Quando a peça sai, envia para a API:
   ```json
   { "isMetal": true, "distance": 20.4 }
   ```
   `distance` é a leitura do **sensor de nível** do reservatório, em centímetros.

Se a API estiver fora do ar, as leituras ficam numa fila e são reenviadas depois.

## Configuração (`config.json`)

| Campo | O que é |
|---|---|
| `masterUrl` | Endereço do IO-Link master |
| `apiUrl` | Endereço do `POST /records` do back-end |
| `intervaloLeituraMs` | De quanto em quanto tempo lê os sensores |
| `intervaloMinimoEntrePecasMs` | Ignora "peças" mais próximas que isso (evita contar a mesma peça duas vezes) |
| `sensores.nivel` | Porta do sensor de distância. `descartarBits` tira os bits de comutação e `fatorParaCm` converte para cm (0.1 = valor em mm) |
| `sensores.presenca` / `sensores.metal` | Porta e regra `ativoQuando` de cada sensor liga/desliga |

Regras possíveis em `ativoQuando`:

- `{ "bit": 0 }`: acionado quando o bit 0 do valor vale 1
- `{ "valorAbaixoDe": 32000 }`: acionado quando o valor é menor que o limite
- `{ "valorAcimaDe": 100 }`: acionado quando o valor é maior que o limite
- Acrescente `"inverter": true` para trocar o resultado

Também dá para trocar os endereços sem mexer no arquivo:

```bash
MASTER_URL=http://10.110.12.41 API_URL=http://localhost:8080/records npm start
```

## Calibrando os sensores

As portas e regras do `config.json` são um **palpite inicial**, baseado nas leituras
`port[1]=0331`, `port[2]=0767` e `port[3]=7FE0`. Para confirmar:

1. Rode `npm run teste`.
2. Passe uma peça metálica, uma não metálica e aproxime a mão do sensor de nível.
3. Veja qual valor muda em cada caso e ajuste `porta`, `ativoQuando` e `fatorParaCm`.

O manual de cada sensor (seção *Process Data*) mostra como o valor é codificado.
