const Registry = {
    toggleRelation() {
        const isResp = document.getElementById('c-is-resp').value === 'SIM';
        document.getElementById('div-relacao').classList.toggle('hidden', isResp);
        if (isResp) this.removeResponsible();
    },
    toggleDUM() {
        document.getElementById('div-dum').classList.toggle('hidden', !document.getElementById('ch-gest').checked);
    },
    setStep(n) {
        document.querySelectorAll('[id^="passo-"]').forEach(d => d.classList.add('hidden'));
        document.getElementById(`passo-${n}`).classList.remove('hidden');
        window.scrollTo(0,0);
    },
    nextStep(step) {
        if (step === 2) {
            if (!document.getElementById('c-nome').value || !document.getElementById('c-nasc').value) return CustomModals.alert("NOME E NASCIMENTO SÃO OBRIGATÓRIOS.");
            if (!Utils.isValidDateRange(document.getElementById('c-nasc').value)) return CustomModals.alert("DATA DE NASCIMENTO INVÁLIDA.");
        }
        this.setStep(step);
    },
    async searchResponsible() {
        const term = document.getElementById('b-resp-nome').value.toUpperCase().trim();
        if (!term) return CustomModals.alert("DIGITE O NOME PARA LOCALIZAR.");
        const res = (await DB.getAll("municipes")).filter(p => p.isResp === 'SIM' && p.nome.includes(term));
        const list = document.getElementById('lista-resp-resultados');
        list.innerHTML = res.map(p => `
            <div class="card" style="padding:10px; font-size:12px;">
                ${p.nome} (${p.nasc})<br>
                <button class="btn btn-save btn-xs" onclick="Registry.selectResponsible(${p.id}, '${p.nome}')">VINCULAR ESTE</button>
            </div>`).join('') || "NENHUM RESPONSÁVEL ENCONTRADO.";
    },
    selectResponsible(id, nome) {
        document.getElementById('c-resp-id').value = id;
        document.getElementById('txt-resp-selecionado').innerText = nome;
        document.getElementById('resp-selecionado').classList.remove('hidden');
    },
    removeResponsible() {
        document.getElementById('c-resp-id').value = "";
        document.getElementById('resp-selecionado').classList.add('hidden');
    },
    startNew() {
        AppState.resetPatient();
        AppState.resetUnsaved();
        document.querySelectorAll('#tela-cadastro input, #tela-cadastro select, #tela-cadastro textarea').forEach(i => i.value = "");
        document.querySelectorAll('#tela-cadastro input[type="checkbox"]').forEach(i => i.checked = false);
        document.getElementById('c-is-resp').value = "SIM";
        document.getElementById('btn-delete-patient').classList.add('hidden');
        this.toggleRelation(); this.toggleDUM();
        this.setStep(1); Nav.goTo('tela-cadastro');
    },
    async prepareEdit(id) {
        const p = await DB.get("municipes", id);
        AppState.activePatient = p;
        const setV = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ""; };
        const setC = (id, val) => { const el = document.getElementById(id); if(el) el.checked = !!val; };
        setV('c-nome', p.nome); setV('c-nasc', p.nasc); setV('c-sexo', p.sexo); setV('c-raca', p.raca);
        setV('c-mae', p.mae); setV('c-cpf', p.cpf); setV('c-cns', p.cns); setV('c-telprincipal', p.telprincipal);
        setV('c-telrecado', p.telrecado); setV('c-rua', p.rua); setV('c-num', p.num); setV('c-ma', p.ma);
        setV('c-seg', p.seg); setV('c-comp', p.comp); setV('c-is-resp', p.isResp);
        if (p.isResp === 'NAO') { setV('c-relacao', p.relacao); if (p.respId) this.selectResponsible(p.respId, p.respNome); }
        setC('ch-hiper', p.hiper); setC('ch-diab', p.diab); setC('ch-gest', p.gest);
        setC('ch-acam', p.acam); setC('ch-def', p.def); setC('ch-fum', p.fum);
        setC('ch-alcool', p.alcool); setC('ch-drogas', p.drogas); setC('ch-avc', p.avc);
        setC('ch-infarto', p.infarto); setC('ch-resp', p.resp); setC('ch-renal', p.renal);
        setC('ch-cancer', p.cancer); setC('ch-hans', p.hans); setC('ch-tb', p.tb); setC('ch-mental', p.mental);
        setV('c-dum', p.dum); setV('c-obs', p.obs);
        document.getElementById('btn-delete-patient').classList.remove('hidden');
        this.toggleRelation(); this.toggleDUM();
        this.setStep(1); Nav.goTo('tela-cadastro');
    },
    async save() {
        const gV = id => document.getElementById(id).value.toUpperCase().trim();
        const gC = id => document.getElementById(id).checked;
        const data = {
            nome: gV('c-nome'), nasc: gV('c-nasc'), sexo: gV('c-sexo'), raca: gV('c-raca'),
            mae: gV('c-mae'), cpf: gV('c-cpf'), cns: gV('c-cns'),
            telprincipal: gV('c-telprincipal'), telrecado: gV('c-telrecado'),
            rua: gV('c-rua'), num: gV('c-num'), ma: gV('c-ma'), seg: gV('c-seg'), comp: gV('c-comp'),
            isResp: gV('c-is-resp'), relacao: gV('c-relacao'),
            hiper: gC('ch-hiper'), diab: gC('ch-diab'), gest: gC('ch-gest')?1:0,
            acam: gC('ch-acam'), def: gC('ch-def'), fum: gC('ch-fum'), alcool: gC('ch-alcool'),
            drogas: gC('ch-drogas'), avc: gC('ch-avc'), infarto: gC('ch-infarto'),
            resp: gC('ch-resp'), renal: gC('ch-renal'), cancer: gC('ch-cancer'),
            hans: gC('ch-hans'), tb: gC('ch-tb'), mental: gC('ch-mental'),
            dum: gV('c-dum'), obs: gV('c-obs'), ts: Date.now()
        };
        if (!data.cpf) delete data.cpf;
        if (data.isResp === 'SIM') {
            const all = await DB.getAll("municipes");
            const currentId = AppState.activePatient ? AppState.activePatient.id : null;
            const dupResp = all.find(m => m.id !== currentId && m.isResp === 'SIM' && m.rua === data.rua && m.num === data.num && m.comp === data.comp);
            if (dupResp) return CustomModals.alert(`ERRO: JÁ EXISTE UM RESPONSÁVEL NESTE ENDEREÇO (${dupResp.nome}).`);
        } else {
            data.respId = Number(document.getElementById('c-resp-id').value) || "";
            data.respNome = document.getElementById('txt-resp-selecionado').innerText;
        }
        try {
            if (AppState.activePatient) data.id = AppState.activePatient.id;
            await DB.put("municipes", data);
            await DB.updateCount();
            AppState.resetUnsaved();
            await CustomModals.alert("CADASTRO SALVO COM SUCESSO!");
            Nav.goTo('tela-home', true);
        } catch (e) { CustomModals.alert("ERRO AO SALVAR: " + e.message); }
    },
    async deletePatient() {
        const conf = await CustomModals.prompt(`PARA APAGAR TUDO, DIGITE EXCLUIR:`);
        if (conf === "EXCLUIR") { await DB.deleteWithVisits(AppState.activePatient.id); await DB.updateCount(); Nav.goTo('tela-home', true); }
    },
    async viewPregnant() {
        const list = await DB.getByIndex("municipes", "gest", 1);
        UI.renderList("GESTANTES NO TERRITÓRIO", list);
    }
};