// 001: MODULO DE UTILITARIOS TÉCNICOS INTEGRADOS
// 002: RESPONSÁVEL POR SANEAMENTO, MÁSCARAS E CÁLCULOS ÉTNICO-EPIDEMIOLÓGICOS
const Utils = {

    // 003: SANEAMENTO DE STRINGS PARA EVITAR XSS E GARANTIR PADRÃO MAIÚSCULO
    sanitize(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = str.toString().toUpperCase().trim(); // 004: FORCA MAIUSCULAS E REMOVE ESPACOS
        return div.innerHTML;
    },

    // 005: CONVERSOR DE DATA BR PARA OBJETO DATE JS
    parseDateBR(str) {
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return null;
        const [d, m, y] = str.split('/').map(Number);
        const date = new Date(y, m - 1, d);
        // 006: VALIDAÇÃO DE DATA REAL (EX: IMPEDE 31/02)
        if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) return null;
        return date;
    },

    // 007: CÁLCULO DE IDADE PRECISO - ONIPRESENTE NO SISTEMA V12.2
    calculateAge(dateStr) {
        const birthDate = this.parseDateBR(dateStr);
        if (!birthDate) return 'N/A';
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        // 008: AJUSTE SE O ANIVERSARIO AINDA NAO OCORREU NO ANO CORRENTE
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    },

    // 009: MOTOR DE INFORMACOES GESTACIONAIS (IG, DPP E TRIMESTRE)
    getGestationalInfo(dumStr) {
        const dumDate = this.parseDateBR(dumStr);
        // 010: SE A DATA FOR INVALIDA OU FUTURA, RETORNA NULO
        if (!dumDate || dumDate > new Date()) return null;
        
        const diffDays = Math.floor((new Date() - dumDate) / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diffDays / 7);
        const days = diffDays % 7;
        
        // 011: CALCULO DA DPP (DATA PROVAVEL DO PARTO) - REGRA DE NAGAELE
        let dpp = new Date(dumDate);
        dpp.setDate(dpp.getDate() + 7);
        dpp.setMonth(dpp.getMonth() - 3);
        dpp.setFullYear(dpp.getFullYear() + 1);
        
        // 012: CLASSIFICACAO POR TRIMESTRE CONFORME PROTOCOLO
        let tri = weeks < 13 ? "1º TRIMESTRE" : (weeks < 27 ? "2º TRIMESTRE" : "3º TRIMESTRE");
        
        return { 
            res: `${weeks} SEMANAS E ${days} DIAS`, 
            dpp: dpp.toLocaleDateString('pt-BR'), 
            weeks, 
            tri 
        };
    },

    // 013: MOTOR DE VALIDACAO DE CPF (ALGORITMO OFICIAL)
    validateCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g, ''); // 014: REMOVE CARACTERES NAO NUMERICOS
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let add = 0;
        for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
        let rev = 11 - (add % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(cpf.charAt(9))) return false;
        add = 0;
        for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
        rev = 11 - (add % 11);
        if (rev === 10 || rev === 11) rev = 0;
        return rev === parseInt(cpf.charAt(10));
    },

    // 015: VALIDACAO DE CNS (CARTAO NACIONAL DE SAUDE)
    validateCNS(cns) {
        if (!cns || cns.length !== 15 || cns.match(/[^\d]/)) return false;
        let soma = 0;
        for (let i = 0; i < 15; i++) soma += parseInt(cns.charAt(i)) * (15 - i);
        return (soma % 11 === 0);
    },

    // 016: VERIFICADOR DE CAMPOS OBRIGATORIOS (MOTOR DE FLUIDEZ SOLICITADO)
    // 017: CAMPOS: NOME, DATA NASC, LOGRADOURO, NUMERO
    checkMandatoryFields(data) {
        const missing = [];
        if (!data.nome) missing.push("NOME COMPLETO");
        if (!data.nasc) missing.push("DATA DE NASCIMENTO");
        if (!data.rua) missing.push("LOGRADOURO (RUA)");
        if (!data.num) missing.push("NÚMERO");
        return { valid: missing.length === 0, missing };
    },

    // 018: GERENCIADOR DE MÁSCARAS DE ENTRADA (REGEX DINÂMICO)
    masks: {
        // 019: MASCARA DE DATA DD/MM/AAAA
        date: v => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 10),
        
        // 020: MASCARA DE CPF 000.000.000-00
        cpf: v => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14),
        
        // 021: MASCARA DE TELEFONE (00) 00000-0000
        phone: v => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15),
        
        // 022: MASCARA DE PRESSAO ARTERIAL 00/00
        pa: v => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5)
    },

    // 023: MODAL CUSTOMIZADO PARA ALERTAS E CONFIRMAÇÕES (SOLICITADO)
    CustomModals: {
        init() {
            if (document.getElementById('sys-modal-container')) return;
            // 024: INJECAO DINAMICA DO HTML DO MODAL NO BODY para nao depender de mudanca manual no HTML
            document.body.insertAdjacentHTML('beforeend', `
                <div id="sys-modal-container" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; align-items:center; justify-content:center;">
                    <div class="modal-content" style="background:white; padding:25px; border-radius:15px; max-width:90%; width:400px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                        <h3 id="sys-modal-title" style="color:var(--primary); margin-top:0;"></h3>
                        <div id="sys-modal-text" style="margin:20px 0; font-size:16px; line-height:1.5;"></div>
                        <div id="sys-modal-input-area" class="hidden">
                            <input type="text" id="sys-modal-input" placeholder="DIGITE AQUI..." style="width:100%; padding:10px; margin-bottom:15px;">
                        </div>
                        <div id="sys-modal-select-area" class="hidden">
                            <select id="sys-modal-select" style="width:100%; padding:10px; margin-bottom:15px;"></select>
                        </div>
                        <div style="display:flex; gap:10px; justify-content:flex-end;">
                            <button id="sys-modal-btn-cancel" class="btn btn-outline btn-sm" style="width:auto; padding:10px 20px;">CANCELAR</button>
                            <button id="sys-modal-btn-ok" class="btn btn-main btn-sm" style="width:auto; padding:10px 20px;">OK / CONFIRMAR</button>
                        </div>
                    </div>
                </div>`);
        },

        // 025: FUNCAO DE ALERTA SIMPLES
        alert: (m) => Utils.CustomModals.show("ATENÇÃO", m, 'alert'),

        // 026: FUNCAO DE CONFIRMACAO (SIM/NAO)
        confirm: (m) => Utils.CustomModals.show("CONFIRMAR AÇÃO", m, 'confirm'),

        // 027: PROMPT PARA ENTRADA DE TEXTO (USADO NO ARQUIVO DE PENDENCIAS)
        prompt: (m, def = '') => Utils.CustomModals.show("ENTRADA NECESSÁRIA", m, 'prompt', def),

        // 028: MODAL DE CONFLITO DE ENDERECO (ALERTA DE OSASCO)
        addressConflict: (title, text, options) => Utils.CustomModals.show(title, text, 'select', '', options),

        // 029: MOTOR INTERNO DO MODAL BASEADO EM PROMISES
        show(title, text, type = 'alert', def = '', options = []) {
            this.init();
            return new Promise(resolve => {
                const overlay = document.getElementById('sys-modal-container');
                const inputArea = document.getElementById('sys-modal-input-area');
                const selectArea = document.getElementById('sys-modal-select-area');
                const inputEl = document.getElementById('sys-modal-input');
                const selectEl = document.getElementById('sys-modal-select');
                const btnOk = document.getElementById('sys-modal-btn-ok');
                const btnCancel = document.getElementById('sys-modal-btn-cancel');

                document.getElementById('sys-modal-title').textContent = title;
                document.getElementById('sys-modal-text').innerHTML = text.replace(/\n/g, '<br>');
                
                // 030: CONFIGURACAO VISUAL CONFORME O TIPO DE MODAL
                inputEl.value = def;
                inputArea.classList.toggle('hidden', type !== 'prompt');
                selectArea.classList.toggle('hidden', type !== 'select');
                btnCancel.classList.toggle('hidden', type === 'alert');

                if (type === 'select') {
                    selectEl.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('') + `<option value="NOVO">CADASTRAR NOVO COMPLEMENTO...</option>`;
                }

                overlay.style.display = 'flex';

                const close = (res) => {
                    overlay.style.display = 'none';
                    resolve(res);
                };

                btnOk.onclick = () => {
                    if (type === 'prompt') return close(inputEl.value.toUpperCase());
                    if (type === 'select') return close(selectEl.value);
                    close(true);
                };
                btnCancel.onclick = () => close(false);
            });
        }
    }
};

// 031: GARANTIA DE INICIALIZACAO DOS MODAIS AO CARREGAR O SCRIPT
Utils.CustomModals.init();

// 032: ALERTA DE ANALISTA SENIOR: 
// 033: O CÁLCULO DE IDADE NA LINHA 007 DEVE SER CHAMADO NO EVENTO 'BLUR' DO CAMPO DATA DE NASCIMENTO.
// 034: ISTO GARANTIRA QUE O STATUS DE 'IDOSO' SEJA ATALIZADO ANTES DO SALVAMENTO.
