/* 001: MOTOR DE VISITAS E PENDENCIAS */
window.Visits = {
    async start(id) {
        const p = await DB.get("municipes", id);
        AppState.activePatient = p;
        document.getElementById('v-nome-label').innerText = `VISITA: ${p.nome}`;
        document.getElementById('v-data').value = new Date().toLocaleDateString('pt-BR');
        document.getElementById('v-relato').value = "";
        document.getElementById('v-pa').value = "";
        document.getElementById('v-hgt').value = "";
        document.getElementById('v-pendencia').value = "";
        
        /* 002: VISITA EM CADEIA (DIRETRIZ 7) */
        const area = document.getElementById('v-familiares-area');
        area.innerHTML = "";
        const moradores = await DB.getByIndex("municipes", "enderecoChave", [p.rua, p.num, p.comp]);
        moradores.filter(m => m.id !== p.id).forEach(m => {
            area.innerHTML += `<div class="card" style="padding:10px; border-left:4px solid #17a2b8; margin-bottom:5px;">
                <small>${m.nome}</small><br><button class="btn btn-sm btn-main" onclick="Visits.start(${m.id})">VISITAR ESTE</button>
            </div>`;
        });
        Nav.goTo('tela-visita');
    },

    async save() {
        if (!document.getElementById('v-relato').value) return Utils.CustomModals.alert("RELATO OBRIGATÓRIO!");
        const v = {
            pacienteId: AppState.activePatient.id,
            nome: AppState.activePatient.nome,
            dataBR: document.getElementById('v-data').value,
            relato: document.getElementById('v-relato').value.toUpperCase(),
            pa: document.getElementById('v-pa').value,
            hgt: document.getElementById('v-hgt').value,
            pendencia: document.getElementById('v-pendencia').value.toUpperCase(),
            resolvida: false,
            dataTS: Date.now()
        };
        await DB.put("visitas", v);
        await Utils.CustomModals.alert("VISITA REGISTRADA!");
        Nav.goTo('tela-home', true);
    },

    async viewHistory(id) {
        const vits = await DB.getByIndex("visitas", "pacienteId", id);
        const list = document.getElementById('lista-historico');
        list.innerHTML = vits.reverse().map(v => `<div class="card"><b>${v.dataBR}</b><p>${v.relato}</p></div>`).join('');
        Nav.goTo('tela-historico');
    },

    async viewPendencies() {
        const todas = await DB.getAll("visitas");
        const ativas = todas.filter(v => v.pendencia && !v.resolvida);
        const cont = document.getElementById('lista-resultados');
        cont.innerHTML = `<h3>PENDÊNCIAS ATIVAS (${ativas.length})</h3>` + ativas.map(v => `
            <div class="card card-pendencia">
                <b>${v.nome}</b><div class="pendencia-ativa-no-card"><span>${v.pendencia}</span>
                <button class="btn-icon" onclick="Visits.resolvePendency(${v.id})">✅</button></div>
            </div>`).join('');
        Nav.goTo('tela-resultados');
    },

    async resolvePendency(id) {
        const v = await DB.get("visitas", id);
        const sol = await Utils.CustomModals.prompt("JUSTIFICATIVA DE RESOLUÇÃO:");
        if (sol) {
            v.resolvida = true; v.relatoResolvido = sol;
            await DB.put("visitas", v);
            await Utils.CustomModals.alert("PENDÊNCIA ARQUIVADA!");
            this.viewPendencies();
        }
    }
};
