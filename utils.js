/**
 * 003: MÓDULO DE UTILITÁRIOS E INTERFACE DE DIÁLOGO
 * SISTEMA: ACS PRO V12.2 - OSASCO FIELD SYSTEM
 * 
 * Centraliza cálculos de saúde, máscaras de entrada e janelas modais.
 */

window.Utils = {
    // 001: LIMPEZA E FORMATAÇÃO DE TEXTO
    sanitize(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = str.toString().toUpperCase().trim();
        return div.innerHTML;
    },

    // 002: CONVERSOR DE DATA (BR -> DATE OBJECT)
    parseDateBR(str) {
        if (!str || !/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return null;
        const [d, m, y] = str.split('/').map(Number);
        const date = new Date(y, m - 1, d);
        // Valida se a data é real (ex: evita 31/02)
        if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) return null;
        return date;
    },

    // 003: CÁLCULO DINÂMICO DE IDADE
    calculateAge(dateStr) {
        const birthDate = this.parseDateBR(dateStr);
        if (!birthDate) return 'N/A';
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    },

    // 004: MOTOR GESTACIONAL (Semanas, Trimestre e DPP)
    getGestationalInfo(dumStr) {
        const dumDate = this.parseDateBR(dumStr);
        if (!dumDate || dumDate > new Date()) return null;

        const diffTime = Math.abs(new Date() - dumDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diffDays / 7);
        const days = diffDays % 7;

        // Regra de Naegele para DPP: +7 dias, -3 meses, +1 ano
        let dpp = new Date(dumDate);
        dpp.setDate(dpp.getDate() + 7);
        dpp.setMonth(dpp.getMonth() - 3);
        if (dpp.getMonth() > dumDate.getMonth()) dpp.setFullYear(dpp.getFullYear());
        else dpp.setFullYear(dpp.getFullYear() + 1);

        let tri = "1º TRIMESTRE";
        if (weeks >= 13 && weeks < 27) tri = "2º TRIMESTRE";
        if (weeks >= 27) tri = "3º TRIMESTRE";

        return { 
            res: `${weeks} SEMANAS E ${days} DIAS`, 
            dpp: dpp.toLocaleDateString('pt-BR'), 
            weeks, 
            tri 
        };
    },

    // 005: VALIDADOR DE CAMPOS OBRIGATÓRIOS NO CADASTRO
    checkMandatoryFields(data) {
        const missing = [];
        if (!data.nome) missing.push("NOME COMPLETO");
        if (!data.nasc || data.nasc.length < 10) missing.push("DATA NASCIMENTO");
        if (!data.rua) missing.push("LOGRADOURO");
        if (!data.num) missing.push("NÚMERO");
        if (!data.cpf || data.cpf.length < 14) missing.push("CPF");
        return { valid: missing.length === 0, missing };
    },

    // 006: MÁSCARAS DE ENTRADA (REGEX)
    masks: {
        date: v => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 10),
        cpf: v => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14),
        phone: v => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15),
        pa: v => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5) // Ex: 12/08
    },

    // 007: SISTEMA DE MODAIS CUSTOMIZADOS (UI)
    CustomModals: {
        init() {
            if (document.getElementById('sys-modal-container')) return;
            document.body.insertAdjacentHTML('beforeend', `
                <div id="sys-modal-container" class="modal-overlay" style="display:none;">
                    <div class="modal-content">
                        <h3 id="sys-modal-title" style="margin-top:0; color:var(--primary)"></h3>
                        <div id="sys-modal-text" style="margin:15px 0; font-size:14px; line-height:1.4;"></div>
                        <input type="text" id="sys-modal-input" class="hidden" style="margin-bottom:15px;">
                        <select id="sys-modal-select" class="hidden" style="margin-bottom:15px;"></select>
                        <div style="display:flex; gap:10px; justify-content:flex-end">
                            <button id="sys-modal-btn-cancel" class="btn-outline" style="width:auto; padding:10px 20px;">CANCELAR</button>
                            <button id="sys-modal-btn-ok" class="btn-main" style="width:auto; padding:10px 20px;">OK</button>
                        </div>
                    </div>
                </div>`);
        },

        async show(title, text, type = 'alert', defValue = '', options = []) {
            this.init();
            return new Promise(resolve => {
                const overlay = document.getElementById('sys-modal-container');
                const btnOk = document.getElementById('sys-modal-btn-ok');
                const btnCan = document.getElementById('sys-modal-btn-cancel');
                const input = document.getElementById('sys-modal-input');
                const select = document.getElementById('sys-modal-select');

                document.getElementById('sys-modal-title').textContent = title;
                document.getElementById('sys-modal-text').innerHTML = text.replace(/\n/g, '<br>');
                
                // Configura visibilidade dos componentes baseada no tipo de modal
                input.className = type === 'prompt' ? '' : 'hidden'; 
                input.value = defValue;
                
                select.className = type === 'select' ? '' : 'hidden';
                if(type === 'select') {
                    select.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('') + 
                                      '<option value="NOVO">--- CRIAR NOVO COMPLEMENTO ---</option>';
                }

                btnCan.className = type === 'alert' ? 'hidden' : 'btn-outline';

                overlay.style.display = 'flex';

                const close = (val) => {
                    overlay.style.display = 'none';
                    resolve(val);
                };

                btnOk.onclick = () => {
                    if (type === 'prompt') close(input.value ? input.value.toUpperCase() : "");
                    else if (type === 'select') close(select.value);
                    else close(true);
                };

                btnCan.onclick = () => close(false);
            });
        },

        alert: (m) => Utils.CustomModals.show("AVISO", m, 'alert'),
        confirm: (m) => Utils.CustomModals.show("CONFIRMAR", m, 'confirm'),
        prompt: (m, d='') => Utils.CustomModals.show("DIGITE", m, 'prompt', d),
        addressConflict: (t, txt, opt) => Utils.CustomModals.show(t, txt, 'select', '', opt)
    }
};
