let todosDados = {};
let mesAtual = "Janeiro";
let chartInstance = null;
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const temasMeses = {
    "Janeiro": { cor: "#ffb7c5", foto: "jan.jpg", bg: "#fff0f3" },
    "Fevereiro": { cor: "#b0e0e6", foto: "fev.jpg", bg: "#f0f8ff" },
    "Março": { cor: "#98fb98", foto: "mar.jpg", bg: "#f5fff5" },
    "Abril": { cor: "#96961cff", foto: "abr.jpg", bg: "#fffff0" },
    "Maio": { cor: "#e0b0ff", foto: "mai.jpg", bg: "#faf5ff" },
    "Junho": { cor: "#ffd700", foto: "jun.jpg", bg: "#fffdf0" },
    "Julho": { cor: "#ffdab9", foto: "jul.jpg", bg: "#fff5ee" },
    "Agosto": { cor: "#add8e6", foto: "ago.jpg", bg: "#f0faff" },
    "Setembro": { cor: "#f08080", foto: "set.jpg", bg: "#fff5f5" },
    "Outubro": { cor: "#ff8c00", foto: "out.jpg", bg: "#fff8f0" },
    "Novembro": { cor: "#bc8f8f", foto: "nov.jpg", bg: "#fdf5f5" },
    "Dezembro": { cor: "#eedcdcff", foto: "dez.jpg", bg: "#f0f0f0" }
};

async function atualizarTudo() {
    const res = await fetch('/api/data');
    todosDados = await res.json();
    renderizarInterface();
}

async function adicionar(tipo) {
    let desc, val, conta;
    if (tipo === 'boletos') {
        desc = document.getElementById('descBoleto').value;
        val = parseFloat(document.getElementById('valorBoleto').value);
        conta = "Boleto";
    } else {
        const sufixo = tipo === 'entradas' ? 'Entrada' : 'Saida';
        desc = document.getElementById('desc' + sufixo).value;
        val = parseFloat(document.getElementById('valor' + sufixo).value);
        conta = document.getElementById('conta' + sufixo).value;
    }

    if (!desc || isNaN(val)) return alert("Preencha tudo! ✨");

    await fetch('/api/add', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ mes: mesAtual, tipo: tipo, descricao: desc, valor: val, conta: conta })
    });

    if(tipo === 'boletos') { document.getElementById('descBoleto').value = ''; document.getElementById('valorBoleto').value = ''; }
    atualizarTudo();
}

async function remover(tipo, index) {
    await fetch('/api/remove', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ mes: mesAtual, tipo: tipo, index: index })
    });
    atualizarTudo();
}

async function salvarGuardado() {
    const v = document.getElementById('inputGuardado').value;
    await fetch('/api/guardar', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ mes: mesAtual, valor: v })
    });
    atualizarTudo();
}

function renderizarInterface() {
    const tema = temasMeses[mesAtual];
    const dadosMes = todosDados[mesAtual] || {entradas:[], saidas:[], boletos:[], guardado:0};


    document.body.style.backgroundColor = tema.bg;
    document.getElementById('currentMonthTitle').innerText = mesAtual;
    document.getElementById('currentMonthTitle').style.color = tema.cor;

    // --- CÁLCULOS ---
    const tEntradas = dadosMes.entradas.reduce((a, b) => a + b.valor, 0);
    const tSaidas = dadosMes.saidas.reduce((a, b) => a + b.valor, 0);
    
    // SÓ SOMA OS BOLETOS QUE ESTÃO MARCADOS COMO PAGO
    const tBoletosPagos = (dadosMes.boletos || [])
    .filter(item => item.pago === true) 
    .reduce((acc, item) => acc + item.valor, 0);

    const totalGastosMes = tSaidas + tBoletosPagos;
    // Lógica da Porcentagem
    const porcentagemGasta = tEntradas > 0 ? (totalGastosMes / tEntradas) * 100 : 0;
    
    const statusTxt = document.getElementById('systemStatus');
    const avatarImg = document.getElementById('operatorAvatar');

    if (porcentagemGasta >= 80) {
        statusTxt.innerText = "Não sobrou nada pro betinha... 😟";
        statusTxt.style.color = "#ff4d4d"; 
        avatarImg.src = `/static/${tema.foto.replace('.jpg', '_sad.jpg')}`;
    } else {
        statusTxt.innerText = "Tudo sob controle! 😊";
        statusTxt.style.color = tema.cor;
        avatarImg.src = `/static/${tema.foto}`;
    }

    // --- SALDO E POUPANÇA ---
    const totalGuardadoAnual = meses.reduce((acc, m) => acc + (todosDados[m]?.guardado || 0), 0);
    const saldoFinalCalculado = (tEntradas - totalGastosMes) + totalGuardadoAnual;
    
    document.getElementById('saldoFinal').innerText = saldoFinalCalculado.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('inputGuardado').value = dadosMes.guardado || 0;

    // 
    renderLista(dadosMes.entradas, 'listaEntradas', 'entradas');
    renderLista(dadosMes.saidas, 'listaSaidas', 'saidas');
    renderLista(dadosMes.boletos || [], 'listaBoletos', 'boletos');
    
    atualizarGrafico();
}

