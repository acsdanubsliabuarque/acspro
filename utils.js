// 001: MODULO DE UTILITARIOS TÉCNICOS E MODAIS INTEGRADOS
// 002: CENTRALIZA MASCARAS, CALCULOS E INTERFACE DE DIALOGO
const Utils = {
    // 003: SANEAMENTO DE TEXTO
    sanitize(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = str.toString().toUpperCase().trim();
        return div.innerHTML;
    },

    // 004: CONVERSOR DE DATA
    parseDateBR(str) {
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return null;
        const [d, m, y] = str.split('/').map(Number);
        const date = new Date(y, m - 1, d);
        if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) return null;
        return date;
    },

    // 005: CALCULO DE IDADE
    calculateAge(dateStr) {
        const birthDate = this.parseDateBR(dateStr);
        if (!birthDate) return 'N/A';
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    },

    // 006: INFORMACAO GESTACIONAL
    getGestationalInfo(dumStr) {
        const dumDate = this.parseDateBR(dumStr);
        if (!dumDate || dumDate > new Date()) return null;
        const diffDays = Math.floor((new Date() - dumDate) / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diffDays / 7);
        const days = diffDays % 7;
        let dpp = new Date(dumDate);
        dpp.setDate(dpp.getDate() + 7); dpp.setMonth(dpp.getMonth() - 3); dpp.setFullYear(dpp.getFullYear() + 1);
        let tri = weeks < 13 ? "1º TRIMESTRE" : (weeks < 27 ? "2º TRIMESTRE" : "3º TRIMESTRE");
        return { res: `${weeks} SEMANAS E ${days} DIAS`, dpp: dpp.toLocaleDateString('pt-BR'), weeks, tri };
    },

    // 007: VALIDADOR DE CAMPOS OBRIGATORIOS
    checkMandatoryFields(data) {
        const missing = [];
        if (!data.nome) missing.push("NOME COMPLETO");
        if (!data.nasc || data.nasc.length < 10) missing.push("DATA DE NASCIMENTO (COMPLETA)");
        if (!data.rua) missing.push("LOGRADOURO (RUA)");
        if (!data.num) missing.push("NÚMERO");
        return { valid: missing.length === 0, missing };
    },

    // 008: MASCARAS DE ENTRADA
    masks: {
        date: v => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 10),
        cpf: v => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14),
        phone: v => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15),
        pa: v => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5)
    },

    // 009: INTERFACE DE MODAIS (CORRIGIDA PARA INTEGRACAO)
    CustomModals: {
        init() {
            if (document.getElementById('sys-modal-container')) return;
            document.body.insertAdjacentHTML('beforeend', `
                <div id="sys-modal-container" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; align-items:center; justify-content:center;">
                    <div class="modal-content" style="background:white; padding:25px; border-radius:15px; width:90%; max-width:400px;">
                        <h3 id="sys-modal-title" style="margin-top:0; color:#004a99"></h3>
                        <div id="sys-modal-text" style="margin:15px 0"></div>
                        <input type="text" id="sys-modal-input" class="hidden" style="width:100%; padding:10px; margin-bottom:10px">
                        <select id="sys-modal-select" class="hidden" style="width:100%; padding:10px; margin-bottom:10px"></select>
                        <div style="display:flex; gap:10px; justify-content:flex-end">
                            <button id="sys-modal-btn-cancel" class="btn-outline" style="padding:10px 20px; border-radius:8px">CANCELAR</button>
                            <button id="sys-modal-btn-ok" class="btn-main" style="padding:10px 20px; border-radius:8px; border:none; background:#004a99; color:white">OK</button>
                        </div>
                    </div>
                </div>`);
        },
        show(title, text, type = 'alert', def = '', options = []) {
            this.init();
            return new Promise(resolve => {
                const overlay = document.getElementById('sys-modal-container');
                const btnOk = document.getElementById('sys-modal-btn-ok');
                const btnCan = document.getElementById('sys-modal-btn-cancel');
                const input = document.getElementById('sys-modal-input');
                const select = document.getElementById('sys-modal-select');

                document.getElementById('sys-modal-title').textContent = title;
                document.getElementById('sys-modal-text').innerHTML = text.replace(/\n/g, '<br>');
                
                input.className = type === 'prompt' ? '' : 'hidden'; input.value = def;
                select.className = type === 'select' ? '' : 'hidden';
                if(type === 'select') select.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('') + '<option value="NOVO">CRIAR NOVO...</option>';
                btnCan.className = type === 'alert' ? 'hidden' : '';

                overlay.style.display = 'flex';
                const close = (res) => { overlay.style.display = 'none'; resolve(res); };
                btnOk.onclick = () => close(type === 'prompt' ? input.value.toUpperCase() : (type === 'select' ? select.value : true));
                btnCan.onclick = () => close(false);
            });
        },
        alert: (m) => Utils.CustomModals.show("AVISO", m),
        confirm: (m) => Utils.CustomModals.show("CONFIRMAR", m, 'confirm'),
        prompt: (m, d='') => Utils.CustomModals.show("ENTRADA", m, 'prompt', d),
        addressConflict: (t, txt, opt) => Utils.CustomModals.show(t, txt, 'select', '', opt)
    }
};
