// 010: GESTAO DE CADASTROS (REGISTRY)
const Registry = {
    setStep(n) {
        document.querySelectorAll('[id^="passo-"]').forEach(d => d.classList.add('hidden'));
        document.getElementById(`passo-${n}`).classList.remove('hidden');
        window.scrollTo(0,0);
    },
    toggleDum() { document.getElementById('div-gestante').classList.toggle('hidden', !document.getElementById('ch-gest').checked); },
    toggleRelacao() { document.getElementById('div-parentesco').classList.toggle('hidden', document.getElementById('c-is-resp').value === 'SIM'); },
    
    // 011: VALIDADOR DE ENDERECO (OSASCO)
    async checkAddressConflict() {
        const rua = document.getElementById('c-rua').value;
        const num = document.getElementById('c-num').value.trim();
        const comp = document.getElementById('c-comp');
        if (rua && num) {
            const existentes = await DB.findAddressComplements(rua, num);
            if (existentes.length > 0 && (!comp.value || comp.value === "CASA ÚNICA")) {
                const res = await Utils.CustomModals.addressConflict("CONFLITO", "QUAL O COMPLEMENTO?", existentes);
                if (res === "NOVO") { comp.value = ""; comp.focus(); }
                else if (res) comp.value = res;
            } else if (existentes.length === 0 && !comp.value) { comp.value = "CASA ÚNICA"; }
        }
    },

    startNew() {
        AppState.resetPatient(); Nav.goTo('tela-cadastro');
        document.querySelectorAll('#tela-cadastro input, #tela-cadastro select').forEach(i => { if(i.type==='checkbox') i.checked=false; else i.value=""; });
        document.getElementById('c-is-resp').value = "SIM"; this.toggleRelacao(); this.toggleDum(); this.setStep(1);
    },

    // 012: FUNCAO PARA CADASTRO RAPIDO DE NOVO DOMICILIO
    startNewDomicilio() {
        this.startNew();
        this.setStep(2); // Pula direto para o endereco
    },

    async save() {
        const data = {
            nome: document.getElementById('c-nome').value.toUpperCase(),
            nasc: document.getElementById('c-nasc').value,
            rua: document.getElementById('c-rua').value,
            num: document.getElementById('c-num').value,
            comp: document.getElementById('c-comp').value || "CASA ÚNICA",
            isResp: document.getElementById('c-is-resp').value,
            relacao: document.getElementById('c-relacao').value,
            hiper: document.getElementById('ch-hiper').checked,
            diab: document.getElementById('ch-diab').checked,
            gest: document.getElementById('ch-gest').checked,
            dum: document.getElementById('c-dum').value,
            saudeMental: document.getElementById('ch-mental').checked,
            idoso: (Utils.calculateAge(document.getElementById('c-nasc').value) >= 60)
        };

        const v = Utils.checkMandatoryFields(data);
        if(!v.valid) return Utils.CustomModals.alert("FALTA: " + v.missing.join(", "));

        try {
            await DB.put("municipes", data);
            await Utils.CustomModals.alert("GRAVADO!");
            Nav.goTo('tela-home', true);
        } catch(e) { Utils.CustomModals.alert("ERRO: " + e.message); }
    }
};
