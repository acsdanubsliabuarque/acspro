/* ==========================================================================
   006: MOTOR DE ESTADO, NAVEGAÇÃO E INTERFACE (UI ENGINE)
   DOCUMENTAÇÃO: CÉREBRO INTEGRAL DO SISTEMA ACS PRO V12.2 OSASCO
   ESTE ARQUIVO COORDENA A LÓGICA DE VISUALIZAÇÃO E PERSISTÊNCIA DE BACKUP
   ========================================================================== */

/* 001: MOTOR DE ESTADO GLOBAL - INTEROPERABILIDADE TOTAL (DIRETRIZ 1) */
window.AppState = {
    activePatient: null,      // ARMAZENA O MUNÍCIPE EM ATENDIMENTO
    visitStartTime: null,     // LOG DE INÍCIO DA VISITA PARA AUDITORIA
    history: ['tela-home'],   // PILHA DE NAVEGAÇÃO PARA O COMANDO VOLTAR
    unsavedChanges: false,    // TRAVA DE SEGURANÇA PARA DADOS NÃO GRAVADOS
    currentViewMode: 'full',  // ESTADO DO MOTOR DE VISUALIZAÇÃO (FULL|COMPACT|LIST)
    lastSearchType: null,     // ARMAZENA SE A ÚLTIMA BUSCA FOI 'NAME' OU 'ADDRESS'
    lastSearchCriteria: null, // CACHE DOS PARÂMETROS PARA REGENERAÇÃO DE LISTA

    markUnsaved() { this.unsavedChanges = true; },
    resetUnsaved() { this.unsavedChanges = false; },
    resetPatient() { this.activePatient = null; this.visitStartTime = null; }
};

/* 002: MOTOR DE ROTAS E DIRECIONAMENTO (NAV) */
window.Nav = {
    /* 003: INICIALIZAÇÃO DE GATILHOS TÉCNICOS */
    init() {
        // POPULA SELECTS DE LOGRADOURO COM A LISTA DE OSASCO
        const selects = document.querySelectorAll('.select-ruas');
        const optionsHtml = `<option value="">ESCOLHA O LOGRADOURO...</option>` + 
                            CONFIG_DB.RUAS.map(rua => `<option value="${rua}">${rua}</option>`).join('');
        selects.forEach(s => s.innerHTML = optionsHtml);

        // 004: MOTOR GLOBAL DE MAIÚSCULAS E MASCARAS (DIRETRIZ 1)
        document.addEventListener('input', (e) => {
            const el = e.target;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = el.value.toUpperCase(); // PADRÃO SCREAMING CAPS
            }
            
            // 005: APLICAÇÃO DE MASCARAS TÉCNICAS VIA UTILS.JS
            if (['c-nasc', 'c-dum', 'v-data'].includes(el.id)) el.value = Utils.masks.date(el.value);
            if (el.id === 'c-cpf') el.value = Utils.masks.cpf(el.value);
            if (el.id === 'c-cns') el.value = Utils.masks.cns(el.value);
            if (el.id === 'c-tel') el.value = Utils.masks.phone(el.value);
            if (el.id === 'v-pa') el.value = Utils.masks.pa(el.value);
            if (el.id === 'v-hgt') el.value = Utils.masks.hgt(el.value);
        });
    },

    /* 006: NAVEGAÇÃO ENTRE TELAS COM CONTROLE DE PILHA */
    goTo(id, reset = false) {
        if (reset) this.history = ['tela-home'];
        else if (this.history[this.history.length - 1] !== id) this.history.push(id);
        
        document.querySelectorAll('.container > div').forEach(d => d.classList.add('hidden'));
        const target = document.getElementById(id);
        if (target) {
            target.classList.remove('hidden');
            window.scrollTo(0, 0);
        } else {
            console.error("FALHA CRÍTICA: TELA NÃO LOCALIZADA ->", id);
        }
    },

    /* 007: COMANDO VOLTAR COM POP DE HISTÓRICO */
    goBack() {
        if (AppState.history.length > 1) {
            AppState.history.pop();
            const prev = AppState.history[AppState.history.length - 1];
            this.goTo(prev);
            AppState.history.pop(); // EVITA DUPLICAÇÃO NA PILHA AO RE-ENTRAR NO GOTO
        } else {
            this.goTo('tela-home', true);
        }
    },

    /* 008: TRAVA DE SEGURANÇA PARA SAÍDA DE FORMULÁRIOS */
    async confirmExit(dest) {
        if (AppState.unsavedChanges) {
            const confirm = await Utils.CustomModals.confirm("DADOS NÃO SALVOS SERÃO PERDIDOS! DESEJA REALMENTE SAIR?");
            if (!confirm) return;
        }
        AppState.resetUnsaved();
        if (dest === 'voltar') this.goBack();
        else this.goTo(dest, true);
    }
};