function renderLista(lista, id, tipo) {
    const container = document.getElementById(id);
    container.innerHTML = '';

    lista.forEach((item, i) => {
        const estaPago = item.pago === true;
        
        const componenteEsquerda = (tipo === 'boletos') 
            ? `<input type="checkbox" ${estaPago ? 'checked' : ''} onclick="alternarPagamento(${i})">`
            : `<span class="tag-conta">${item.conta || 'Pix'}</span>`;

        container.innerHTML += `
            <div class="item-row ${estaPago ? 'pago-style' : ''}">
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${componenteEsquerda}
                    <span style="${estaPago ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
                        ${item.descricao}
                    </span>
                </div>
                <div>
                    <strong style="margin-right: 10px;">R$ ${item.valor.toFixed(2)}</strong>
                    <button class="btn-del" onclick="remover('${tipo}', ${i})">✕</button>
                </div>
            </div>`;
    });
}

function atualizarGrafico() {
    const ctx = document.getElementById('meuGrafico').getContext('2d');
    const dEnt = meses.map(m => todosDados[m].entradas.reduce((a,b) => a+b.valor,0));
    const dSai = meses.map(m => (todosDados[m].saidas.reduce((a,b) => a+b.valor,0)) + (todosDados[m].boletos || []).reduce((a,b) => a+b.valor,0));

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses.map(m => m.substring(0,3)),
            datasets: [
                { label: 'Entradas', data: dEnt, borderColor: '#ffafbd', tension: 0.4 },
                { label: 'Gastos (Saídas + Contas)', data: dSai, borderColor: '#b0e0e6', tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function criarAbas() {
    const cont = document.getElementById('monthTabs');
    meses.forEach(m => {
        const b = document.createElement('button');
        b.innerText = m.substring(0,3);
        b.onclick = () => { 
            mesAtual = m; 
            document.querySelectorAll('.month-tabs button').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            atualizarTudo(); 
        };
        cont.appendChild(b);
    });
}

window.onload = () => { criarAbas(); atualizarTudo(); };

async function alternarPagamento(index) {
    const response = await fetch('/api/pagar_boleto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes: mesAtual, index: index })
    });

    if (response.ok) {
        
        atualizarTudo(); 
    }
}

function renderListaBoletos(lista, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    lista.forEach((item, index) => {
        container.innerHTML += `
            <div class="item-row ${item.pago ? 'pago-estilo' : ''}">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" ${item.pago ? 'checked' : ''} 
                           onclick="alternarPagamento(${index})">
                    <span style="${item.pago ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                        ${item.descricao}
                    </span>
                </div>
                <div>
                    <strong>R$ ${item.valor.toFixed(2)}</strong>
                    <button class="btn-del" onclick="remover('boletos', ${index})">✕</button>
                </div>
            </div>`;
    });
}