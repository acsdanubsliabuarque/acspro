/* 001: MOTOR DE UTILITARIOS ACS PRO */
window.Utils = {
    sanitize: (s) => s ? s.toString().toUpperCase().trim() : "",
    
    /* 002: MASCARAS DE ENTRADA CONFORME DIRETRIZ 1 */
    masks: {
        date: (v) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 10),
        cpf: (v) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14),
        phone: (v) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15),
        pa: (v) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5)
    },

    /* 003: MOTOR DE CALCULO DE IDADE EM TEMPO REAL */
    calculateAge(dob) {
        if (!dob || dob.length < 10) return 0;
        const [d, m, y] = dob.split('/').map(Number);
        const b = new Date(y, m - 1, d);
        const t = new Date();
        let a = t.getFullYear() - b.getFullYear();
        if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
        return a;
    },

    /* 004: MOTOR DE NAGAELE (DIRETRIZ 6) */
    getGestationalInfo(dum) {
        if (!dum || dum.length < 10) return null;
        const [d, m, y] = dum.split('/').map(Number);
        const dumDate = new Date(y, m - 1, d);
        const diff = Math.floor((new Date() - dumDate) / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diff / 7);
        const days = diff % 7;
        let dpp = new Date(dumDate); dpp.setDate(dpp.getDate() + 7); dpp.setMonth(dpp.getMonth() - 3); dpp.setFullYear(dpp.getFullYear() + 1);
        return { res: `${weeks} SEMANAS E ${days} DIAS`, dpp: dpp.toLocaleDateString('pt-BR'), tri: weeks < 13 ? "1º TRIMESTRE" : (weeks < 27 ? "2º TRIMESTRE" : "3º TRIMESTRE") };
    },

    /* 005: MOTOR DE INTERFACE MODAL CUSTOMIZADO */
    CustomModals: {
        async show(t, txt, type = 'alert', options = []) {
            return new Promise(resolve => {
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay';
                overlay.innerHTML = `
                    <div class="modal-content">
                        <h3>${t}</h3>
                        <p>${txt.replace(/\n/g, '<br>')}</p>
                        ${type === 'prompt' ? '<input type="text" id="m-input" style="margin-bottom:15px">' : ''}
                        ${type === 'select' ? `<select id="m-select" style="margin-bottom:15px">${options.map(o => `<option value="${o}">${o}</option>`).join('')}<option value="NOVO">CADASTRAR NOVO COMPLEMENTO...</option></select>` : ''}
                        <div style="display:flex; gap:10px; justify-content:flex-end">
                            ${type !== 'alert' ? '<button id="m-cancel" class="btn-outline" style="width:auto; padding:10px 20px">CANCELAR</button>' : ''}
                            <button id="m-ok" class="btn-main" style="width:auto; padding:10px 20px">CONFIRMAR</button>
                        </div>
                    </div>`;
                document.body.appendChild(overlay);
                const btnOk = document.getElementById('m-ok');
                const btnCan = document.getElementById('m-cancel');
                btnOk.onclick = () => {
                    let val = true;
                    if (type === 'prompt') val = document.getElementById('m-input').value.toUpperCase();
                    if (type === 'select') val = document.getElementById('m-select').value;
                    overlay.remove(); resolve(val);
                };
                if (btnCan) btnCan.onclick = () => { overlay.remove(); resolve(null); };
            });
        },
        alert: (m) => Utils.CustomModals.show("SISTEMA", m, 'alert'),
        confirm: (m) => Utils.CustomModals.show("CONFIRMAR", m, 'confirm'),
        prompt: (m) => Utils.CustomModals.show("ENTRADA", m, 'prompt'),
        addressConflict: (t, txt, opt) => Utils.CustomModals.show(t, txt, 'select', opt)
    }
};
