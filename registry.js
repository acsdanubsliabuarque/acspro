/* 001: MOTOR DE CADASTRO INDIVIDUAL E TERRITORIAL */
window.Registry = {
    editingId: null,

    /* 002: ATALHO PARA NOVO DOMICILIO (DIRETO PARA ABA ENDERECO) */
    startNewDomicilio() {
        this.startNew();
        this.setStep(2); // Pula identificacao
    },

    /* 003: INICIALIZA FORMULARIO LIMPO */
    startNew() {
        this.editingId = null;
        document.querySelectorAll('#tela-cadastro input, #tela-cadastro select, #tela-cadastro textarea').forEach(i => {
            if (i.type === 'checkbox') i.checked = false;
            else i.value = "";
        });
        document.getElementById('c-is-resp').value = "SIM";
        this.toggleRelacao();
        this.toggleDum();
        this.setStep(1);
        Nav.goTo('tela-cadastro');
    },

    /* 004: LOGICA DE CONFLITO HABITACIONAL DE OSASCO (RUA+NUM+COMP) */
    async checkAddressConflict() {
        const rua = document.getElementById('c-rua').value;
        const num = document.getElementById('c-num').value.trim();
        const compInput = document.getElementById('c-comp');

        if (rua && num) {
            const existentes = await DB.findAddressComplements(rua, num);
            if (existentes.length > 0 && (!compInput.value || compInput.value === "CASA ÚNICA")) {
                const escolha = await Utils.CustomModals.addressConflict("CONFLITO DE ENDEREÇO", "ESCOLHA O COMPLEMENTO EXISTENTE OU CRIE UM NOVO:", existentes);
                if (escolha === "NOVO") { compInput.value = ""; compInput.focus(); }
                else if (escolha) { compInput.value = escolha; }
            } else if (existentes.length === 0 && !compInput.value) {
                compInput.value = "CASA ÚNICA"; // INJECAO AUTOMATICA (DIRETRIZ 7)
            }
        }
    },

    /* 005: PERSISTENCIA COM INTEGRIDADE FAMILIAR */
    async save() {
        const data = {
            nome: document.getElementById('c-nome').value,
            nasc: document.getElementById('c-nasc').value,
            nomeSocial: document.getElementById('c-nome-social').value,
            cpf: document.getElementById('c-cpf').value,
            rua: document.getElementById('c-rua').value,
            num: document.getElementById('c-num').value,
            comp: document.getElementById('c-comp').value || "CASA ÚNICA",
            isResp: document.getElementById('c-is-resp').value,
            relacao: document.getElementById('c-relacao').value,
            gest: document.getElementById('ch-gest').checked,
            dum: document.getElementById('c-dum').value,
            hiper: document.getElementById('ch-hiper').checked,
            diab: document.getElementById('ch-diab').checked,
            saudeMental: document.getElementById('ch-mental').checked,
            acamado: document.getElementById('ch-acamado').checked,
            obs: document.getElementById('c-obs').value,
            respId: null 
        };

        if (this.editingId) data.id = this.editingId;

        /* 006: VALIDACAO DE CAMPOS BLOQUEANTES */
        const v = Utils.checkMandatoryFields(data);
        if (!v.valid) return Utils.CustomModals.alert("CAMPOS OBRIGATÓRIOS: " + v.missing.join(", "));

        try {
            /* 007: VINCULO AUTOMATICO DE DEPENDENTES */
            if (data.isResp === 'NAO') {
                const moradores = await DB.getByIndex("municipes", "enderecoChave", [data.rua, data.num, data.comp]);
                const chefe = moradores.find(m => m.isResp === 'SIM');
                if (chefe) data.respId = chefe.id;
            }

            await DB.put("municipes", data);
            await Utils.CustomModals.alert("DADOS GRAVADOS COM SUCESSO!");
            Nav.goTo('tela-home', true);
        } catch (e) { Utils.CustomModals.alert("ERRO NA GRAVAÇÃO: " + e.message); }
    }
    // ... (Manter setStep, toggleDum, toggleRelacao e prepareEdit originais)
};
