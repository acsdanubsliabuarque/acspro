/* 001: MOTOR DE ESTADO E NAVEGACAO - CORE */
window.AppState = {
    activePatient: null, history: ['tela-home'], currentViewMode: 'full',
    lastSearchType: null, lastSearchData: null
};

window.Nav = {
    init() {
        const selects = document.querySelectorAll('.select-ruas');
        const opts = `<option value="">--- SELECIONE A RUA ---</option>` + CONFIG_DB.RUAS.map(r => `<option value="${r}">${r}</option>`).join('');
        selects.forEach(s => s.innerHTML = opts);
        
        document.addEventListener('input', (e) => {
            const el = e.target;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = el.value.toUpperCase();
            if (['c-nasc', 'c-dum', 'v-data'].includes(el.id)) el.value = Utils.masks.date(el.value);
            if (el.id === 'v-pa') el.value = Utils.masks.pa(el.value);
            if (el.id === 'c-cpf') el.value = Utils.masks.cpf(el.value);
        });
    },
    goTo(id, reset = false) {
        if (reset) AppState.history = ['tela-home'];
        else if (AppState.history[AppState.history.length-1] !== id) AppState.history.push(id);
        document.querySelectorAll('.container > div').forEach(d => d.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        window.scrollTo(0,0);
    },
    goBack() { AppState.history.pop(); this.goTo(AppState.history[AppState.history.length-1]); AppState.history.pop(); }
};

window.UI = {
    /* 002: TROCA DE MODO DE VISUALIZACAO (DIRETRIZ 9) */
    async changeView(mode) {
        AppState.currentViewMode = mode;
        if (AppState.lastSearchType === 'name') await this.searchPessoa(true);
        else if (AppState.lastSearchType === 'address') await this.searchEndereco(true);
    },

    async buildCard(p) {
        const idade = Utils.calculateAge(p.nasc);
        const gest = p.gest ? Utils.getGestationalInfo(p.dum) : null;
        const pends = (await DB.getByIndex("visitas", "pacienteId", p.id)).filter(v => v.pendencia && !v.resolvida);

        /* 003: MODO COMPACTO */
        if (AppState.currentViewMode === 'compact') {
            return `<div class="card" style="padding:10px; border-left-width:5px" onclick="Visits.start(${p.id})">
                <b>${p.nome} (${idade})</b><br><small>${p.rua}, ${p.num}</small>
            </div>`;
        }
        /* 004: MODO LISTA */
        if (AppState.currentViewMode === 'list') {
            return `<div style="padding:10px; background:#fff; border-bottom:1px solid #eee; font-size:12px" onclick="Registry.prepareEdit(${p.id})">
                <b>${p.nome}</b> - ${p.nasc} - ${p.rua} ${pends.length?'⚠️':''}
            </div>`;
        }
        /* 005: MODO FULL (PADRAO) */
        let badges = "";
        if(p.hiper) badges += `<span class="badge bg-hiper">HIPERTENSÃO</span>`;
        if(p.diab) badges += `<span class="badge bg-dia">DIABETES</span>`;
        if(p.gest) badges += `<span class="badge bg-gest">GESTANTE</span>`;
        if(idade >= 60) badges += `<span class="badge bg-idoso">IDOSO</span>`;
        if(p.saudeMental) badges += `<span class="badge bg-sm">S. MENTAL</span>`;

        return `
            <div class="card ${p.gest ? 'card-gestante' : ''} ${idade >= 60 ? 'card-idoso' : ''}">
                <div class="info-label">CIDADÃO ${p.nomeSocial?'• '+p.nomeSocial:''}</div>
                <div class="info-valor"><strong>${p.nome}</strong></div>
                <div class="grid-2">
                    <div><div class="info-label">NASCIMENTO</div><div>${p.nasc} (${idade} ANOS)</div></div>
                    <div><div class="info-label">CPF</div><div>${p.cpf||'---'}</div></div>
                </div>
                <div class="info-label">ENDEREÇO</div>
                <div>${p.rua}, ${p.num} | ${p.comp}</div>
                ${gest ? `<div class="gestante-info-box">🤰 IG: ${gest.res}<br>📅 DPP: ${gest.dpp} | ${gest.tri}</div>` : ''}
                <div style="margin:8px 0">${badges}</div>
                ${pends.length ? `<div class="pendencia-ativa-no-card"><span>⚠️ ${pends[0].pendencia}</span><button class="btn-icon" onclick="Visits.resolvePendency(${pends[0].id})">✅</button></div>` : ''}
                <button class="btn btn-main" onclick="Visits.start(${p.id})">REGISTRAR VISITA</button>
                <div class="grid-2">
                    <button class="btn btn-outline btn-sm" onclick="Visits.viewHistory(${p.id})">HISTÓRICO</button>
                    <button class="btn btn-outline btn-sm" onclick="Registry.prepareEdit(${p.id})">EDITAR</button>
                </div>
            </div>`;
    },

    async searchPessoa(refresh = false) {
        const term = refresh ? AppState.lastSearchData : document.getElementById('h-nome').value.trim();
        if (!term && !refresh) return;
        AppState.lastSearchType = 'name'; AppState.lastSearchData = term;
        const all = await DB.getAll("municipes");
        const res = all.filter(p => p.nome.includes(term.toUpperCase()));
        await this.renderList(`PESQUISA: ${term}`, res);
    },

    async searchEndereco(refresh = false) {
        const rua = refresh ? AppState.lastSearchData.rua : document.getElementById('h-rua').value;
        const num = refresh ? AppState.lastSearchData.num : document.getElementById('h-num').value;
        if (!rua && !refresh) return;
        AppState.lastSearchType = 'address'; AppState.lastSearchData = { rua, num };
        const moradores = await DB.getByIndex("municipes", "rua", rua);
        const res = moradores.filter(p => !num || p.num === num);
        await this.renderList(`MORADORES: ${rua}`, res);
    },

    async renderList(title, arr) {
        const container = document.getElementById('lista-resultados');
        container.innerHTML = `<h3>${title} (${arr.length})</h3>`;
        let html = "";
        for (const p of arr) html += await this.buildCard(p);
        container.innerHTML += html;
        Nav.goTo('tela-resultados');
    }
};

/* 006: MOTOR DE BACKUP (DIRETRIZ 2) */
window.Backup = {
    async createBackup() {
        const m = await DB.getAll("municipes");
        const v = await DB.getAll("visitas");
        const dump = JSON.stringify({ m, v, version: "V12.2" });
        const blob = new Blob([dump], {type: 'application/json'});
        const lnk = document.createElement('a'); lnk.href = URL.createObjectURL(blob);
        lnk.download = `BACKUP_ACS_${Date.now()}.json`; lnk.click();
    },
    async restoreBackup(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = JSON.parse(e.target.result);
            const ms = data.m || data.municipes || [];
            const vs = data.v || data.visitas || [];
            for (let p of ms) {
                p.comp = p.comp || "CASA ÚNICA";
                p.gest = (p.gest === 1 || p.gest === true);
                p.hiper = !!(p.hiper || p.hipertenso);
                p.saudeMental = !!(p.saudeMental || p.mental);
                p.tel = p.tel || p.telprincipal || "";
                await DB.put("municipes", p);
            }
            for (let v of vs) await DB.put("visitas", v);
            alert("RESTAURADO COM SUCESSO!"); location.reload();
        };
        reader.readAsText(file);
    },
    async exportCSV() {
        const vs = await DB.getAll("visitas");
        let csv = "\ufeffDATA;NOME;RELATO\n";
        vs.forEach(v => csv += `${v.dataBR};${v.nome};${v.relato}\n`);
        const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
        const lnk = document.createElement('a'); lnk.href = URL.createObjectURL(blob);
        lnk.download = "RELATORIO_VISITAS.csv"; lnk.click();
    }
};

document.addEventListener('DOMContentLoaded', async () => { await DB.init(); Nav.init(); });
