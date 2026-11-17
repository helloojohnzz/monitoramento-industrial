# Front-end — Dashboard da esteira (React)

Dashboard web do Projeto Interdisciplinar II (MetalTech). Mostra a contagem de peças metálicas e não metálicas e o nível do reservatório, atualizando a cada 3 segundos.

**Tecnologias:** React + Vite, React Router, Bootstrap (react-bootstrap) e JSON Server.

## Como rodar

```bash
cd frontend
npm install
npm run dev
```

## Telas

- **Dashboard** (`/`): totais, nível do reservatório e gráficos.
- **Histórico** (`/historico`): tabela de leituras com filtro por tipo de peça.
- **Alertas** (`/alertas`): leituras em que o reservatório passou de 70% (atenção) ou 90% (crítico).

## Ligando na API Spring Boot

O painel usa `http://localhost:8080` por padrão. Para usar outra API, defina `VITE_API_URL` em `frontend/.env`. Para testar com JSON Server, use `http://localhost:3000` e rode `npm run server`.

O painel consulta `GET /records` e soma `metalPieces` e `nonMetalPieces`. Usa `dateTime` para exibir a data das leituras, `productionRate` para exibir a taxa mais recente e `distance` para calcular o nível quando há medição. Os dados de demonstração também aceitam o formato anterior com `metal` ou `isMetal`. O backend precisa liberar CORS para o endereço do painel.

O nível do reservatório é calculado a partir de `distance`: o sensor fica no topo de um reservatório de 30 cm, então quanto menor a distância, mais cheio. Essa altura e os limites de alerta ficam em `src/config.js`.

## GitHub Pages

O site publicado fica na pasta `docs/` da master, com o dashboard na raiz e a RA em `docs/ra/`. Sem a API, ele abre em **modo demonstração**, com os dados de `db.json`.

Para atualizar o site depois de mudar o código:

```bash
cd frontend
npm run build
```

Em seguida, copie o conteúdo de `dist/` para `docs/` e a pasta `realidade-aumentada/` para `docs/ra/`.
