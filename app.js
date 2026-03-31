// 029: ESTADO GLOBAL DA APLICACAO E GESTAO DE ESTADOS (OSASCO V12.2)
const AppState = {
    activePatient: null,
    visitStartTime: null,
    history: ['tela-home'],
    unsavedChanges: false,
    currentViewMode: 'full', // 030: MODOS SUPORTADOS: 'full', 'compact', 'list'
    
    markUnsaved() { this.unsavedChanges = true; },
    resetUnsaved() { this.unsavedChanges = false; },
    resetPatient() { this.activePatient = null; this.visitStartTime = null; }
};

// 031: MOTOR DE NAVEGACAO (NAVIGATION ENGINE) COM GESTAO DE PILHA DE MEMORIA
const Nav = {
    init() {
        // 032: ALIMENTACAO DOS SELECTS DE LOGRADOURO EM TODO O SISTEMA
        const selects = document.querySelectorAll('.select-ruas');
        const options = `<option value="">ESCOLHA O LOGRADOURO...</option>` + 
                        CONFIG_DB.RUAS.map(r => `<option value="${r}">${r}</option>`).join('');
        selects.forEach(s => s.innerHTML = options);

        // 033: LISTENER MESTRE PARA FORCAR MAIUSCULAS E APLICAR MASCARAS DINAMICAS
        document.addEventListener('input', (e) => {
            const el = e.target;
            // 034: CONVERSÃO GLOBAL PARA MAIÚSCULAS CONFORME REGRA DE NEGOCIO
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = el.value.toUpperCase();
            }
            // 035: ACIONAMENTO DOS MOTORES DE MASCARA DO UTILS.JS
            if (['c-nasc', 'c-dum'].includes(el.id)) el.value = Utils.masks.date(el.value);
            if (el.id === 'c-cpf') el.value = Utils.masks.cpf(el.value);
            if (el.id === 'c-tel') el.value = Utils.masks.phone(el.value);
        });
    },

    // 036: TRANSICAO ENTRE TELAS COM LIMPEZA DE CONTAINER
    goTo(id, reset = false) {
        if (reset) this.history = ['tela-home'];
        else if (this.history[this.history.length - 1] !== id) this.history.push(id);
        
        document.querySelectorAll('.container > div').forEach(d => d.classList.add('hidden'));
        const target = document.getElementById(id);
        if (target) target.classList.remove('hidden');
        window.scrollTo(0, 0);
    },

    // 037: RETORNO SEGURO PELA PILHA DE HISTORICO
    goBack() {
        if (this.history.length > 1) {
            this.history.pop();
            const prev = this.history[this.history.length - 1];
            this.goTo(prev);
            this.history.pop(); 
        } else {
            this.goTo('tela-home', true);
        }
    },

    // 038: MODAL DE CONFIRMACAO PARA SAIDA DE TELAS COM DADOS SENSIVEIS
    async confirmExit(dest) {
        if (AppState.unsavedChanges) {
            const r = await Utils.CustomModals.confirm("DADOS NÃO SALVOS SERÃO PERDIDOS! SAIR?");
            if (!r) return;
        }
        AppState.resetUnsaved();
        if (dest === 'voltar') this.goBack();
        else this.goTo(dest, true);
    }
};