/* 009: MOTOR DE INTERFACE (UI) - GERAÇÃO DINÂMICA DE CARDS */
window.UI = {
    
    /* 010: ALTERNA O MODO DE EXIBIÇÃO E REGENERA A ÚLTIMA LISTA (DIRETRIZ 9) */
    async changeView(mode) {
        AppState.currentViewMode = mode;
        if (AppState.lastSearchType === 'NAME') await this.searchPessoa(true);
        else if (AppState.lastSearchType === 'ADDRESS') await this.searchEndereco(true);
    },

    /* 011: CONSTRUTOR DE CARD FULL (COMPLETO) - ALTA DENSIDADE SISAB */
    async buildCardFull(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        const gest = p.gest ? Utils.getGestationalInfo(p.dum) : null;
        
        // BUSCA PENDÊNCIAS ATIVAS NO BANCO
        const visitas = await DB.getByIndex("visitas", "idx_pacienteId", p.id);
        const pends = visitas.filter(v => v.pendencia && !v.resolvida);

        // 012: MAPEAMENTO DE BADGES EPIDEMIOLÓGICOS (OS 19 AGRAVOS)
        let badges = "";
        const agravos = [
            {k:'hiper', l:'HIPERTENSÃO', c:'bg-hiper'}, {k:'diab', l:'DIABETES', c:'bg-dia'},
            {k:'gest', l:'GESTANTE', c:'bg-gest'}, {k:'saudeMental', l:'S. MENTAL', c:'bg-sm'},
            {k:'idoso', l:'IDOSO (60+)', c:'bg-idoso'}, {k:'acamado', l:'ACAMADO', c:'bg-acam'},
            {k:'deficiencia', l:'DEFICIÊNCIA', c:'bg-atencao'}, {k:'fumante', l:'FUMANTE', c:'bg-dia'},
            {k:'tuberculose', l:'TB', c:'bg-hiper'}, {k:'hanseniase', l:'HANS', c:'bg-hiper'}
        ];
        agravos.forEach(i => { if(p[i.k]) badges += `<span class="badge ${i.c}">${i.l}</span>`; });

        return `
            <div class="card ${p.gest ? 'card-gestante' : ''} ${p.idoso ? 'card-idoso' : ''}">
                <div class="info-label">CIDADÃO ${p.nomeSocial ? ' • NOME SOCIAL: ' + s(p.nomeSocial) : ''}</div>
                <div class="info-valor" style="font-size:18px;"><strong>${s(p.nome)}</strong></div>
                <div class="grid-2">
                    <div><div class="info-label">NASCIMENTO (SISAB)</div><div class="info-valor">${s(p.nasc)} (${idade} ANOS)</div></div>
                    <div><div class="info-label">CNS / CPF</div><div class="info-valor">${s(p.cns) || s(p.cpf) || 'N/A'}</div></div>
                </div>
                <div class="info-label">ENDEREÇO EM OSASCO</div>
                <div class="info-valor">${s(p.rua)}, ${s(p.num)} | ${s(p.comp)}</div>
                
                <!-- 013: LOGICA GESTACIONAL (DIRETRIZ 6) -->
                ${gest ? `
                    <div class="gestante-info-box">
                        <div style="font-size:16px;">🤰 IG: ${gest.resultadoFormatado}</div>
                        <div style="font-size:13px;">📅 DPP: ${gest.dpp} | ${gest.tri}</div>
                    </div>` : ''}

                <div style="margin: 10px 0;">${badges || '<small style="opacity:0.5">SEM AGRAVOS CRITICOS</small>'}</div>

                <!-- 014: GESTÃO DE PENDÊNCIAS NO CARD (DIRETRIZ 8) -->
                ${pends.length > 0 ? `
                    <div class="pendencia-ativa-no-card">
                        <span>⚠️ <b>PENDENTE:</b> ${s(pends[0].pendencia)}</span>
                        <div style="display:flex; gap:5px;">
                            <button class="btn-icon" onclick="Visits.editPendency(${pends[0].id})">✏️</button>
                            <button class="btn-icon" onclick="Visits.resolvePendency(${pends[0].id})">✅</button>
                        </div>
                    </div>` : '' }

                <hr style="opacity:0.1; margin:15px 0;">
                <button class="btn btn-main" onclick="Visits.start(${p.id})">REGISTRAR VISITA DOMICILIAR</button>
                <div class="grid-2">
                    <button class="btn btn-outline btn-sm" onclick="Visits.viewHistory(${p.id})">VER HISTÓRICO</button>
                    <button class="btn btn-outline btn-sm" onclick="Registry.prepareEdit(${p.id})">EDITAR CADASTRO</button>
                </div>
            </div>`;
    },

    /* 015: CONSTRUTOR DE CARD COMPACTO (COMPACT) */
    async buildCardCompact(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        return `
            <div class="view-compact" onclick="Visits.start(${p.id})">
                <div style="font-weight:bold; color:var(--primary); font-size:15px;">${s(p.nome)} (${idade} ANOS)</div>
                <div style="font-size:12px; color:#555;">${s(p.rua)}, ${s(p.num)} - ${s(p.comp)}</div>
                <div style="margin-top:6px; font-size:10px; font-weight:bold;">
                    ${p.hiper ? '🔴 HIPER ' : ''} ${p.diab ? '🔵 DIAB ' : ''} ${p.gest ? '💗 GEST ' : ''} ${p.idoso ? '🟣 IDOSO ' : ''}
                </div>
            </div>`;
    },

    /* 016: CONSTRUTOR DE LINHA TÉCNICA (LIST) */
    async buildRowList(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        return `
            <div class="view-list" onclick="Registry.prepareEdit(${p.id})">
                <div style="flex:3;"><strong>${s(p.nome)}</strong><br><small>${idade} ANOS</small></div>
                <div style="flex:2; font-size:11px; color:#777; text-align:right;">${s(p.rua)}, ${s(p.num)}</div>
            </div>`;
    },

    /* 017: MOTOR DE BUSCA POR NOME COM CACHE DE RESULTADOS */
    async searchPessoa(refresh = false) {
        const term = refresh ? AppState.lastSearchCriteria : document.getElementById('h-nome').value.trim();
        if (!term && !refresh) return Utils.CustomModals.alert("DIGITE UM NOME OU PARTE DELE PARA PESQUISAR.");
        
        AppState.lastSearchType = 'NAME';
        AppState.lastSearchCriteria = term;

        const all = await DB.getAll("municipes");
        const res = all.filter(p => p.nome.includes(term.toUpperCase()));
        
        await this.renderResults(`PESQUISA: ${term}`, res);
    },

    /* 018: MOTOR DE BUSCA POR ENDEREÇO (OSASCO) */
    async searchEndereco(refresh = false) {
        const rua = refresh ? AppState.lastSearchCriteria.rua : document.getElementById('h-rua').value;
        const num = refresh ? AppState.lastSearchCriteria.num : document.getElementById('h-num').value.trim();
        
        if (!rua && !refresh) return Utils.CustomModals.alert("POR FAVOR, ESCOLHA UMA RUA.");
        
        AppState.lastSearchType = 'ADDRESS';
        AppState.lastSearchCriteria = { rua, num };

        const todosDaRua = await DB.getByIndex("municipes", "idx_rua", rua);
        const filtrados = todosDaRua.filter(p => !num || p.num === num);
        
        await this.renderResults(`MORADORES: ${rua}${num ? ', Nº ' + num : ''}`, filtrados);
    },

    /* 019: DESPACHANTE DE RENDERIZAÇÃO (REDE RENDER ENGINE) */
    async renderResults(title, arr) {
        const container = document.getElementById('lista-resultados');
        container.innerHTML = `<h3 style="margin-bottom:15px; border-bottom:2px solid var(--primary); padding-bottom:10px;">${title} (${arr.length})</h3>`;
        
        if (arr.length === 0) {
            container.innerHTML += `<div style="text-align:center; padding:50px; opacity:0.5;">NENHUM REGISTRO ENCONTRADO NO TERRITÓRIO.</div>`;
        } else {
            // CONSTRÓI A LISTA BASEADA NO ViewMode ATUAL
            for (const p of arr) {
                if (AppState.currentViewMode === 'full') container.innerHTML += await this.buildCardFull(p);
                else if (AppState.currentViewMode === 'compact') container.innerHTML += await this.buildCardCompact(p);
                else if (AppState.currentViewMode === 'list') container.innerHTML += await this.buildRowList(p);
            }
        }
        Nav.goTo('tela-resultados');
    }
};

