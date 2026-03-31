// 001: ESTADO GLOBAL DA APLICACAO (STATE MANAGEMENT)
// 002: CONTROLA NAVEGACAO, HISTORICO DE TELAS E MODO DE VISUALIZACAO ATIVO
const AppState = {
    activePatient: null,
    visitStartTime: null,
    history: ['tela-home'],
    unsavedChanges: false,
    currentViewMode: 'full', // 003: Opcoes: 'full', 'compact', 'list'
    
    // 004: GESTAO DE MODIFICACOES NAO SALVAS
    markUnsaved() { this.unsavedChanges = true; },
    resetUnsaved() { this.unsavedChanges = false; },
    
    // 005: LIMPEZA DE ESTADOS PARA NOVO ACESSO
    resetPatient() {
        this.activePatient = null;
        this.visitStartTime = null;
    }
};

// 006: MOTOR DE NAVEGACAO ENTRE TELAS (ROUTER)
const Nav = {
    // 007: INICIALIZA LOGRADOUROS E EVENTOS GLOBAIS
    init() {
        const selectsRua = document.querySelectorAll('.select-ruas');
        const options = `<option value="">SELECIONE A RUA / LOGRADOURO...</option>` + 
                        CONFIG_DB.RUAS.map(r => `<option value="${r}">${r}</option>`).join('');
        selectsRua.forEach(s => s.innerHTML = options);

        // 008: LISTENER GLOBAL PARA FORCAR MAIUSCULAS E APLICAR MASCARAS
        document.addEventListener('input', (e) => {
            const el = e.target;
            // 009: REGRA DE OURO: TUDO EM MAIUSCULO NO SISTEMA (SOLICITACAO OSASCO)
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = el.value.toUpperCase();
            }
            // 010: ACIONAMENTO DINAMICO DE MASCARAS DO UTILS.JS
            if (['c-nasc', 'c-dum', 'b-resp-nasc'].includes(el.id)) el.value = Utils.masks.date(el.value);
            if (el.id === 'c-cpf') el.value = Utils.masks.cpf(el.value);
            if (el.id === 'c-tel') el.value = Utils.masks.phone(el.value);
        });
    },

    // 011: NAVEGACAO PARA UMA TELA ESPECIFICA
    goTo(id, reset = false) {
        if (reset) this.history = ['tela-home'];
        else if (this.history[this.history.length - 1] !== id) this.history.push(id);
        
        document.querySelectorAll('.container > div').forEach(d => d.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        window.scrollTo(0, 0);
    },

    // 012: FUNCAO DE RETORNO (VOLTAR) COM PILHA DE HISTORICO
    goBack() {
        if (this.history.length > 1) {
            this.history.pop();
            const prev = this.history[this.history.length - 1];
            this.goTo(prev);
            this.history.pop(); // 013: Evita duplicar na pilha ao voltar
        } else {
            this.goTo('tela-home', true);
        }
    },

    // 014: CONFIRMACAO DE SAIDA PARA SEGURANCA DE DADOS
    async confirmExit(dest) {
        if (AppState.unsavedChanges) {
            const res = await Utils.CustomModals.confirm("DADOS NÃO SALVOS SERÃO PERDIDOS! DESEJA SAIR?");
            if (!res) return;
        }
        AppState.resetUnsaved();
        if (dest === 'voltar') this.goBack();
        else this.goTo(dest, true);
    }
};

