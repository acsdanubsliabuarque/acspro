/* 001: MOTOR DE ESTADO E NAVEGACAO GLOBAL */
window.AppState = {
    activePatient: null,
    visitStartTime: null,
    history: ['tela-home'],
    unsavedChanges: false,
    currentViewMode: 'full',
    
    markUnsaved() { this.unsavedChanges = true; },
    resetUnsaved() { this.unsavedChanges = false; },
    resetPatient() { this.activePatient = null; this.visitStartTime = null; }
};

/* 002: MOTOR DE ROTAS E DIRECIONAMENTO (NAV) */
window.Nav = {
    init() {
        // 003: POPULA SELECTS DE LOGRADOURO
        const selects = document.querySelectorAll('.select-ruas');
        const opts = `<option value="">ESCOLHA O LOGRADOURO...</option>` + 
                     CONFIG_DB.RUAS.map(r => `<option value="${r}">${r}</option>`).join('');
        selects.forEach(s => s.innerHTML = opts);

        // 004: MOTOR GLOBAL DE MAIUSCULAS E MASCARAS
        document.addEventListener('input', (e) => {
            const el = e.target;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = el.value.toUpperCase(); // 005: FORCA TUDO EM MAIUCULO
            }
            // 006: APLICA MASCARAS DINAMICAS DO UTILS.JS
            if (['c-nasc', 'c-dum'].includes(el.id)) el.value = Utils.masks.date(el.value);
            if (el.id === 'c-cpf') el.value = Utils.masks.cpf(el.value);
            if (el.id === 'c-tel') el.value = Utils.masks.phone(el.value);
        });
    },

    goTo(id, reset = false) {
        if (reset) this.history = ['tela-home'];
        else if (this.history[this.history.length - 1] !== id) this.history.push(id);
        
        document.querySelectorAll('.container > div').forEach(d => d.classList.add('hidden'));
        const target = document.getElementById(id);
        if (target) {
            target.classList.remove('hidden');
            window.scrollTo(0, 0);
        } else {
            console.error("FALHA AO ENCONTRAR TELA:", id);
        }
    },

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

    async confirmExit(dest) {
        if (AppState.unsavedChanges) {
            const r = await Utils.CustomModals.confirm("DADOS NÃO SALVOS SERÃO PERDIDOS! DESEJA REALMENTE SAIR?");
            if (!r) return;
        }
        AppState.resetUnsaved();
        if (dest === 'voltar') this.goBack();
        else this.goTo(dest, true);
    }
};

