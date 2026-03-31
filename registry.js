/* 001: MOTOR DE REGISTRO E TERRITORIO OSASCO */
window.Registry = {
    editingId: null,

    setStep(n) {
        document.querySelectorAll('[id^="passo-"]').forEach(d => d.classList.add('hidden'));
        document.getElementById(`passo-${n}`).classList.remove('hidden');
        window.scrollTo(0, 0);
    },

    /* 002: INICIALIZA CADASTRO LIMPO */
    startNew() {
        this.editingId = null;
        document.querySelectorAll('#tela-cadastro input, #tela-cadastro select').forEach(i => {
            if (i.type === 'checkbox') i.checked = false; else i.value = "";
        });
        document.getElementById('c-is-resp').value = "SIM";
        this.toggleRelacao(); this.toggleDum(); this.setStep(1);
        Nav.goTo('tela-cadastro');
    },

    /* 003: ATALHO DE NOVO DOMICILIO (DIRETRIZ 3) */
    startNewDomicilio() { this.startNew(); this.setStep(2); },

    toggleDum() { document.getElementById('div-gestante').classList.toggle('hidden', !document.getElementById('ch-gest').checked); },
    toggleRelacao() { document.getElementById('div-parentesco').classList.toggle('hidden', document.getElementById('c-is-resp').value === 'SIM'); },

    /* 004: TRAVA DE CONFLITO DE ENDERECO (PROTOCOLO OSASCO) */
    async checkAddressConflict() {
        const rua = document.getElementById('c-rua').value;
        const num = document.getElementById('c-num').value.trim();
        const comp = document.getElementById('c-comp');
        if (rua && num) {
            const existentes = await DB.getByIndex("municipes", "rua", rua);
            const filtrados = existentes.filter(p => p.num === num);
            const complementos = [...new Set(filtrados.map(p => p.comp || "CASA ÚNICA"))];
            
            if (complementos.length > 0 && (!comp.value || comp.value === "CASA ÚNICA")) {
                const esc = await Utils.CustomModals.addressConflict("UNIDADE HABITACIONAL", "ESTE ENDEREÇO JÁ POSSUI MORADORES. SELECIONE O COMPLEMENTO:", complementos);
                if (esc === "NOVO") { comp.value = ""; comp.focus(); }
                else if (esc) { comp.value = esc; }
            } else if (complementos.length === 0 && !comp.value) {
                comp.value = "CASA ÚNICA";
            }
        }
    },

    /* 005: EDICAO DE CADASTRADOS */
    async prepareEdit(id) {
        const p = await DB.get("municipes", id);
        this.editingId = p.id;
        document.getElementById('c-nome').value = p.nome;
        document.getElementById('c-nasc').value = p.nasc;
        document.getElementById('c-nome-social').value = p.nomeSocial || "";
        document.getElementById('c-cpf').value = p.cpf || "";
        document.getElementById('c-rua').value = p.rua;
        document.getElementById('c-num').value = p.num;
        document.getElementById('c-comp').value = p.comp;
        document.getElementById('ch-hiper').checked = p.hiper;
        document.getElementById('ch-diab').checked = p.diab;
        document.getElementById('ch-gest').checked = p.gest;
        document.getElementById('c-dum').value = p.dum || "";
        document.getElementById('ch-mental').checked = p.saudeMental;
        this.toggleDum(); this.setStep(1); Nav.goTo('tela-cadastro');
    },

    /* 006: SALVAMENTO COM INTEGRIDADE DE RESPONSAVEL */
    async save() {
        const d = {
            nome: Utils.sanitize(document.getElementById('c-nome').value),
            nasc: document.getElementById('c-nasc').value,
            nomeSocial: Utils.sanitize(document.getElementById('c-nome-social').value),
            cpf: document.getElementById('c-cpf').value,
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
        if (this.editingId) d.id = this.editingId;
        
        const v = Utils.checkMandatoryFields(d);
        if (!v.valid) return Utils.CustomModals.alert("CAMPOS OBRIGATÓRIOS: " + v.missing.join(", "));
        
        await DB.put("municipes", d);
        await Utils.CustomModals.alert("CIDADÃO GRAVADO COM SUCESSO!");
        Nav.goTo('tela-home', true);
    }
};