// 015: MOTOR DE INTERFACE HUMANA (UI ENGINE)
// 016: RESPONSAVEL PELA RENDERIZACAO DOS 3 MODOS DE CARDS SOLICITADOS
const UI = {
    // 017: ALTERA O MODO DE EXIBICAO DOS RESULTADOS
    changeView(mode) {
        AppState.currentViewMode = mode;
        const lastSearch = document.getElementById('lista-resultados').getAttribute('data-last-search');
        if (lastSearch) this.searchPessoa(true); // 018: Re-executa a busca no novo modo
    },

    // 019: CONSTRUTOR DO CARD NO MODO FULL (O QUE APARECEU NA IMAGEM)
    async buildCardFull(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        let badges = "";
        
        // 020: MAPEAMENTO DE AGRAVOS PARA BADGES COLORIDAS
        const list = [
            {k:'hiper', l:'HIPERTENSÃO', c:'bg-hiper'}, {k:'diab', l:'DIABETES', c:'bg-dia'},
            {k:'gest', l:'GESTANTE', c:'bg-gest'}, {k:'saudeMental', l:'S. MENTAL', c:'bg-saudemental'},
            {k:'idoso', l:'IDOSO (60+)', c:'bg-idoso'}, {k:'acamado', l:'ACAMADO', c:'bg-acam'}
        ];
        list.forEach(i => { if(p[i.k]) badges += `<span class="badge ${i.c}">${i.l}</span>`; });

        // 021: INVERSAO DE POSICAO: DADOS DA GESTACAO ACIMA DAS BADGES (SOLICITACAO OSASCO)
        const gestInfo = p.gest ? Utils.getGestationalInfo(p.dum) : null;
        
        // 022: BUSCA DE PENDENCIAS ATIVAS PARA O QUADRO AMARELO
        const visitas = await DB.getByIndex("visitas", "pacienteId", p.id);
        const pends = visitas.filter(v => v.pendencia && !v.resolvida);

        return `
            <div class="card ${p.gest ? 'card-gestante' : ''} ${p.idoso ? 'card-idoso' : ''}">
                <div class="info-label">CIDADÃO</div>
                <div class="info-valor" style="font-size:18px;"><strong>${s(p.nome)}</strong></div>
                
                <div class="grid-2">
                    <div><div class="info-label">NASCIMENTO</div><div class="info-valor">${s(p.nasc)} (${idade} ANOS)</div></div>
                    <div><div class="info-label">RAÇA/COR</div><div class="info-valor">${s(p.raca)}</div></div>
                </div>

                <div class="info-label">ENDEREÇO</div>
                <div class="info-valor">${s(p.rua)}, ${s(p.num)} | ${s(p.comp)}</div>

                ${gestInfo ? `
                    <div class="gestante-badge-info">
                        IG: ${gestInfo.res} <br> 
                        DPP: ${gestInfo.dpp} | ${gestInfo.tri}
                    </div>
                ` : ''}

                <div style="margin: 10px 0;">${badges || '<small>SEM AGRAVOS REGISTRADOS</small>'}</div>

                ${pends.length > 0 ? `
                    <div class="pendencia-ativa-no-card">
                        <span>⚠️ PENDENTE: ${s(pends[0].pendencia)}</span>
                        <div>
                            <button class="btn-icon" onclick="Visits.editPendency(${pends[0].id})">✏️</button>
                            <button class="btn-icon" onclick="Visits.resolvePendency(${pends[0].id})">✅</button>
                        </div>
                    </div>
                ` : ''}

                <hr style="opacity:0.1; margin:15px 0;">
                <button class="btn btn-main" onclick="Visits.start(${p.id})">REGISTRAR VISITA</button>
                <div class="grid-2">
                    <button class="btn btn-outline btn-sm" onclick="Visits.viewHistory(${p.id})">HISTÓRICO</button>
                    <button class="btn btn-outline btn-sm" onclick="Registry.prepareEdit(${p.id})">EDITAR CADASTRO</button>
                </div>
            </div>`;
    },

    // 023: CONSTRUTOR DO CARD MODO COMPACTO (ITEM 2 SOLICITADO)
    async buildCardCompact(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        return `
            <div class="view-compact" onclick="Visits.start(${p.id})">
                <div style="font-weight:bold; color:var(--primary);">${s(p.nome)} (${idade} ANOS)</div>
                <div style="font-size:11px;">${s(p.rua)}, ${s(p.num)} - ${s(p.comp)}</div>
                <div style="margin-top:4px;">
                    ${p.hiper ? '🔴HIPER ' : ''} ${p.diab ? '🔵DIAB ' : ''} ${p.gest ? '💗GEST ' : ''}
                </div>
            </div>`;
    },

    // 024: CONSTRUTOR DO MODO LISTA (ITEM 3 SOLICITADO)
    async buildRowList(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        const hasPend = (await DB.getByIndex("visitas", "pacienteId", p.id)).some(v => v.pendencia && !v.resolvida);
        
        return `
            <div class="view-list" onclick="Registry.prepareEdit(${p.id})">
                <div style="flex:2"><strong>${s(p.nome)}</strong><br><small>${s(p.nasc)} (${idade} ANOS)</small></div>
                <div style="flex:2; font-size:10px;">${s(p.rua)}, ${p.num}</div>
                <div style="flex:1; text-align:right;">
                    ${hasPend ? '⚠️' : ''} ${p.gest ? '🤰' : ''} ${p.hiper || p.diab ? '💊' : ''}
                </div>
            </div>`;
    },

    // 025: BUSCA POR NOME COM SUPORTE AOS 3 MODOS DE VISAO
    async searchPessoa(refresh = false) {
        const term = document.getElementById('h-nome').value.toUpperCase().trim();
        if (!term && !refresh) return Utils.CustomModals.alert("DIGITE UM NOME OU PARTE DELE.");
        
        const all = await DB.getAll("municipes");
        const filtrado = all.filter(p => p.nome.includes(term));
        
        this.renderList(`PESQUISA: ${term}`, filtrado);
        document.getElementById('lista-resultados').setAttribute('data-last-search', term);
    },

    // 026: BUSCA POR ENDERECO
    async searchEndereco() {
        const rua = document.getElementById('h-rua').value;
        const num = document.getElementById('h-num').value.trim();
        if (!rua) return Utils.CustomModals.alert("ESCOLHA A RUA PARA FILTRAR.");
        
        const todosNaRua = await DB.getByIndex("municipes", "rua", rua);
        const filtrado = todosNaRua.filter(p => !num || p.num === num);
        
        this.renderList(`${rua} ${num ? ', ' + num : ''}`, filtrado);
    },

    // 027: MOTOR DE RENDERIZACAO DE LISTAS (SELECTOR DE MODO)
    async renderList(title, arr) {
        const container = document.getElementById('lista-resultados');
        container.innerHTML = `<h3 style="margin-bottom:15px;">${title} (${arr.length})</h3>`;
        
        if (arr.length === 0) {
            container.innerHTML += "<p style='text-align:center;'>NADA ENCONTRADO NA BASE DE DADOS.</p>";
        } else {
            for (const p of arr) {
                // 028: ESCOLHE O BUILDER BASEADO NO MODO ATIVO
                if (AppState.currentViewMode === 'full') container.innerHTML += await this.buildCardFull(p);
                else if (AppState.currentViewMode === 'compact') container.innerHTML += await this.buildCardCompact(p);
                else if (AppState.currentViewMode === 'list') container.innerHTML += await this.buildRowList(p);
            }
        }
        Nav.goTo('tela-resultados');
    }
};

