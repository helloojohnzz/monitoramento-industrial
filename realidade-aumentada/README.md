# Realidade Aumentada — Esteira em RA (MindAR + A-Frame)

Ao apontar a câmera do celular para a esteira (ou para a foto dela), aparecem as contagens de peças e o nível do reservatório. O nível muda de cor: cinza (normal), branco (a partir de 70%) e roxo (a partir de 90%, com alerta).

## Arquivos

- `index.html`: cena A-Frame + MindAR, no mesmo modelo da aula 02.
- `app.js`: busca os dados na API a cada 3 segundos e atualiza a cena.
- `assets/esteira.jpg`: foto da esteira usada como marcador.
- `assets/esteira.mind`: target compilado a partir da foto (gerado com o compilador do MindAR).
- `assets/marcador.png` / `assets/marcador.mind`: marcador antigo, para imprimir (para voltar a usá-lo, troque `esteira.mind` por `marcador.mind` no `index.html`).
- `dados-demo.json`: dados usados quando a API não responde (modo demonstração).

## Como testar

1. Publique a pasta no GitHub Pages ou rode um servidor local (por exemplo, Live Server).
2. Abra no celular e aponte a câmera para a esteira, de um ângulo parecido com o da foto `assets/esteira.jpg`. Para testar fora do laboratório, aponte para a foto aberta na tela do computador ou impressa.

O reconhecimento funciona melhor com a esteira vista de frente, com boa iluminação e com a câmera mais ou menos na mesma distância da foto. Se mudar muito o ângulo, ou se as peças e cabos estiverem em posições bem diferentes, o app pode não reconhecer. Nesse caso, tire uma foto nova do ângulo que vai usar na apresentação e gere outro `esteira.mind` no compilador do MindAR: https://hiukim.github.io/mind-ar-js-doc/tools/compile

Por padrão o app busca a API em `http://localhost:3000/records`. Para usar a API do back-end, passe o endereço na URL:

```
index.html?api=http://IP-DO-COMPUTADOR:8080
```

Se a API não responder, a cena usa `dados-demo.json` e mostra "Modo demonstração" no topo da tela.
