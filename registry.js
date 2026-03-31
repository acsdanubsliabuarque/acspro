/**
 * 004: MÓDULO DE CADASTRO E GESTÃO DE MUNICIPES
 * SISTEMA: ACS PRO V12.2 - OSASCO FIELD SYSTEM
 * 
 * Gerencia a criação, edição e integridade dos dados dos cidadãos.
 */

window.Registry = {
    editingId: null, // Armazena o ID se estivermos em modo edição

    // 001: CONTROLE DE NAVEGAÇÃO ENTRE PASSOS DO FORMULÁRIO
    setStep(n) {
        document.querySelectorAll('[id^="passo-"]').forEach(d => d.classList.add('hidden'));
        const target = document.getElementById(`passo-${n}`);
        if (target) {
            target.classList.remove('hidden');
            window.scrollTo(0, 0);
        }
    },

    // 002: EXIBIÇÃO CONDICIONAL (DUM E PARENTESCO)
    toggleDum() { 
        const isGest = document.getElementById('ch-gest').checked;
        document.getElementById('div-gestante').classList.toggle('hidden', !isGest); 
    },

    toggleRelacao() { 
        const isResp = document.getElementById('c-is-resp').value === 'SIM';
        document.getElementById('div-parentesco').classList.toggle('hidden', isResp); 
    },

    // 003: VALIDADOR DE CONFLITO DE ENDEREÇO (EVITA DUPLICIDADE DE NÚCLEOS)
    async checkAddressConflict() {
        const rua = document.getElementById('c-rua').value;
        const num = document.getElementById('c-num').value.trim();
        const compInput = document.getElementById('c-comp');

        if (rua && num) {
            const existentes = await DB.findAddressComplements(rua, num);
            
            // Se já existem pessoas neste endereço e o complemento está vazio ou padrão
            if (existentes.length > 0 && (!compInput.value || compInput.value === "CASA ÚNICA")) {
                const escolha = await Utils.CustomModals.addressConflict(
                    "ENDEREÇO JÁ POSSUI MORADORES", 
                    "ESTE CIDADÃO PERTENCE A QUAL DESTES COMPLEMENTOS?", 
                    existentes
                );

                if (escolha === "NOVO") {
                    compInput.value = ""; 
                    compInput.placeholder = "EX: FUNDOS, CASA 2...";
                    compInput.focus();
                } else if (escolha) {
                    compInput.value = escolha;
                }
            } else if (existentes.length === 0 && !compInput.value) {
                compInput.value = "CASA ÚNICA";
            }
        }
    },

    // 004: PREPARA O FORMULÁRIO PARA NOVO CADASTRO
    startNew() {
        this.editingId = null;
        const form = document.getElementById('tela-cadastro');
        form.querySelectorAll('input, select, textarea').forEach(i => {
            if (i.type === 'checkbox') i.checked = false;
            else i.value = "";
        });

        document.getElementById('c-is-resp').value = "SIM";
        document.getElementById('c-raca').value = "PARDA"; // Valor padrão comum
        document.getElementById('c-nacionalidade').value = "BRASILEIRA";

        this.toggleRelacao();
        this.toggleDum();
        this.setStep(1);
        Nav.goTo('tela-cadastro');
    },

    // 005: CARREGA DADOS PARA EDIÇÃO
    async prepareEdit(id) {
        const p = await DB.get("municipes", id);
        if (!p) return;

        this.editingId = id;
        
        // Preenchimento dos Campos Básicos
        document.getElementById('c-nome').value = p.nome;
        document.getElementById('c-nasc').value = p.nasc;
        document.getElementById('c-nome-social').value = p.nomeSocial || "";
        document.getElementById('c-sexo').value = p.sexo;
        document.getElementById('c-raca').value = p.raca;
        document.getElementById('c-mae').value = p.mae || "";
        document.getElementById('c-pai').value = p.pai || "";
        document.getElementById('c-cpf').value = p.cpf;
        document.getElementById('c-cns').value = p.cns || "";
        document.getElementById('c-nacionalidade').value = p.nacionalidade;
        document.getElementById('c-tel').value = p.tel || "";

        // Endereço
        document.getElementById('c-rua').value = p.rua;
        document.getElementById('c-num').value = p.num;
        document.getElementById('c-ma').value = p.ma || "";
        document.getElementById('c-seg').value = p.seg || "";
        document.getElementById('c-comp').value = p.comp;
        document.getElementById('c-is-resp').value = p.isResp;
        document.getElementById('c-relacao').value = p.relacao || "";

        // Saúde
        document.getElementById('ch-hiper').checked = p.hiper;
        document.getElementById('ch-diab').checked = p.diab;
        document.getElementById('ch-gest').checked = p.gest;
        document.getElementById('c-dum').value = p.dum || "";
        document.getElementById('ch-mental').checked = p.saudeMental;
        document.getElementById('ch-acamado').checked = p.acamado;
        document.getElementById('ch-fumante').checked = p.fumante;
        document.getElementById('ch-alcool').checked = p.alcool;
        document.getElementById('c-obs').value = p.obs || "";

        this.toggleRelacao();
        this.toggleDum();
        this.setStep(1);
        Nav.goTo('tela-cadastro');
    },

    // 006: SALVAMENTO COM LOGICA DE VÍNCULO FAMILIAR
    async save() {
        // Coleta de dados do formulário
        const data = {
            nome: document.getElementById('c-nome').value,
            nasc: document.getElementById('c-nasc').value,
            nomeSocial: document.getElementById('c-nome-social').value,
            sexo: document.getElementById('c-sexo').value,
            raca: document.getElementById('c-raca').value,
            mae: document.getElementById('c-mae').value,
            pai: document.getElementById('c-pai').value,
            cpf: document.getElementById('c-cpf').value,
            cns: document.getElementById('c-cns').value,
            nacionalidade: document.getElementById('c-nacionalidade').value,
            tel: document.getElementById('c-tel').value,
            
            rua: document.getElementById('c-rua').value,
            num: document.getElementById('c-num').value,
            ma: document.getElementById('c-ma').value,
            seg: document.getElementById('c-seg').value,
            comp: document.getElementById('c-comp').value || "CASA ÚNICA",
            
            isResp: document.getElementById('c-is-resp').value,
            relacao: document.getElementById('c-relacao').value,
            
            hiper: document.getElementById('ch-hiper').checked,
            diab: document.getElementById('ch-diab').checked,
            gest: document.getElementById('ch-gest').checked,
            dum: document.getElementById('c-dum').value,
            saudeMental: document.getElementById('ch-mental').checked,
            acamado: document.getElementById('ch-acamado').checked,
            fumante: document.getElementById('ch-fumante').checked,
            alcool: document.getElementById('ch-alcool').checked,
            obs: document.getElementById('c-obs').value,
            
            // Dados calculados
            idade: Utils.calculateAge(document.getElementById('c-nasc').value),
            idoso: (Utils.calculateAge(document.getElementById('c-nasc').value) >= 60),
            respId: null // Será preenchido abaixo se for dependente
        };

        if (this.editingId) data.id = this.editingId;

        // Validação de campos obrigatórios
        const v = Utils.checkMandatoryFields(data);
        if (!v.valid) {
            return Utils.CustomModals.alert(`OS SEGUINTES CAMPOS SÃO OBRIGATÓRIOS:\n\n${v.missing.join("\n")}`);
        }

        try {
            // Lógica de Vínculo Familiar: Se NÃO for responsável, procurar o chefe no mesmo endereço
            if (data.isResp === 'NAO') {
                const moradores = await DB.getByIndex("municipes", "enderecoChave", [data.rua, data.num, data.comp]);
                const chefe = moradores.find(m => m.isResp === 'SIM');
                
                if (chefe) {
                    data.respId = chefe.id;
                } else {
                    // Se não achou chefe, avisa mas permite salvar (pode ser que o chefe ainda não tenha sido cadastrado)
                    console.warn("Aviso: Responsável familiar não encontrado neste endereço.");
                }
            }

            const savedId = await DB.put("municipes", data);
            
            // Se este cidadão acabou de ser salvo como RESPONSÁVEL, 
            // precisamos atualizar todos os dependentes que já moram lá para apontarem para o ID dele.
            if (data.isResp === 'SIM') {
                const moradores = await DB.getByIndex("municipes", "enderecoChave", [data.rua, data.num, data.comp]);
                for (let m of moradores) {
                    if (m.isResp === 'NAO' && m.id !== savedId) {
                        m.respId = savedId;
                        await DB.put("municipes", m);
                    }
                }
            }

            await Utils.CustomModals.alert("REGISTRO GRAVADO COM SUCESSO!");
            Nav.goTo('tela-home', true);
            
        } catch (err) {
            Utils.CustomModals.alert("ERRO AO GRAVAR: " + err.message);
        }
    }
};
