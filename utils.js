const Utils = {
    sanitize(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    parseDateBR(str) {
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return null;
        const [d, m, y] = str.split('/').map(Number);
        const date = new Date(y, m - 1, d);
        if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) return null;
        return date;
    },
    calculateAge(dateStr) {
        const birthDate = this.parseDateBR(dateStr);
        if (!birthDate) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    },
    getGestationalInfo(dumStr) {
        const dumDate = this.parseDateBR(dumStr);
        if (!dumDate || dumDate > new Date()) return null;
        const diffDays = Math.floor((new Date() - dumDate) / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diffDays / 7);
        const days = diffDays % 7;
        let dpp = new Date(dumDate);
        dpp.setDate(dpp.getDate() + 7);
        dpp.setMonth(dpp.getMonth() - 3);
        dpp.setFullYear(dpp.getFullYear() + 1);
        let tri = weeks < 13 ? "1º TRIMESTRE" : (weeks < 27 ? "2º TRIMESTRE" : "3º TRIMESTRE");
        return { res: `${weeks} SEMANAS E ${days} DIAS`, dpp: dpp.toLocaleDateString('pt-BR'), weeks, tri };
    },
    isValidDateRange(dateStr) {
        const parsed = this.parseDateBR(dateStr);
        if (!parsed) return false;
        return parsed <= new Date() && this.calculateAge(dateStr) < 130;
    },
    validateCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g, '');
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
    validateCNS(cns) {
        if (!cns || cns.length !== 15 || cns.match(/[^\d]/)) return false;
        let soma = 0;
        for (let i = 0; i < 15; i++) soma += parseInt(cns.charAt(i)) * (15 - i);
        return (soma % 11 === 0);
    },
    validateCPFInterface() {
        const input = document.getElementById('c-cpf');
        const error = document.getElementById('input-cpf-error');
        if (input.value.length > 0 && !this.validateCPF(input.value)) { error.style.display = 'block'; return false; }
        error.style.display = 'none'; return true;
    },
    validateCNSInterface() {
        const input = document.getElementById('c-cns');
        const error = document.getElementById('input-cns-error');
        if (input.value.length > 0 && !this.validateCNS(input.value)) { error.style.display = 'block'; return false; }
        error.style.display = 'none'; return true;
    },
    masks: {
        date: v => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 10),
        cpf: v => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14),
        phone: v => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15)
    }
};

const CustomModals = {
    init() {
        if (document.getElementById('sys-modal-container')) return;
        document.body.insertAdjacentHTML('beforeend', `
            <div id="sys-modal-container" class="modal-overlay">
                <div class="modal-content">
                    <h3 id="sys-modal-title" class="modal-title"></h3>
                    <div id="sys-modal-text" class="modal-text"></div>
                    <input type="text" id="sys-modal-input" class="modal-input hidden">
                    <div class="modal-actions">
                        <button id="sys-modal-btn-cancel" class="btn btn-outline modal-btn hidden">CANCELAR</button>
                        <button id="sys-modal-btn-ok" class="btn btn-main modal-btn">OK</button>
                    </div>
                </div>
            </div>`);
    },
    show(title, text, type = 'alert', def = '') {
        return new Promise(resolve => {
            const overlay = document.getElementById('sys-modal-container');
            document.getElementById('sys-modal-title').textContent = title;
            document.getElementById('sys-modal-text').innerHTML = Utils.sanitize(text).replace(/\n/g, '<br>');
            const inputEl = document.getElementById('sys-modal-input');
            const btnOk = document.getElementById('sys-modal-btn-ok');
            const btnCancel = document.getElementById('sys-modal-btn-cancel');
            inputEl.value = def;
            inputEl.classList.toggle('hidden', type !== 'prompt');
            btnCancel.classList.toggle('hidden', type === 'alert');
            const close = (res) => { overlay.classList.remove('active'); resolve(res); };
            btnOk.onclick = () => close(type === 'prompt' ? inputEl.value : true);
            btnCancel.onclick = () => close(false);
            overlay.classList.add('active');
        });
    },
    alert: (m) => CustomModals.show("AVISO", m),
    confirm: (m) => CustomModals.show("CONFIRMAÇÃO", m, 'confirm'),
    prompt: (m, d = '') => CustomModals.show("ENTRADA OBRIGATÓRIA", m, 'prompt', d)
};
