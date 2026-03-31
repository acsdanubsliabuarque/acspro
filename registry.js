// 001: MODULO DE GESTAO DE CADASTROS INDIVIDUAIS E TERRITORIAIS
// 002: IMPLEMENTA REGRAS RIGIDAS PARA O TERRITORIO DE OSASCO (CONFLITO DE COMPLEMENTOS)
const Registry = {

    // 003: NAVEGACAO ENTRE ETAPAS DO FORMULARIO COM ROLAGEM AO TOPO
    setStep(n) {
        // 004: OCULTA TODOS OS PASSOS ANTES DE MOSTRAR O ALVO
        document.querySelectorAll('[id^="passo-"]').forEach(div => div.classList.add('hidden'));
        const target = document.getElementById(`passo-${n}`);
        if(target) target.classList.remove('hidden');
        window.scrollTo(0, 0);
    },

    // 005: LOGICA PARA EXIBIR/OCULTAR DUM (GESTAÇÃO)
    toggleDum() {
        const isGestante = document.getElementById('ch-gest').checked;
        document.getElementById('div-gestante').classList.toggle('hidden', !isGestante);
    },

    // 006: LOGICA PARA EXIBIR/OCULTAR PARENTESCO SE FOR DEPENDENTE
    toggleRelacao() {
        const isResp = document.getElementById('c-is-resp').value === 'SIM';
        document.getElementById('div-parentesco').classList.toggle('hidden', isResp);
    },

    // 007: VERIFICADOR DINAMICO DE CONFLITO DE ENDERECO (SOLICITACAO OSASCO)
    // 008: DISPARADO AO SAIR DOS CAMPOS RUA OU NUMERO
    async checkAddressConflict() {
        const rua = document.getElementById('c-rua').value;
        const num = document.getElementById('c-num').value.trim();
        const compInput = document.getElementById('c-comp');

        // 009: SO VALIDA SE OS DOIS CAMPOS ESTIVEREM PREENCHIDOS
        if (rua && num) {
            const existentes = await DB.findAddressComplements(rua, num);
            
            // 010: SE EXISTIREM OUTRAS CASAS NESTE NUMERO E O COMPLEMENTO ATUAL FOR VAZIO
            if (existentes.length > 0 && (!compInput.value || compInput.value === "CASA ÚNICA")) {
                const choice = await Utils.CustomModals.addressConflict(
                    "CONFLITO DE MORADIA DETECTADO",
                    `EXISTEM ${existentes.length} COMPLEMENTOS REGISTRADOS NO Nº ${num}. SELECIONE O CORRETO:`,
                    existentes
                );

                if (choice === "NOVO") {
                    compInput.value = "";
                    compInput.focus();
                    Utils.CustomModals.alert("DIGITE O NOVO COMPLEMENTO (EX: CASA 3, FUNDOS, BLOCO B).");
                } else if (choice) {
                    compInput.value = choice;
                }
            } else if (existentes.length === 0 && !compInput.value) {
                // 011: SE NAO EXISTE NINGUEM NO NUMERO, DEFINE PADRAO OSASCO
                compInput.value = "CASA ÚNICA";
            }
        }
    },

    // 012: PREPARACAO PARA NOVO CADASTRO INDIVIDUAL (RESET COMPLETO)
    startNew() {
        AppState.resetPatient();
        AppState.resetUnsaved();
        
        // 013: LIMPEZA DE TODOS OS INPUTS E SELECTS DO FORMULARIO
        const form = document.getElementById('tela-cadastro');
        form.querySelectorAll('input, select, textarea').forEach(i => {
            if(i.type === 'checkbox') i.checked = false;
            else i.value = "";
        });

        // 014: VALORES PADROES PARA OSASCO
        document.getElementById('c-is-resp').value = "SIM";
        document.getElementById('c-nacionalidade').value = "BRASILEIRA";
        document.getElementById('c-sexo').value = "FEMININO";
        document.getElementById('c-raca').value = "PARDA";
        
        this.toggleRelacao();
        this.toggleDum();
        this.setStep(1);
        Nav.goTo('tela-cadastro');
    },

    // 015: CARREGAMENTO DE DADOS PARA EDICAO DE CADASTRO EXISTENTE
    async prepareEdit(id) {
        const p = await DB.get("municipes", id);
        if(!p) return Utils.CustomModals.alert("ERRO AO LOCALIZAR CIDADÃO.");

        AppState.activePatient = p;
        
        // 016: MAPEAMENTO DINAMICO DE CAMPOS DO BANCO PARA A INTERFACE
        const setVal = (domId, val) => {
            const el = document.getElementById(domId);
            if(el) el.value = val || "";
        };
        const setCheck = (domId, val) => {
            const el = document.getElementById(domId);
            if(el) el.checked = !!val;
        };

        setVal('c-nome', p.nome);
        setVal('c-nasc', p.nasc);
        setVal('c-nome-social', p.nomeSocial);
        setVal('c-sexo', p.sexo);
        setVal('c-raca', p.raca);
        setVal('c-mae', p.mae);
        setVal('c-pai', p.pai);
        setVal('c-cpf', p.cpf);
        setVal('c-cns', p.cns);
        setVal('c-nacionalidade', p.nacionalidade);
        setVal('c-tel', p.tel);
        setVal('c-rua', p.rua);
        setVal('c-num', p.num);
        setVal('c-ma', p.ma);
        setVal('c-seg', p.seg);
        setVal('c-comp', p.comp);
        setVal('c-is-resp', p.isResp);
        setVal('c-relacao', p.relacao);
        setVal('c-dum', p.dum);
        setVal('c-obs', p.obs);

        setCheck('ch-hiper', p.hiper);
        setCheck('ch-diab', p.diab);
        setCheck('ch-gest', p.gest);
        setCheck('ch-mental', p.saudeMental);
        setCheck('ch-acamado', p.acamado);
        setCheck('ch-fumante', p.fumante);
        setCheck('ch-alcool', p.alcool);
        setCheck('ch-drogas', p.drogas);
        setCheck('ch-deficiencia', p.deficiencia);

        // 017: REVALIDA VISIBILIDADE DE CAMPOS CONDICIONAIS
        this.calculateAgeDisplay();
        this.toggleRelacao();
        this.toggleDum();
        this.setStep(1);
        Nav.goTo('tela-cadastro');
    },

    // 018: CALCULO DE IDADE EM TEMPO REAL NO FORMULARIO
    calculateAgeDisplay() {
        const nasc = document.getElementById('c-nasc').value;
        const display = document.getElementById('c-idade-display');
        if (nasc.length === 10) {
            const idade = Utils.calculateAge(nasc);
            display.value = `${idade} ANOS`;
        } else {
            display.value = "";
        }
    },

    // 019: FUNCAO MESTRE DE GRAVACAO (SALVAR)
    // 020: PODE SER CHAMADA DE QUALQUER PASSO DO FORMULARIO
    async save() {
        // 021: CAPTURA BRUTA DOS DADOS DA INTERFACE
        const data = {
            nome: document.getElementById('c-nome').value.toUpperCase().trim(),
            nasc: document.getElementById('c-nasc').value,
            nomeSocial: document.getElementById('c-nome-social').value.toUpperCase().trim(),
            sexo: document.getElementById('c-sexo').value,
            raca: document.getElementById('c-raca').value,
            mae: document.getElementById('c-mae').value.toUpperCase().trim(),
            pai: document.getElementById('c-pai').value.toUpperCase().trim(),
            cpf: document.getElementById('c-cpf').value.replace(/\D/g, ''),
            cns: document.getElementById('c-cns').value.replace(/\D/g, ''),
            nacionalidade: document.getElementById('c-nacionalidade').value,
            tel: document.getElementById('c-tel').value,
            rua: document.getElementById('c-rua').value,
            num: document.getElementById('c-num').value.toUpperCase().trim(),
            ma: document.getElementById('c-ma').value.toUpperCase().trim(),
            seg: document.getElementById('c-seg').value.toUpperCase().trim(),
            comp: document.getElementById('c-comp').value.toUpperCase().trim() || "CASA ÚNICA",
            isResp: document.getElementById('c-is-resp').value,
            relacao: document.getElementById('c-relacao').value,
            // 022: DADOS DE SAUDE E AGRAVOS
            hiper: document.getElementById('ch-hiper').checked,
            diab: document.getElementById('ch-diab').checked,
            gest: document.getElementById('ch-gest').checked,
            dum: document.getElementById('c-dum').value,
            saudeMental: document.getElementById('ch-mental').checked,
            acamado: document.getElementById('ch-acamado').checked,
            fumante: document.getElementById('ch-fumante').checked,
            alcool: document.getElementById('ch-alcool').checked,
            drogas: document.getElementById('ch-drogas').checked,
            deficiencia: document.getElementById('ch-deficiencia').checked,
            obs: document.getElementById('c-obs').value.toUpperCase().trim(),
            ts_atualizacao: Date.now()
        };

        // 023: VALIDACAO DE CAMPOS OBRIGATORIOS (MOTOR DE FLUIDEZ)
        const validacao = Utils.checkMandatoryFields(data);
        if (!validacao.valid) {
            return Utils.CustomModals.alert(`CAMPOS OBRIGATÓRIOS FALTANDO:\n${validacao.missing.join('\n')}`);
        }

        // 024: CALCULO AUTOMATICO DE STATUS 'IDOSO' (REGRA OSASCO)
        const idadeReal = Utils.calculateAge(data.nasc);
        data.idoso = (idadeReal >= 60);

        // 025: VERIFICACAO DE DUPLICIDADE DE CHEFE DE FAMILIA (RESPONSAVEL)
        if (data.isResp === 'SIM') {
            const moradores = await DB.getAll("municipes");
            const conflitoChefe = moradores.find(m => 
                m.rua === data.rua && 
                m.num === data.num && 
                m.comp === data.comp && 
                m.isResp === 'SIM' && 
                m.id !== (AppState.activePatient ? AppState.activePatient.id : null)
            );

            if (conflitoChefe) {
                return Utils.CustomModals.alert(`CADASTRO NEGATIVO: JÁ EXISTE UM CHEFE NESTE ENDEREÇO (${conflitoChefe.nome}).\nALTERE O COMPLEMENTO OU VINCULE COMO DEPENDENTE.`);
            }
        }

        // 026: PERSISTENCIA NO BANCO DE DADOS
        try {
            if (AppState.activePatient) data.id = AppState.activePatient.id;
            
            await DB.put("municipes", data);
            await DB.updateCount();
            
            AppState.resetUnsaved();
            await Utils.CustomModals.alert("CADASTRO PROCESSADO E SALVO COM SUCESSO!");
            Nav.goTo('tela-home', true);
        } catch (err) {
            Utils.CustomModals.alert("ERRO CRÍTICO DE BANCO DE DADOS: " + err.message);
        }
    },

    // 027: FUNCAO PARA LOCALIZAR GESTANTES NO TERRITORIO (SISAB)
    async viewPregnant() {
        const list = await DB.getByIndex("municipes", "gest", true);
        UI.renderList("GESTANTES NO TERRITÓRIO", list);
    },

    // 028: FUNCAO PARA LOCALIZAR IDOSOS NO TERRITORIO (SISAB)
    async viewElderly() {
        const list = await DB.getByIndex("municipes", "idoso", true);
        UI.renderList("IDOSOS (60+) NO TERRITÓRIO", list);
    }
};

// 029: VINCULACAO DE EVENTOS DE MASCARA E CALCULO AUTOMATICO
document.addEventListener('input', (e) => {
    if (e.target.id === 'c-nasc') {
        e.target.value = Utils.masks.date(e.target.value);
        Registry.calculateAgeDisplay();
    }
    if (e.target.id === 'c-cpf') e.target.value = Utils.masks.cpf(e.target.value);
    if (e.target.id === 'c-tel') e.target.value = Utils.masks.phone(e.target.value);
    if (e.target.id === 'c-dum') e.target.value = Utils.masks.date(e.target.value);
});

// 030: ALERTA DE ARQUITETO SENIOR: 
// 031: NA LINHA 022, GARANTIMOS QUE O COMPLEMENTO NUNCA SEJA NULO.
// 032: O VALOR 'CASA ÚNICA' É O PADRÃO PARA EVITAR CONFLITOS DE BACKUP.
