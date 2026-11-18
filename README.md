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

- **Back-end:** Java 21, Spring Boot, Spring Data JPA, Lombok, MySQL
- **Front-end:** React, Vite, React Router, Bootstrap
- **Realidade Aumentada:** A-Frame, MindAR
- **Integração com sensores:** Node.js, IO-Link (ifm)
- **Ciência de Dados:** Python
- **Nuvem:** Docker, Docker Compose, PaaS (Render) e MySQL gerenciado (Aiven)

## Como rodar

### 1. Back-end

Requisitos: Java 21 e MySQL rodando em `localhost:3306`. O banco `db_industrial_monitoring` é criado automaticamente. Usuário e senha ficam em `backend/src/main/resources/application.properties`.

```bash
cd backend
./mvnw spring-boot:run
```

A API sobe em `http://localhost:8080`.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/records` | Lista todas as leituras |
| POST | `/records` | Registra uma peça ou um lote de produção |

Cada registro informa `metalPieces` e `nonMetalPieces` (incrementos naquele registro),
`situation` (`ok` ou `cheio`), `productionRate` (peças por minuto) e, quando
disponível, `distance` (centímetros). O painel soma os incrementos dos registros.

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

### Monitoramento com Python

Com a API em execução, instale `flask` e `requests` no ambiente Python. Em um
terminal, rode `python dataScience/mock_iolink.py`. Em outro, rode
`python dataScience/main.py` para enviar cada peça detectada à API. Para
testar o envio de um único resumo ao final da coleta, use
`python dataScience/teste_monitoramento.py` como opção de teste independente.

`API_URL` pode apontar para outra API e deve incluir `/records`. O padrão
é `http://localhost:8080/records`. Defina `API_KEY` quando exigida pela API.

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
npm run dev      # abre o dashboard
```

O painel usa a API Spring Boot em `http://localhost:8080` por padrão. Para usar o JSON Server, defina `VITE_API_URL=http://localhost:3000` em `frontend/.env` e rode `npm run server` em outro terminal.

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

## Documentação técnica

O relatório segue o modelo disponibilizado no Classroom da Atividade Interdisciplinar e documenta as seis unidades curriculares, a API, a arquitetura, a análise dos CSVs e o estado da integração.

- [Ler o relatório no GitHub](docs/RELATORIO_TECNICO.md)
- [Baixar o relatório editável em Word](docs/Relatorio_Tecnico_MetalTech.docx)