// 039: MOTOR DE RENDERIZACAO DE INTERFACE (UI ENGINE)
const UI = {
    // 040: ALTERA O MODO DE EXIBICAO E RE-PROCESSA A BUSCA ATIVA
    changeView(mode) {
        AppState.currentViewMode = mode;
        const last = document.getElementById('lista-resultados').getAttribute('data-last-search');
        if (last) this.searchPessoa(true);
    },

    // 041: CONSTRUTOR DO CARD MODO FULL (IMAGEM REFERENCIA)
    async buildCardFull(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        const gest = p.gest ? Utils.getGestationalInfo(p.dum) : null;
        const visitas = await DB.getByIndex("visitas", "pacienteId", p.id);
        const pends = visitas.filter(v => v.pendencia && !v.resolvida);

        let badges = "";
        const agravos = [
            {k:'hiper', l:'HIPERTENSÃO', c:'bg-hiper'}, {k:'diab', l:'DIABETES', c:'bg-dia'},
            {k:'gest', l:'GESTANTE', c:'bg-gest'}, {k:'saudeMental', l:'S. MENTAL', c:'bg-saudemental'},
            {k:'idoso', l:'IDOSO (60+)', c:'bg-idoso'}, {k:'acamado', l:'ACAMADO', c:'bg-acam'}
        ];
        agravos.forEach(i => { if(p[i.k]) badges += `<span class="badge ${i.c}">${i.l}</span>`; });

        // 042: HIERARQUIA VISUAL COM INVERSÃO (GESTAÇÃO ACIMA DAS BADGES)
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
                
                ${gest ? `<div class="gestante-badge-info">IG: ${gest.res} <br> DPP: ${gest.dpp} | ${gest.tri}</div>` : ''}
                
                <div style="margin: 10px 0;">${badges || '<small>SEM AGRAVOS REGISTRADOS</small>'}</div>
                
                ${pends.length > 0 ? `
                    <div class="pendencia-ativa-no-card">
                        <span>⚠️ PENDENTE: ${s(pends[0].pendencia)}</span>
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

    // 043: CONSTRUTOR DO MODO COMPACTO
    async buildCardCompact(p) {
        const s = Utils.sanitize;
        return `
            <div class="view-compact" onclick="Visits.start(${p.id})">
                <div style="font-weight:bold; color:var(--primary);">${s(p.nome)} (${Utils.calculateAge(p.nasc)} ANOS)</div>
                <div style="font-size:11px;">${s(p.rua)}, ${s(p.num)} - ${s(p.comp)}</div>
                <div style="margin-top:4px; font-size:10px;">
                    ${p.hiper ? '🔴HIPER ' : ''} ${p.diab ? '🔵DIAB ' : ''} ${p.gest ? '💗GEST ' : ''} ${p.idoso ? '🟣IDOSO ' : ''}
                </div>
            </div>`;
    },

    // 044: CONSTRUTOR DO MODO LISTA (ITEM 3 SOLICITADO)
    async buildRowList(p) {
        const s = Utils.sanitize;
        const visitas = await DB.getByIndex("visitas", "pacienteId", p.id);
        const hasPend = visitas.some(v => v.pendencia && !v.resolvida);
        return `
            <div class="view-list" onclick="Registry.prepareEdit(${p.id})">
                <div style="flex:3;"><strong>${s(p.nome)}</strong><br><small>${s(p.nasc)} (${Utils.calculateAge(p.nasc)} ANOS)</small></div>
                <div style="flex:2; font-size:10px; color:#666;">${s(p.rua)}, ${p.num}</div>
                <div style="flex:1; text-align:right;">
                    ${hasPend ? '⚠️' : ''} ${p.gest ? '🤰' : ''} ${p.hiper || p.diab ? '💊' : ''}
                </div>
            </div>`;
    },

    // 045: BUSCA POR NOME COM SUPORTE AOS MODOS DE VISAO
    async searchPessoa(refresh = false) {
        const term = document.getElementById('h-nome').value.toUpperCase().trim();
        if (!term && !refresh) return Utils.CustomModals.alert("DIGITE UM NOME.");
        
        const all = await DB.getAll("municipes");
        const res = all.filter(p => p.nome.includes(term));
        
        this.renderList(`PESQUISA: ${term}`, res);
        document.getElementById('lista-resultados').setAttribute('data-last-search', term);
    },

    // 046: BUSCA POR ENDERECO
    async searchEndereco() {
        const rua = document.getElementById('h-rua').value;
        const num = document.getElementById('h-num').value.trim();
        if (!rua) return Utils.CustomModals.alert("ESCOLHA A RUA.");
        
        const todos = await DB.getByIndex("municipes", "rua", rua);
        const filtrado = todos.filter(p => !num || p.num === num);
        
        this.renderList(`${rua} ${num ? ', ' + num : ''}`, filtrado);
    },

    // 047: MOTOR DE RENDERIZACAO DE LISTAS (DISTRIBUIDOR DE MODOS)
    async renderList(title, arr) {
        const container = document.getElementById('lista-resultados');
        container.innerHTML = `<h3 style="margin-bottom:15px; border-bottom:2px solid #ddd; padding-bottom:10px;">${title} (${arr.length})</h3>`;
        
        if (arr.length === 0) {
            container.innerHTML += "<p style='text-align:center; opacity:0.5; padding:40px;'>NENHUM REGISTRO ENCONTRADO.</p>";
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

// 048: MOTOR DE BACKUP, RESTAURACAO E NORMALIZACAO DE DADOS
const Backup = {
    // 049: GERA ARQUIVO DE BACKUP COMPLETO DOindexedDB
    async createBackup() {
        const m = await DB.getAll("municipes");
        const v = await DB.getAll("visitas");
        const a = await DB.getAll("arquivo_pendencias");
        const b = { municipes: m, visitas: v, arquivo_pendencias: a, export_date: new Date().toISOString(), version: "V12.2_PRO_OSASCO" };
        const blob = new Blob([JSON.stringify(b)], {type: 'application/json'});
        const lnk = document.createElement('a');
        lnk.href = URL.createObjectURL(blob); lnk.download = `BACKUP_ACS_PRO_${Date.now()}.json`; lnk.click();
    },

    // 050: RESTAURA E NORMALIZA REGISTROS ANTIGOS (CURA DE BANCO)
    async restoreBackup(event) {
        const f = event.target.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = async (e) => {
            try {
                const d = JSON.parse(e.target.result);
                const ms = d.municipes || d.m || [];
                const vs = d.visitas || d.v || [];
                for (let p of ms) {
                    if (p.saudeMental === undefined) p.saudeMental = false;
                    if (p.idoso === undefined) p.idoso = (Utils.calculateAge(p.nasc) >= 60);
                    if (!p.comp) p.comp = "CASA ÚNICA";
                    await DB.put("municipes", p);
                }
                for (let vt of vs) await DB.put("visitas", vt);
                await Utils.CustomModals.alert("BACKUP RESTAURADO COM SUCESSO!");
                location.reload();
            } catch (err) { Utils.CustomModals.alert("ERRO: ARQUIVO DE BACKUP INVÁLIDO."); }
        };
        rd.readAsText(f);
    }
};

// 051: INICIALIZAÇÃO DEFINITIVA DO SISTEMA
document.addEventListener('DOMContentLoaded', async () => {
    await DB.init();
    Nav.init();
    console.log("SISTEMA ACS PRO OSASCO V12.2 OPERACIONAL.");
});