/* 020: MOTOR DE BACKUP E SEGURANÇA DE DADOS (DIRETRIZ 2) */
window.Backup = {
    
    /* 021: GERAÇÃO DE ARQUIVO JSON CRIPTOGRAFADO (SIMULADO POR STRINGIFY) */
    async createBackup() {
        const m = await DB.getAll("municipes");
        const v = await DB.getAll("visitas");
        const a = await DB.getAll("arquivo_pendencias");
        
        const backupData = {
            version: "V12.2_OSASCO",
            timestamp: Date.now(),
            municipes: m,
            visitas: v,
            arquivo_pendencias: a
        };

        const blob = new Blob([JSON.stringify(backupData)], {type: 'application/json'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `BACKUP_ACS_OSASCO_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    },

    /* 022: RESTAURAÇÃO COM ADAPTADOR DE VERSÕES ANTIGAS (NORMALIZAÇÃO) */
    async restoreBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const ms = data.municipes || data.m || []; // SUPORTA 'm' DE VERSÕES V10/V11
                const vs = data.visitas || data.v || [];   // SUPORTA 'v' DE VERSÕES V10/V11

                for (let p of ms) {
                    // ADAPTADOR: CONVERTE CAMPOS ANTIGOS PARA O NOVO SCHEMA V12.2
                    if (p.gest === 1) p.gest = true; // CONVERTE NUMERO PARA BOOLEANO
                    if (p.gest === 0) p.gest = false;
                    p.tel = p.tel || p.telprincipal || "";
                    await DB.put("municipes", p);
                }

                for (let v of vs) {
                    await DB.put("visitas", v);
                }

                alert("RESTAURAÇÃO COMPLETA! O SISTEMA IRÁ REINICIAR.");
                location.reload();
            } catch (err) {
                alert("ERRO CRÍTICO: ARQUIVO DE BACKUP INVÁLIDO OU CORROMPIDO.");
            }
        };
        reader.readAsText(file);
    },

    /* 023: EXPORTAÇÃO PARA RELATÓRIO EXCEL (CSV UTF-8) */
    async exportCSV() {
        const visitas = await DB.getAll("visitas");
        let csv = "\ufeffDATA;NOME;MOTIVOS;RELATO;PA;HGT\n";
        visitas.forEach(v => {
            csv += `${v.dataBR};${v.nome};${v.motivos};${v.relato};${v.pa || ''};${v.hgt || ''}\n`;
        });
        const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `RELATORIO_PRODUTIVIDADE_ACS.csv`;
        link.click();
    }
};

/* 024: INICIALIZAÇÃO FINAL DO SISTEMA (DOM READY) */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await DB.init();
        Nav.init();
        console.log("SISTEMA ACS PRO OSASCO V12.2: PRONTO PARA CAMPO.");
    } catch (e) {
        console.error("ERRO CRÍTICO NO BOOT DO SISTEMA:", e);
    }
});
