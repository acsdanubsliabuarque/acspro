/* 001: DEFINICAO DO MOTOR DE ESTADO GLOBAL - INTEROPERABILIDADE TOTAL */
window.AppState = {
    activePatient: null,      // Armazena o munícipe sendo visitado ou editado
    visitStartTime: null,     // Registro para cálculo de tempo de permanência
    history: ['tela-home'],   // Pilha de navegação para o comando VOLTAR
    unsavedChanges: false,    // Trava de segurança para dados não gravados
    currentViewMode: 'full',  // Estado do Motor de Visualização (full|compact|list)
    lastSearchType: null,     // Tipo da última consulta (NAME ou ADDRESS)
    lastSearchData: null,     // Cache dos critérios da última consulta

    markUnsaved() { this.unsavedChanges = true; },
    resetUnsaved() { this.unsavedChanges = false; },
    resetPatient() { this.activePatient = null; this.visitStartTime = null; }
};

/* 002: MOTOR DE NAVEGACAO E ROTAS (NAV) */
window.Nav = {
    init() {
        /* 003: POPULA SELECTS DE LOGRADOURO COM DADOS DE OSASCO */
        const selects = document.querySelectorAll('.select-ruas');
        const opts = `<option value="">ESCOLHA O LOGRADOURO...</option>` + 
                     CONFIG_DB.RUAS.map(r => `<option value="${r}">${r}</option>`).join('');
        selects.forEach(s => s.innerHTML = opts);

        /* 004: MOTOR GLOBAL DE MAIUSCULAS E MASCARAS DINAMICAS */
        document.addEventListener('input', (e) => {
            const el = e.target;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = el.value.toUpperCase(); // REGRA 3: SCREAMING CAPS
            }
            if (['c-nasc', 'c-dum', 'v-data'].includes(el.id)) el.value = Utils.masks.date(el.value);
            if (el.id === 'c-cpf') el.value = Utils.masks.cpf(el.value);
            if (el.id === 'c-tel') el.value = Utils.masks.phone(el.value);
            if (el.id === 'v-pa') el.value = Utils.masks.pa(el.value);
        });
    },

    goTo(id, reset = false) {
        if (reset) AppState.history = ['tela-home'];
        else if (AppState.history[AppState.history.length - 1] !== id) AppState.history.push(id);
        
        document.querySelectorAll('.container > div').forEach(d => d.classList.add('hidden'));
        const target = document.getElementById(id);
        if (target) {
            target.classList.remove('hidden');
            window.scrollTo(0, 0);
        }
    },

    goBack() {
        if (AppState.history.length > 1) {
            AppState.history.pop();
            const prev = AppState.history[AppState.history.length - 1];
            this.goTo(prev);
            AppState.history.pop(); // Evita duplicação ao re-entrar no goTo
        } else {
            this.goTo('tela-home', true);
        }
    }
};

