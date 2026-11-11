// ===== Configurações =====
// Endereço da API. Pode ser trocado pela URL: index.html?api=http://IP-DO-PC:8080
const parametros = new URLSearchParams(window.location.search);
const API_URL = parametros.get('api') || 'http://localhost:3000';
const URL_LEITURAS = API_URL + '/records';

const INTERVALO = 3000;            // atualiza a cada 3 segundos
const ALTURA_RESERVATORIO_CM = 30; // mesma regra do dashboard
const NIVEL_ATENCAO = 70;
const NIVEL_CRITICO = 90;
const ALTURA_TUBO = 0.5;           // altura do cilindro na cena

const status = document.getElementById('status');

// ===== Regras (iguais às do front-end) =====
function ehMetal(leitura) {
    return leitura.metal ?? leitura.isMetal;
}

function calcularNivel(distancia) {
    const nivel = ((ALTURA_RESERVATORIO_CM - distancia) / ALTURA_RESERVATORIO_CM) * 100;
    return Math.min(100, Math.max(0, Math.round(nivel)));
}

function corDoNivel(nivel) {
    // Paleta MetalTech: cinza (normal), branco (atenção) e vermelho (crítico).
    // Essa cor vai só no cilindro do reservatório; os textos ficam brancos.
    if (nivel >= NIVEL_CRITICO) return '#D90429'; // vermelho
    if (nivel >= NIVEL_ATENCAO) return '#FFFFFF'; // branco
    return '#8C8C8C';                             // cinza
}

// ===== Busca dos dados =====
// Tenta a API; se não conseguir, usa os dados de demonstração
async function buscarLeituras() {
    try {
        const res = await fetch(URL_LEITURAS);
        const dados = await res.json();
        return { leituras: dados, demo: false };
    } catch (e) {
        const res = await fetch('./dados-demo.json');
        const dados = await res.json();
        return { leituras: dados.records, demo: true };
    }
}

// ===== Atualiza a cena =====
function atualizarCena(leituras) {
    const metalicas = leituras.filter(ehMetal).length;
    const naoMetalicas = leituras.length - metalicas;
    const ultima = leituras[leituras.length - 1];
    const nivel = ultima ? calcularNivel(ultima.distance) : 0;
    const cor = corDoNivel(nivel);

    document.getElementById('txt-metalicas').setAttribute('value', metalicas);
    document.getElementById('txt-nao-metalicas').setAttribute('value', naoMetalicas);
    document.getElementById('txt-total').setAttribute('value', leituras.length);

    const txtNivel = document.getElementById('txt-nivel');
    txtNivel.setAttribute('value', 'Reservatorio: ' + nivel + '%');

    let alerta = '';
    if (nivel >= NIVEL_CRITICO) alerta = 'ALERTA: reservatorio quase cheio!';
    else if (nivel >= NIVEL_ATENCAO) alerta = 'Atencao: nivel alto';
    document.getElementById('txt-alerta').setAttribute('value', alerta);

    // O cilindro cresce de baixo para cima conforme o nível
    const altura = Math.max(0.01, (nivel / 100) * ALTURA_TUBO);
    const conteudo = document.getElementById('conteudo');
    conteudo.setAttribute('height', altura);
    conteudo.setAttribute('position', { x: 0.32, y: -ALTURA_TUBO / 2 + altura / 2, z: 0.15 });
    conteudo.setAttribute('color', cor);
}

async function atualizar() {
    const { leituras, demo } = await buscarLeituras();
    atualizarCena(leituras);
    status.textContent = demo
        ? 'Modo demonstração (API não encontrada em ' + API_URL + ')'
        : 'Conectado à API: ' + API_URL;
}

// Mostra se o marcador está sendo reconhecido
const alvo = document.getElementById('alvo');
alvo.addEventListener('targetFound', () => status.style.background = 'rgba(217, 4, 41, 0.9)');
alvo.addEventListener('targetLost', () => status.style.background = 'rgba(0, 0, 0, 0.7)');

atualizar();
setInterval(atualizar, INTERVALO);
