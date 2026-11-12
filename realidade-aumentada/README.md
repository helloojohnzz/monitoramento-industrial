# Realidade Aumentada — Esteira em RA (MindAR + A-Frame)

Ao apontar a câmera do celular para o marcador, aparecem as contagens de peças e o nível do reservatório. O nível muda de cor: cinza (normal), branco (a partir de 70%) e roxo (a partir de 90%, com alerta).

## Arquivos

- `index.html`: cena A-Frame + MindAR, no mesmo modelo da aula 02.
- `app.js`: busca os dados na API a cada 3 segundos e atualiza a cena.
- `assets/marcador.png`: imagem para imprimir e colar na esteira.
- `assets/marcador.mind`: target compilado do marcador.
- `dados-demo.json`: dados usados quando a API não responde (modo demonstração).

## Como testar

1. Publique a pasta no GitHub Pages ou rode um servidor local (por exemplo, Live Server).
2. Abra no celular e aponte a câmera para `assets/marcador.png`, impresso ou na tela do computador.

Por padrão o app busca a API em `http://localhost:3000/records`. Para usar a API do back-end, passe o endereço na URL:

```
index.html?api=http://IP-DO-COMPUTADOR:8080
```

Se a API não responder, a cena usa `dados-demo.json` e mostra "Modo demonstração" no topo da tela.
