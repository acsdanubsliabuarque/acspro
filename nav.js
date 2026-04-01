const Nav = {
    init() {
        const selects = document.querySelectorAll('.select-ruas');
        const opts = `<option value="">SELECIONE...</option>` + CONFIG.RUAS.map(r => `<option value="${r}">${r}</option>`).join('');
        selects.forEach(s => s.innerHTML = opts);
        document.addEventListener('input', e => {
            const el = e.target;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = el.value.toUpperCase();
            if (['c-nasc', 'c-dum', 'b-resp-nasc'].includes(el.id)) el.value = Utils.masks.date(el.value);
            if (el.id === 'c-cpf') el.value = Utils.masks.cpf(el.value);
            if (el.classList.contains('tel')) el.value = Utils.masks.phone(el.value);
        });
    },
    goTo(id, reset = false) {
        if (reset) AppState.history = ['tela-home'];
        else if (AppState.history[AppState.history.length - 1] !== id) AppState.history.push(id);
        document.querySelectorAll('.container > div').forEach(d => d.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        window.scrollTo(0, 0);
    },
    goBack() {
        if (AppState.history.length > 1) {
            AppState.history.pop();
            const prev = AppState.history[AppState.history.length - 1];
            document.querySelectorAll('.container > div').forEach(d => d.classList.add('hidden'));
            document.getElementById(prev).classList.remove('hidden');
        } else this.goTo('tela-home', true);
    },
    async confirmExit(dest, param = null) {
        if (AppState.unsavedChanges) {
            if (!await CustomModals.confirm("DADOS NÃO SALVOS! SAIR MESMO ASSIM?")) return;
        }
        AppState.resetUnsaved();
        if (dest === 'voltar') this.goBack();
        else if (dest === 'pendencias') Visits.viewPendencies();
        else if (dest === 'tela-historico') Visits.viewHistory(param);
        else this.goTo(dest, true);
    }
};
