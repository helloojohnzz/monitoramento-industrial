# Monitoramento Industrial — MetalTech

Plataforma de monitoramento de uma esteira de triagem de peças, desenvolvida no Projeto Interdisciplinar II do curso de Análise e Desenvolvimento de Sistemas.

Os sensores da esteira contam as peças e identificam se são metálicas ou não metálicas. Os dados são gravados em um banco MySQL por meio de uma API REST e exibidos em um dashboard web e em um aplicativo de Realidade Aumentada.

**Site publicado:** https://helloojohnzz.github.io/monitoramento-industrial/

## Arquitetura

```
Sensores (IO-Link) → ponte-iolink → API REST (Spring Boot) → MySQL
                                          │
                         ┌────────────────┴────────────────┐
                   Dashboard (React)            App de RA (MindAR)
```

## Estrutura do repositório

| Pasta | Conteúdo |
|---|---|
| `backend/` | API REST em Java / Spring Boot com MySQL |
| `ponte-iolink/` | Programa em Node.js que lê os sensores do IO-Link master e envia as peças para a API |
| `dataScience/` | Coleta e análise dos dados da esteira (Python e JavaScript), com relatório em gráficos |
| `frontend/` | Dashboard web em React + Vite + Bootstrap |
| `realidade-aumentada/` | Aplicativo de Realidade Aumentada (A-Frame + MindAR) |
| `docs/` | Versão publicada no GitHub Pages (dashboard e RA) |
| `nuvem/` | Documento de arquitetura de nuvem, diagrama e guia de publicação |

## Tecnologias

- **Back-end:** Java 25, Spring Boot, Spring Data JPA, Lombok, MySQL
- **Front-end:** React, Vite, React Router, Bootstrap
- **Realidade Aumentada:** A-Frame, MindAR
- **Integração com sensores:** Node.js, IO-Link (ifm)
- **Ciência de Dados:** Python
- **Nuvem:** Docker, Docker Compose, PaaS (Render) e MySQL gerenciado (Aiven)

## Como rodar

### 1. Back-end

Requisitos: Java 25 e MySQL rodando em `localhost:3306`. O banco `db_industrial_monitoring` é criado automaticamente. Usuário e senha ficam em `backend/src/main/resources/application.properties`.

```bash
cd backend
./mvnw spring-boot:run
```

A API sobe em `http://localhost:8080`.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/records` | Lista todas as leituras |
| POST | `/records` | Registra uma nova leitura (peça) |

#### Com Docker

Também dá para subir a API e o MySQL juntos com Docker. Copie `.env.example` para `.env`, troque as senhas e rode na raiz do repositório:

```bash
docker compose up -d --build
```

A saúde da API fica em `http://localhost:8080/actuator/health`. Quando `API_KEY` está definida, gravar dados exige o cabeçalho `X-API-Key`. Detalhes e o passo a passo para publicar na nuvem estão em [`nuvem/README.md`](nuvem/README.md).

### 2. Ponte IO-Link

Requisitos: Node.js 18+ e o computador na mesma rede do IO-Link master.

```bash
cd ponte-iolink
npm run teste   # só mostra os valores dos sensores
npm start       # lê os sensores e envia as peças para a API
```

### Ciência de Dados (JavaScript)

Versão em JavaScript do `dataScience/main.py`. Lê os sensores por 20 segundos, mostra as estatísticas no terminal e gera o arquivo `dataScience/relatorio.html` com um gráfico de barras (peças metálicas x não metálicas) e um gráfico de segmentos (distâncias medidas no tanque).

```bash
cd dataScience
npm start          # lê os sensores reais (rede do laboratório)
npm run simular    # gera leituras de teste, para rodar fora do laboratório
```

Depois, abra `relatorio.html` no navegador.

### 3. Dashboard

```bash
cd frontend
npm install
npm run server   # API de teste (JSON Server) em http://localhost:3000
npm run dev      # abre o dashboard
```

Para usar a API Spring Boot, copie `.env.example` para `.env` e defina `VITE_API_URL=http://localhost:8080`.

Telas: **Dashboard** (totais, nível do reservatório e gráficos), **Histórico** (tabela com filtro por tipo de peça) e **Alertas** (reservatório acima de 70% ou 90%).

### 4. Realidade Aumentada

Abra `realidade-aumentada/index.html` com um servidor local (ou pelo GitHub Pages) no celular e aponte a câmera para a esteira ou para a foto `assets/esteira.jpg`.

Aparecem as contagens de peças e o nível do reservatório, com alerta visual quando ele está quase cheio. É possível aumentar ou diminuir o painel com pinça (dois dedos) ou pelos botões **−** e **+**.

Para usar a API do back-end:

```
index.html?api=http://IP-DO-COMPUTADOR:8080
```

Se a API não responder, o app entra em modo demonstração com dados de exemplo.

## Equipe

- Samuel Campos
- João Paulo Oliveira
- Eduardo Bruno Coppi
- Beatriz Cardoso Rocha
