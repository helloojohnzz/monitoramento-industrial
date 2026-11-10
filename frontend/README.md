# Front-end — Dashboard da esteira (React)

Dashboard web do Projeto Interdisciplinar II (MetalTech). Mostra a contagem de peças metálicas e não metálicas e o nível do reservatório, atualizando a cada 3 segundos.

**Tecnologias:** React + Vite, React Router, Bootstrap (react-bootstrap) e JSON Server.

## Como rodar

```bash
cd frontend
npm install
npm run server   # API de teste (JSON Server) em http://localhost:3000
npm run dev      # em outro terminal: abre o dashboard
```

## Telas

- **Dashboard** (`/`): totais, nível do reservatório e gráficos.
- **Histórico** (`/historico`): tabela de leituras com filtro por tipo de peça.
- **Alertas** (`/alertas`): leituras em que o reservatório passou de 70% (atenção) ou 90% (crítico).

## Ligando na API Spring Boot

1. Copie `.env.example` para `.env`.
2. Troque o endereço para `VITE_API_URL=http://localhost:8080`.

O front espera `GET /records` retornando a lista de `Record` (`id`, `dateTime`, `metal` ou `isMetal`, `distance`). O back-end precisa liberar CORS para o endereço do front.

O nível do reservatório é calculado a partir de `distance`: o sensor fica no topo de um reservatório de 30 cm, então quanto menor a distância, mais cheio. Essa altura e os limites de alerta ficam em `src/config.js`.

## GitHub Pages

O site publicado fica na branch `gh-pages`, com o dashboard na raiz e a RA em `/ra/`. Sem a API, ele abre em **modo demonstração**, com os dados de `db.json`.

Para atualizar o site depois de mudar o código:

```bash
cd frontend
npm run build
```

Em seguida, copie o conteúdo de `dist/` (e a pasta `realidade-aumentada/` para `ra/`) para a branch `gh-pages`.
