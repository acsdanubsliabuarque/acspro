/* ==========================================================================
   002: MÓDULO DE UTILITÁRIOS, MÁSCARAS E INTERFACE MODAL
   DOCUMENTAÇÃO: CENTRALIZA A LÓGICA DE CÁLCULO EPIDEMIOLÓGICO E UI
   ESTE ARQUIVO É OBRIGATÓRIO PARA O FUNCIONAMENTO DO REGISTRY E VISITS
   ========================================================================== */

window.Utils = {

    /* 001: SANEAMENTO DE TEXTO E PADRÃO SCREAMING CAPS (DIRETRIZ 1) */
    sanitize(str) {
        if (str === null || str === undefined) return "";
        return str.toString().toUpperCase().trim();
    },

    /* 002: MOTOR DE MÁSCARAS DINÂMICAS (SISAB COMPLIANT) */
    masks: {
        // Formato DD/MM/AAAA
        date: (v) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 10),
        
        // Formato 000.000.000-00
        cpf: (v) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14),
        
        // CNS possui 15 dígitos numéricos
        cns: (v) => v.replace(/\D/g, '').slice(0, 15),
        
        // Formato (00) 00000-0000
        phone: (v) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15),
        
        // Pressão Arterial (Ex: 120/80)
        pa: (v) => v.replace(/\D/g, '').replace(/(\d{2,3})(\d{2})/, '$1/$2').slice(0, 7),
        
        // Glicemia Capilar (HGT) - Apenas números
        hgt: (v) => v.replace(/\D/g, '').slice(0, 3)
    },

    /* 003: MOTOR DE CÁLCULO DE IDADE (DIRETRIZ 4) */
    calculateAge(dateStr) {
        if (!dateStr || dateStr.length < 10) return 0;
        const parts = dateStr.split('/');
        const birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
        const today = new Date();
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : 0;
    },

    /* 004: MOTOR DE NAGAELE - LÓGICA GESTACIONAL (DIRETRIZ 6) */
    getGestationalInfo(dumStr) {
        if (!dumStr || dumStr.length < 10) return null;
        
        const parts = dumStr.split('/');
        const dumDate = new Date(parts[2], parts[1] - 1, parts[0]);
        const today = new Date();
        
        // Diferença em milissegundos convertida para dias
        const diffTime = Math.abs(today - dumDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const weeks = Math.floor(diffDays / 7);
        const days = diffDays % 7;
        
        // Cálculo da DPP (Data Provável do Parto): DUM + 7 dias - 3 meses + 1 ano
        let dppDate = new Date(dumDate);
        dppDate.setDate(dppDate.getDate() + 7);
        dppDate.setMonth(dppDate.getMonth() - 3);
        dppDate.setFullYear(dppDate.getFullYear() + 1);
        
        let trimestre = "1º TRIMESTRE";
        if (weeks >= 14 && weeks < 27) trimestre = "2º TRIMESTRE";
        if (weeks >= 27) trimestre = "3º TRIMESTRE";

        return {
            semanas: weeks,
            dias: days,
            resultadoFormatado: `${weeks} SEMANAS E ${days} DIAS`,
            dpp: dppDate.toLocaleDateString('pt-BR'),
            tri: trimestre
        };
    },

    /* 005: VALIDADOR DE CAMPOS BLOQUEANTES (DIRETRIZ 4) */
    checkMandatoryFields(data) {
        const missing = [];
        if (!data.nome) missing.push("NOME COMPLETO");
        if (!data.nasc || data.nasc.length < 10) missing.push("DATA DE NASCIMENTO");
        if (!data.rua) missing.push("LOGRADOURO");
        if (!data.num) missing.push("NÚMERO");
        if (!data.cpf) missing.push("CPF");
        
        return {
            valid: missing.length === 0,
            missing: missing
        };
    },

    /* 006: MOTOR DE INTERFACE MODAL CUSTOMIZADO (VINCULADO AO OBJETO GLOBAL) */
    CustomModals: {
        /* 007: MÉTODO PRIVADO DE CONSTRUÇÃO DE OVERLAY */
        _createOverlay() {
            const existing = document.getElementById('sys-modal-overlay');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'sys-modal-overlay';
            overlay.className = 'modal-overlay'; // ESTILO DEFINIDO NO STYLE.CSS
            document.body.appendChild(overlay);
            return overlay;
        },

        /* 008: ALERTA TÉCNICO */
        alert(message) {
            return new Promise(resolve => {
                const ov = this._createOverlay();
                ov.innerHTML = `
                    <div class="modal-content">
                        <h3 style="color:var(--primary)">AVISO DO SISTEMA</h3>
                        <div style="margin: 20px 0; font-weight: bold;">${message}</div>
                        <button class="btn btn-main" id="modal-close-btn">ENTENDIDO</button>
                    </div>`;
                document.getElementById('modal-close-btn').onclick = () => { ov.remove(); resolve(); };
            });
        },

        /* 009: CONFIRMAÇÃO DE SAÍDA OU EXCLUSÃO */
        confirm(message) {
            return new Promise(resolve => {
                const ov = this._createOverlay();
                ov.innerHTML = `
                    <div class="modal-content">
                        <h3 style="color:var(--danger)">CONFIRMAÇÃO NECESSÁRIA</h3>
                        <div style="margin: 20px 0;">${message}</div>
                        <div class="grid-2">
                            <button class="btn btn-outline" id="modal-no">NÃO</button>
                            <button class="btn btn-main" id="modal-yes" style="background:var(--danger)">SIM, CONTINUAR</button>
                        </div>
                    </div>`;
                document.getElementById('modal-no').onclick = () => { ov.remove(); resolve(false); };
                document.getElementById('modal-yes').onclick = () => { ov.remove(); resolve(true); };
            });
        },

        /* 010: MOTOR DE CONFLITO HABITACIONAL (DIRETRIZ 3) */
        addressConflict(rua, num, complementos) {
            return new Promise(resolve => {
                const ov = this._createOverlay();
                let optionsHtml = complementos.map(c => `<button class="btn btn-outline opt-addr" data-val="${c}">${c}</button>`).join('');
                
                ov.innerHTML = `
                    <div class="modal-content" style="max-width: 500px;">
                        <h3 style="color:var(--warning)">CONFLITO DE UNIDADE HABITACIONAL</h3>
                        <p>O ENDEREÇO <b>${rua}, ${num}</b> JÁ POSSUI AS SEGUINTES CASAS CADASTRADAS:</p>
                        <div style="max-height: 200px; overflow-y: auto; margin-bottom: 15px;">
                            ${optionsHtml}
                        </div>
                        <p>OU DESEJA CADASTRAR UMA NOVA UNIDADE NESTE NÚMERO?</p>
                        <button class="btn btn-main" id="modal-new-addr">CADASTRAR NOVO COMPLEMENTO</button>
                        <button class="btn btn-sm btn-outline" id="modal-cancel-addr" style="margin-top:10px">CANCELAR OPERAÇÃO</button>
                    </div>`;

                // Selecionar existente
                ov.querySelectorAll('.opt-addr').forEach(btn => {
                    btn.onclick = () => { ov.remove(); resolve(btn.getAttribute('data-val')); };
                });

                // Criar novo
                document.getElementById('modal-new-addr').onclick = () => { ov.remove(); resolve("NEW"); };
                
                // Cancelar
                document.getElementById('modal-cancel-addr').onclick = () => { ov.remove(); resolve(null); };
            });
        },

        /* 011: PROMPT PARA RESOLUÇÃO DE PENDÊNCIAS (DIRETRIZ 8) */
        prompt(title, label) {
            return new Promise(resolve => {
                const ov = this._createOverlay();
                ov.innerHTML = `
                    <div class="modal-content">
                        <h3 style="color:var(--primary)">${title}</h3>
                        <label>${label}</label>
                        <textarea id="modal-input-text" rows="4" style="width:100%; margin-top:10px;"></textarea>
                        <div class="grid-2" style="margin-top:15px;">
                            <button class="btn btn-outline" id="modal-cancel">CANCELAR</button>
                            <button class="btn btn-main" id="modal-save">GRAVAR INFORMAÇÃO</button>
                        </div>
                    </div>`;
                
                document.getElementById('modal-cancel').onclick = () => { ov.remove(); resolve(null); };
                document.getElementById('modal-save').onclick = () => { 
                    const val = document.getElementById('modal-input-text').value;
                    ov.remove(); 
                    resolve(val.toUpperCase().trim()); 
                };
            });
        }
    }
};