/* 005: MOTOR DE INTERFACE (VIEW ENGINE TRIPLO) */
window.UI = {
    /* 006: ALTERNA MODOS DE EXIBICAO RE-EXECUTANDO A ULTIMA BUSCA */
    changeView(mode) {
        AppState.currentViewMode = mode;
        if (AppState.lastSearchType === 'NAME') this.searchPessoa(true);
        else if (AppState.lastSearchType === 'ADDRESS') this.searchEndereco(true);
    },

    /* 007: CONSTRUTOR DE CARD COMPLETO (FULL) - FOCO EPIDEMIOLOGICO */
    async buildCardFull(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        const gest = p.gest ? Utils.getGestationalInfo(p.dum) : null;
        const pends = (await DB.getByIndex("visitas", "pacienteId", p.id)).filter(v => v.pendencia && !v.resolvida);

        let badges = "";
        const agravos = [
            {k:'hiper', l:'HIPERTENSÃO', c:'bg-hiper'}, {k:'diab', l:'DIABETES', c:'bg-dia'},
            {k:'gest', l:'GESTANTE', c:'bg-gest'}, {k:'saudeMental', l:'S. MENTAL', c:'bg-sm'},
            {k:'acamado', l:'ACAMADO', c:'bg-acam'}, {k:'idoso', l:'IDOSO', c:'bg-idoso'}
        ];
        agravos.forEach(i => { if(p[i.k] || (i.k==='idoso' && idade >= 60)) badges += `<span class="badge ${i.c}">${i.l}</span>`; });

        return `
            <div class="card ${p.gest ? 'card-gestante' : ''} ${idade >= 60 ? 'card-idoso' : ''}">
                <div class="info-label">CIDADÃO ${p.nomeSocial ? ' • SOCIAL: ' + s(p.nomeSocial) : ''}</div>
                <div class="info-valor" style="font-size:18px;"><strong>${s(p.nome)}</strong></div>
                <div class="grid-2">
                    <div><div class="info-label">NASCIMENTO</div><div class="info-valor">${s(p.nasc)} (${idade} ANOS)</div></div>
                    <div><div class="info-label">CPF</div><div class="info-valor">${s(p.cpf) || '---'}</div></div>
                </div>
                <div class="info-label">ENDEREÇO EM OSASCO</div>
                <div class="info-valor">${s(p.rua)}, ${s(p.num)} | ${s(p.comp)}</div>
                
                ${gest ? `
                    <div class="gestante-info-box" style="border-left: 5px solid var(--gestante);">
                        <div style="font-size:16px;">🤰 IG: ${gest.res}</div>
                        <div style="font-size:12px; opacity:0.8;">📅 DPP: ${gest.dpp} | ${gest.tri}</div>
                    </div>` : ''}

                <div style="margin: 10px 0;">${badges || '<small style="opacity:0.5">SEM AGRAVOS</small>'}</div>

                ${pends.length > 0 ? `
                    <div class="pendencia-ativa-no-card">
                        <span>⚠️ <b>PENDÊNCIA:</b> ${s(pends[0].pendencia)}</span>
                        <div style="display:flex; gap:5px;">
                            <button class="btn-icon" onclick="Visits.editPendency(${pends[0].id})">✏️</button>
                            <button class="btn-icon" onclick="Visits.resolvePendency(${pends[0].id})">✅</button>
                        </div>
                    </div>` : '' }

                <hr style="opacity:0.1; margin:15px 0;">
                <button class="btn btn-main" onclick="Visits.start(${p.id})">REGISTRAR VISITA</button>
                <div class="grid-2">
                    <button class="btn btn-outline btn-sm" onclick="Visits.viewHistory(${p.id})">HISTÓRICO</button>
                    <button class="btn btn-outline btn-sm" onclick="Registry.prepareEdit(${p.id})">EDITAR</button>
                </div>
            </div>`;
    },

    /* 008: CONSTRUTOR DE CARD COMPACTO (COMPACT) */
    async buildCardCompact(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        return `
            <div class="card" style="padding:12px; border-left-width:5px;" onclick="Visits.start(${p.id})">
                <div style="font-weight:bold; color:var(--primary); font-size:14px;">${s(p.nome)} (${idade} ANOS)</div>
                <div style="font-size:11px; color:#666;">${s(p.rua)}, ${s(p.num)} - ${s(p.comp)}</div>
                <div style="margin-top:5px; font-size:10px;">
                    ${p.hiper?'🔴H':''} ${p.diab?'🔵D':''} ${p.gest?'💗G':''} ${idade>=60?'🟣I':''}
                </div>
            </div>`;
    },

    /* 009: CONSTRUTOR DE LINHA (LIST) */
    async buildRowList(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:white; border-bottom:1px solid #eee;" onclick="Registry.prepareEdit(${p.id})">
                <div style="font-size:13px;"><strong>${s(p.nome)}</strong> <br> <small>${idade} ANOS</small></div>
                <div style="text-align:right; font-size:10px; color:#999;">${s(p.rua)}, ${p.num}</div>
            </div>`;
    },

    /* 010: MOTOR DE BUSCA POR NOME */
    async searchPessoa(refresh = false) {
        const term = refresh ? AppState.lastSearchData : document.getElementById('h-nome').value.toUpperCase().trim();
        if (!term && !refresh) return Utils.CustomModals.alert("DIGITE UM NOME PARA PESQUISAR.");
        
        AppState.lastSearchType = 'NAME';
        AppState.lastSearchData = term;

        const all = await DB.getAll("municipes");
        const res = all.filter(p => p.nome.includes(term));
        await this.renderList(`RESULTADOS PARA: "${term}"`, res);
    },

    /* 011: MOTOR DE BUSCA POR ENDERECO */
    async searchEndereco(refresh = false) {
        const rua = refresh ? AppState.lastSearchData.rua : document.getElementById('h-rua').value;
        const num = refresh ? AppState.lastSearchData.num : document.getElementById('h-num').value.trim();
        if (!rua && !refresh) return Utils.CustomModals.alert("SELECIONE A RUA.");
        
        AppState.lastSearchType = 'ADDRESS';
        AppState.lastSearchData = { rua, num };

        const moradores = await DB.getByIndex("municipes", "rua", rua);
        const filtrados = moradores.filter(p => !num || p.num === num);
        await this.renderList(`MORADORES: ${rua}${num ? ', ' + num : ''}`, filtrados);
    },

    /* 012: DESPACHANTE DE RENDERIZACAO */
    async renderList(title, arr) {
        const container = document.getElementById('lista-resultados');
        container.innerHTML = `<h3 style="margin-bottom:15px; font-size:16px;">${title} (${arr.length})</h3>`;
        
        if (arr.length === 0) {
            container.innerHTML += "<p style='text-align:center; padding:40px; opacity:0.5;'>NENHUM REGISTRO ENCONTRADO.</p>";
        } else {
            for (const p of arr) {
                if (AppState.currentViewMode === 'full') container.innerHTML += await this.buildCardFull(p);
                else if (AppState.currentViewMode === 'compact') container.innerHTML += await this.buildCardCompact(p);
                else if (AppState.currentViewMode === 'list') container.innerHTML += await this.buildRowList(p);
            }
        }
        Nav.goTo('tela-resultados');
    }
};