/* 007: MOTOR DE INTERFACE (UI) PARA CONSTRUIR OS CARDS */
window.UI = {
    changeView(mode) {
        AppState.currentViewMode = mode;
        const last = document.getElementById('lista-resultados').getAttribute('data-last-search');
        if (last) this.searchPessoa(true);
    },

    async buildCardFull(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        const gest = p.gest ? Utils.getGestationalInfo(p.dum) : null;
        const pends = (await DB.getByIndex("visitas", "pacienteId", p.id)).filter(v => v.pendencia && !v.resolvida);

        let badges = "";
        const agravos = [
            {k:'hiper', l:'HIPERTENSÃO', c:'bg-hiper'}, {k:'diab', l:'DIABETES', c:'bg-dia'},
            {k:'gest', l:'GESTANTE', c:'bg-gest'}, {k:'saudeMental', l:'S. MENTAL', c:'bg-saudemental'},
            {k:'idoso', l:'IDOSO (60+)', c:'bg-idoso'}, {k:'acamado', l:'ACAMADO', c:'bg-acam'}
        ];
        agravos.forEach(i => { if(p[i.k]) badges += `<span class="badge ${i.c}">${i.l}</span>`; });

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
                <div style="margin: 10px 0;">${badges || '<small>SEM AGRAVOS</small>'}</div>
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

    async buildCardCompact(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        return `
            <div class="view-compact" onclick="Visits.start(${p.id})">
                <div style="font-weight:bold; color:var(--primary);">${s(p.nome)} (${idade} ANOS)</div>
                <div style="font-size:11px;">${s(p.rua)}, ${s(p.num)} - ${s(p.comp)}</div>
                <div style="margin-top:4px; font-size:10px;">
                    ${p.hiper ? '🔴HIPER ' : ''} ${p.diab ? '🔵DIAB ' : ''} ${p.gest ? '💗GEST ' : ''} ${p.idoso ? '🟣IDOSO ' : ''}
                </div>
            </div>`;
    },

    async buildRowList(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        return `
            <div class="view-list" onclick="Registry.prepareEdit(${p.id})">
                <div style="flex:3;"><strong>${s(p.nome)}</strong><br><small>${idade} ANOS</small></div>
                <div style="flex:2; font-size:10px; color:#666;">${s(p.rua)}, ${p.num}</div>
                <div style="flex:1; text-align:right;">${p.gest ? '🤰' : ''} ${p.hiper || p.diab ? '💊' : ''}</div>
            </div>`;
    },

    async searchPessoa(refresh = false) {
        const term = document.getElementById('h-nome').value.toUpperCase().trim();
        if (!term && !refresh) return Utils.CustomModals.alert("DIGITE UM NOME OU PARTE DELE.");
        
        const all = await DB.getAll("municipes");
        const res = all.filter(p => p.nome.includes(term));
        
        await this.renderList(`PESQUISA: ${term}`, res);
        document.getElementById('lista-resultados').setAttribute('data-last-search', term);
    },

    async searchEndereco() {
        const rua = document.getElementById('h-rua').value;
        const num = document.getElementById('h-num').value.trim();
        if (!rua) return Utils.CustomModals.alert("ESCOLHA A RUA.");
        
        const todos = await DB.getByIndex("municipes", "rua", rua);
        const filtrado = todos.filter(p => !num || p.num === num);
        
        await this.renderList(`LISTA: ${rua}`, filtrado);
    },

    async renderList(title, arr) {
        const container = document.getElementById('lista-resultados');
        container.innerHTML = `<h3>${title} (${arr.length})</h3>`;
        
        if (arr.length === 0) {
            container.innerHTML += "<p style='text-align:center; padding:20px; opacity:0.5;'>NENHUM REGISTRO ENCONTRADO.</p>";
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

/* 008: MOTOR DE BACKUP (JSON) */
window.Backup = {
    async createBackup() {
        const m = await DB.getAll("municipes");
        const v = await DB.getAll("visitas");
        const a = await DB.getAll("arquivo_pendencias");
        const b = { municipes: m, visitas: v, arquivo_pendencias: a, version: "V12.2_OSASCO" };
        const blob = new Blob([JSON.stringify(b)], {type: 'application/json'});
        const lnk = document.createElement('a'); lnk.href = URL.createObjectURL(blob); lnk.download = `BACKUP_ACS_${Date.now()}.json`; lnk.click();
    },

    async restoreBackup(event) {
        const f = event.target.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = async (e) => {
            try {
                const d = JSON.parse(e.target.result);
                const ms = d.municipes || d.m || [];
                const vs = d.visitas || d.v || [];
                for (let p of ms) await DB.put("municipes", p);
                for (let vt of vs) await DB.put("visitas", vt);
                alert("RESTAURADO COM SUCESSO!");
                location.reload();
            } catch (err) { alert("ERRO: ARQUIVO INVÁLIDO."); }
        };
        rd.readAsText(f);
    },

    async exportCSV() {
        const vs = await DB.getAll("visitas");
        let csv = "\ufeffDATA;NOME;MOTIVOS;RELATO;PA\n";
        vs.forEach(v => { csv += `${v.dataBR};${v.nome};${v.motivos};${v.relato};${v.pa || ''}\n`; });
        const bl = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
        const l = document.createElement('a'); l.href = URL.createObjectURL(bl); l.download = `RELATORIO_VISITAS.csv`; l.click();
    }
};

/* 009: INICIALIZAÇÃO FINAL DO SISTEMA */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await DB.init();
        Nav.init();
        console.log("ACS PRO OSASCO 12.2 - PRONTO PARA USO.");
    } catch (e) {
        console.error("FALHA NA CARGA DO SISTEMA:", e);
    }
});
