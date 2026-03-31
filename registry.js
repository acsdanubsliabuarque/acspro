/* ==========================================================================
   004: MÓDULO DE REGISTRO, DOMICÍLIO E INTEGRIDADE FAMILIAR
   DOCUMENTAÇÃO: GESTÃO TÉCNICA DE CADASTROS INDIVIDUAIS E TERRITORIAIS
   ESTE ARQUIVO IMPLEMENTA A DENSIDADE TOTAL DE CAMPOS SISAB/E-SUS
   ========================================================================== */

window.Registry = {
    
    /* 001: VARIAVEL DE CONTROLE PARA MODO EDICAO */
    editingId: null,

    /* 002: MOTOR DE NAVEGACAO INTERNA DO FORMULARIO (PASSOS 1, 2 E 3) */
    setStep(n) {
        // ESCONDE TODOS OS PASSOS
        document.querySelectorAll('[id^="passo-"]').forEach(div => div.classList.add('hidden'));
        // EXIBE O PASSO SOLICITADO
        const target = document.getElementById(`passo-${n}`);
        if (target) {
            target.classList.remove('hidden');
            window.scrollTo(0, 0); // RETORNA AO TOPO PARA FACILITAR DIGITACAO
        }
    },

    /* 003: EXIBICAO CONDICIONAL DE CAMPOS GESTACIONAIS */
    toggleDum() {
        const isGestante = document.getElementById('ch-gest').checked;
        const divGest = document.getElementById('div-gestante');
        divGest.classList.toggle('hidden', !isGestante);
    },

    /* 004: EXIBICAO CONDICIONAL DE CAMPOS DE PARENTESCO */
    toggleRelacao() {
        const statusResp = document.getElementById('c-is-resp').value;
        const divParentesco = document.getElementById('div-parentesco');
        // SE FOR RESPONSAVEL (SIM), ESCONDE O CAMPO DE RELACAO COM O CHEFE
        divParentesco.classList.toggle('hidden', statusResp === 'SIM');
    },

    /* 005: MOTOR DE CADASTRO INDIVIDUAL - INICIALIZACAO LIMPA */
    startNew() {
        this.editingId = null;
        AppState.resetPatient();
        
        // RESET DE TODOS OS CAMPOS DE INPUT, SELECT E TEXTAREA
        const form = document.getElementById('tela-cadastro');
        form.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.type === 'checkbox') el.checked = false;
            else el.value = "";
        });

        // VALORES PADRAO e-SUS
        document.getElementById('c-is-resp').value = "SIM";
        document.getElementById('c-raca').value = "PARDA";
        document.getElementById('c-nacionalidade').value = "BRASILEIRA";

        this.toggleRelacao();
        this.toggleDum();
        this.setStep(1);
        Nav.goTo('tela-cadastro');
    },

    /* 006: ATALHO PARA CADASTRO DOMICILIAR (DIRETRIZ 3) */
    startNewDomicilio() {
        this.startNew();
        this.setStep(2); // PULA DIRETO PARA A ABA DE ENDERECO E MORADIA
    },

    /* 007: LOGICA DE CONFLITO HABITACIONAL (PROTOCOLO OSASCO - DIRETRIZ 3) */
    async checkAddressConflict() {
        const rua = document.getElementById('c-rua').value;
        const num = document.getElementById('c-num').value.trim();
        const compInput = document.getElementById('c-comp');

        if (rua && num) {
            const existentes = await DB.findAddressComplements(rua, num);
            
            // SE EXISTIREM OUTROS COMPLEMENTOS REGISTRADOS NESTE NUMERO
            if (existentes.length > 0 && (!compInput.value || compInput.value === "CASA ÚNICA")) {
                const escolha = await Utils.CustomModals.addressConflict(rua, num, existentes);
                
                if (escolha === "NEW") {
                    compInput.value = ""; 
                    compInput.focus();
                } else if (escolha) {
                    compInput.value = escolha; // ASSUME COMPLEMENTO EXISTENTE
                }
            } else if (existentes.length === 0 && !compInput.value) {
                compInput.value = "CASA ÚNICA"; // INJEÇÃO AUTOMÁTICA (DIRETRIZ 3)
            }
        }
    },

    /* 008: MOTOR DE RECUPERACAO PARA EDICAO (LOAD DATA) */
    async prepareEdit(id) {
        const p = await DB.get("municipes", id);
        if (!p) return;

        this.editingId = id;
        
        // MAPEAMENTO DO PASSO 1: IDENTIFICACAO INDIVIDUAL
        document.getElementById('c-nome').value = p.nome;
        document.getElementById('c-nome-social').value = p.nomeSocial || "";
        document.getElementById('c-nasc').value = p.nasc;
        document.getElementById('c-sexo').value = p.sexo;
        document.getElementById('c-raca').value = p.raca;
        document.getElementById('c-etnia').value = p.etnia || "";
        document.getElementById('c-cpf').value = p.cpf;
        document.getElementById('c-cns').value = p.cns || "";
        document.getElementById('c-mae').value = p.nomeMae || "";
        document.getElementById('c-pai').value = p.nomePai || "";
        document.getElementById('c-tel').value = p.tel || "";
        document.getElementById('c-nacionalidade').value = p.nacionalidade;
        document.getElementById('c-escolaridade').value = p.escolaridade;
        document.getElementById('c-situacao-trabalho').value = p.situacaoTrabalho;

        // MAPEAMENTO DO PASSO 2: ENDERECO E CADASTRO DOMICILIAR
        document.getElementById('c-rua').value = p.rua;
        document.getElementById('c-num').value = p.num;
        document.getElementById('c-comp').value = p.comp;
        document.getElementById('c-is-resp').value = p.isResp;
        document.getElementById('c-relacao').value = p.relacao;
        document.getElementById('c-tipo-imovel').value = p.tipoImovel;
        document.getElementById('c-agua').value = p.abastecimentoAgua;
        document.getElementById('c-esgoto').value = p.escoamentoSanitario;
        document.getElementById('c-lixo').value = p.destinoLixo;
        document.getElementById('c-parede').value = p.materialParedes;
        document.getElementById('ch-animais').checked = p.presencaAnimais;

        // MAPEAMENTO DO PASSO 3: MONITORAMENTO EPIDEMIOLOGICO (19 AGRAVOS)
        document.getElementById('ch-hiper').checked = p.hiper;
        document.getElementById('ch-diab').checked = p.diab;
        document.getElementById('ch-gest').checked = p.gest;
        document.getElementById('c-dum').value = p.dum || "";
        document.getElementById('ch-mental').checked = p.saudeMental;
        document.getElementById('ch-acamado').checked = p.acamado;
        document.getElementById('ch-deficiencia').checked = p.deficiencia;
        document.getElementById('ch-fumante').checked = p.fumante;
        document.getElementById('ch-alcool').checked = p.usoAlcool;
        document.getElementById('ch-drogas').checked = p.usoDrogas;
        document.getElementById('ch-avc').checked = p.avc;
        document.getElementById('ch-infarto').checked = p.infarto;
        document.getElementById('ch-resp').checked = p.doencaRespiratoria;
        document.getElementById('ch-renal').checked = p.doencaRenal;
        document.getElementById('ch-cancer').checked = p.cancer;
        document.getElementById('ch-hans').checked = p.hanseniase;
        document.getElementById('ch-tb').checked = p.tuberculose;
        document.getElementById('ch-internacao').checked = p.internacaoRecente;
        document.getElementById('ch-puerperio').checked = p.puerperio;
        document.getElementById('c-obs').value = p.obs || "";

        this.toggleRelacao();
        this.toggleDum();
        this.setStep(1);
        Nav.goTo('tela-cadastro');
    },

    /* 009: MOTOR DE GRAVACAO - CONSOLIDACAO DE DADOS SISAB/E-SUS */
    async save() {
        // 010: COLETA E SANITIZACAO DOS DADOS
        const municipeData = {
            // IDENTIFICACAO (FICHA INDIVIDUAL)
            nome: Utils.sanitize(document.getElementById('c-nome').value),
            nomeSocial: Utils.sanitize(document.getElementById('c-nome-social').value),
            nasc: document.getElementById('c-nasc').value,
            sexo: document.getElementById('c-sexo').value,
            raca: document.getElementById('c-raca').value,
            etnia: Utils.sanitize(document.getElementById('c-etnia').value),
            cpf: document.getElementById('c-cpf').value,
            cns: document.getElementById('c-cns').value,
            nomeMae: Utils.sanitize(document.getElementById('c-mae').value),
            nomePai: Utils.sanitize(document.getElementById('c-pai').value),
            tel: document.getElementById('c-tel').value,
            nacionalidade: document.getElementById('c-nacionalidade').value,
            escolaridade: document.getElementById('c-escolaridade').value,
            situacaoTrabalho: document.getElementById('c-situacao-trabalho').value,

            // TERRITORIO E DOMICILIO (FICHA DOMICILIAR)
            rua: document.getElementById('c-rua').value,
            num: document.getElementById('c-num').value.trim(),
            comp: Utils.sanitize(document.getElementById('c-comp').value) || "CASA ÚNICA",
            isResp: document.getElementById('c-is-resp').value,
            relacao: document.getElementById('c-relacao').value,
            tipoImovel: document.getElementById('c-tipo-imovel').value,
            abastecimentoAgua: document.getElementById('c-agua').value,
            escoamentoSanitario: document.getElementById('c-esgoto').value,
            destinoLixo: document.getElementById('c-lixo').value,
            materialParedes: document.getElementById('c-parede').value,
            presencaAnimais: document.getElementById('ch-animais').checked,

            // EPIDEMIOLOGIA (OS 19 AGRAVOS)
            hiper: document.getElementById('ch-hiper').checked,
            diab: document.getElementById('ch-diab').checked,
            gest: document.getElementById('ch-gest').checked,
            dum: document.getElementById('c-dum').value,
            saudeMental: document.getElementById('ch-mental').checked,
            acamado: document.getElementById('ch-acamado').checked,
            deficiencia: document.getElementById('ch-deficiencia').checked,
            fumante: document.getElementById('ch-fumante').checked,
            usoAlcool: document.getElementById('ch-alcool').checked,
            usoDrogas: document.getElementById('ch-drogas').checked,
            avc: document.getElementById('ch-avc').checked,
            infarto: document.getElementById('ch-infarto').checked,
            doencaRespiratoria: document.getElementById('ch-resp').checked,
            doencaRenal: document.getElementById('ch-renal').checked,
            cancer: document.getElementById('ch-cancer').checked,
            hanseniase: document.getElementById('ch-hans').checked,
            tuberculose: document.getElementById('ch-tb').checked,
            internacaoRecente: document.getElementById('ch-internacao').checked,
            puerperio: document.getElementById('ch-puerperio').checked,
            obs: Utils.sanitize(document.getElementById('c-obs').value),
            
            // CAMPOS CALCULADOS E AUTOMATICOS (DIRETRIZ 4 E 5)
            idade: Utils.calculateAge(document.getElementById('c-nasc').value),
            idoso: (Utils.calculateAge(document.getElementById('c-nasc').value) >= 60),
            respId: null // SERÁ PREENCHIDO PELA LOGICA DE VINCULO ABAIXO
        };

        // SE FOR EDICAO, MANTEM O ID ORIGINAL
        if (this.editingId) municipeData.id = this.editingId;

        // 011: VALIDACAO DE CAMPOS BLOQUEANTES
        const validator = Utils.checkMandatoryFields(municipeData);
        if (!validator.valid) {
            return Utils.CustomModals.alert(`ERRO DE PREENCHIMENTO:\nOS CAMPOS ${validator.missing.join(", ")} SÃO OBRIGATÓRIOS.`);
        }

        try {
            // 012: TRAVA DE INTEGRIDADE FAMILIAR (DIRETRIZ 3)
            if (municipeData.isResp === 'SIM') {
                const jaExisteResponsavel = await DB.checkExistingResponsible(municipeData.rua, municipeData.num, municipeData.comp);
                if (jaExisteResponsavel && jaExisteResponsavel.id !== this.editingId) {
                    return Utils.CustomModals.alert(`Atenção: Já existe um Responsável Familiar (CHEFE) cadastrado na unidade: ${municipeData.comp}. Só é permitido um por casa.`);
                }
            }

            // 013: LOGICA DE VINCULO AUTOMATICO DE DEPENDENTES
            if (municipeData.isResp === 'NAO') {
                const chefeEncontrado = await DB.checkExistingResponsible(municipeData.rua, municipeData.num, municipeData.comp);
                if (chefeEncontrado) {
                    municipeData.respId = chefeEncontrado.id;
                }
            }

            // 014: EFETIVA A GRAVACAO NO INDEXEDDB
            const savedId = await DB.put("municipes", municipeData);

            // 015: SE ESTE SALVO FOI UM NOVO CHEFE, ATUALIZA DEPENDENTES QUE JÁ MORAVAM LÁ
            if (municipeData.isResp === 'SIM') {
                const moradores = await DB.getByIndex("municipes", "idx_endereco_chave", [municipeData.rua, municipeData.num, municipeData.comp]);
                for (let m of moradores) {
                    if (m.isResp === 'NAO') {
                        m.respId = savedId;
                        await DB.put("municipes", m);
                    }
                }
            }

            await Utils.CustomModals.alert("CADASTRO GRAVADO COM SUCESSO NO TERRITÓRIO.");
            Nav.goTo('tela-home', true);

        } catch (error) {
            console.error("ERRO CRITICO AO SALVAR:", error);
            Utils.CustomModals.alert("FALHA AO GRAVAR NO BANCO DE DADOS LOCAL.");
        }
    }
};