// 029: MOTOR DE BACKUP E RESTAURACAO COM NORMALIZACAO (SISTEMA OSASCO)
const Backup = {
    // 030: GERA ARQUIVO JSON PARA BACKUP COMPLETO
    async createBackup() {
        const m = await DB.getAll("municipes");
        const v = await DB.getAll("visitas");
        const a = await DB.getAll("arquivo_pendencias");
        
        const backupData = { 
            municipes: m, 
            visitas: v, 
            arquivo_pendencias: a,
            export_date: new Date().toISOString(),
            version: "V12.2_PRO_OSASCO" 
        };
        
        const blob = new Blob([JSON.stringify(backupData)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `BACKUP_OSASCO_ACS_${Date.now()}.json`;
        link.click();
    },

    // 031: RESTAURA BACKUP E NORMALIZA DADOS (EVITA UNDEFINED EM VERSOES ANTIGAS)
    async restoreBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const ms = data.municipes || data.m || [];
                const vs = data.visitas || data.v || [];

                for (let p of ms) {
                    // 032: NORMALIZACAO: GARANTE QUE NOVOS CAMPOS EXISTAM NO BACKUP ANTIGO
                    if (p.saudeMental === undefined) p.saudeMental = false;
                    if (p.idoso === undefined) p.idoso = (Utils.calculateAge(p.nasc) >= 60);
                    if (!p.comp) p.comp = "CASA ÚNICA";
                    await DB.put("municipes", p);
                }
                for (let v of vs) await DB.put("visitas", v);

                await Utils.CustomModals.alert("BACKUP RESTAURADO E DADOS NORMALIZADOS!");
                location.reload();
            } catch (err) {
                Utils.CustomModals.alert("ERRO AO IDENTIFICAR ARQUIVO DE BACKUP: " + err.message);
            }
        };
        reader.readAsText(file);
    },

    // 033: EXPORTACAO EM CSV (SIMPLIFICADA PARA EXCEL)
    async exportCSV() {
        const vs = await DB.getAll("visitas");
        let csv = "\ufeffDATA;NOME;MOTIVOS;RELATO;PA;HGT;PENDENCIA\n";
        vs.forEach(v => {
            csv += `${v.dataBR};${v.nome};${v.motivos};${v.relato};${v.pa || ''};${v.hgt || ''};${v.pendencia || ''}\n`;
        });
        const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `PRODUTIVIDADE_OSASCO_${Date.now()}.csv`;
        a.click();
    }
};

// 034: INICIALIZACAO DO SISTEMA
document.addEventListener('DOMContentLoaded', async () => {
    await DB.init();
    Nav.init();
    console.log("ACS PRO OSASCO 12.2 TOTALMENTE CARREGADO.");
});
