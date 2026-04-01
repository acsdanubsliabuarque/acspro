const UI = {
    async buildCard(p) {
        const s = Utils.sanitize;
        let badges = "";
        const list = [
            {k:'hiper', l:'HIPERTE.', c:'bg-hiper'}, {k:'diab', l:'DIABET.', c:'bg-dia'},
            {k:'gest', l:'GESTANTE', c:'bg-gest'}, {k:'acam', l:'ACAMADO', c:'bg-acam'},
            {k:'def', l:'DEFICIE.', c:'bg-def'}, {k:'fum', l:'FUMANTE', c:'bg-fum'},
            {k:'renal', l:'RENAL', c:'bg-renal'}, {k:'resp', l:'RESPIR.', c:'bg-resp'},
            {k:'cancer', l:'CÂNCER', c:'bg-cancer'}, {k:'mental', l:'S.MENTAL', c:'bg-mental'}
        ];
        list.forEach(item => { if(p[item.k]) badges += `<span class="badge ${item.c}">${item.l}</span>`; });
        
        const gest = p.gest ? Utils.getGestationalInfo(p.dum) : null;
        const end = `${p.rua}, ${p.num} ${p.comp ? '('+p.comp+')' : ''}`.trim();
        
        const visits = await DB.getByIndex("visitas", "pacienteId", p.id);
        const activePendencies = visits.filter(v => v.pendencia && !v.resolvida);
        let pendHtml = "";
        if(activePendencies.length > 0) {
            pendHtml = `<div class="pendencia-ativa-no-card">⚠️ <b>PENDÊNCIAS ATIVAS:</b><br>` + 
                       activePendencies.map(ap => `• ${s(ap.pendencia)}`).join('<br>') + `</div>`;
        }

        return `
        <div class="card ${p.gest ? 'card-gestante' : ''}">
            <div class="info-label">NOME COMPLETO</div>
            <div class="info-valor"><strong>${s(p.nome)}</strong></div>
            <div class="grid-2">
                <div><div class="info-label">DATA NASCIMENTO</div><div class="info-valor">${s(p.nasc)}</div></div>
                <div><div class="info-label">RAÇA / COR</div><div class="info-valor">${s(p.raca)}</div></div>
            </div>
            <div class="grid-2">
                <div><div class="info-label">SEXO</div><div class="info-valor">${s(p.sexo)}</div></div>
                <div><div class="info-label">TELEFONE</div><div class="info-valor">${s(p.telprincipal) || '--'}</div></div>
            </div>
            <div class="info-label">ENDEREÇO COMPLETO</div>
            <div class="info-valor">${s(end)} <br> <small>MICROÁREA: ${s(p.ma || '00')} | SEG: ${s(p.seg || '0')}</small></div>
            ${gest ? `<div class="gestante-badge-info">IDADE GESTACIONAL: ${gest.res} <br> <span class="alerta-trimestre">DATA PROVÁVEL DO PARTO (DPP): ${gest.dpp} | ${gest.tri}</span></div>` : ''}
            <div style="margin-top:5px;">${badges || '<small>SEM AGRAVOS REGISTRADOS</small>'}</div>
            ${pendHtml}
            <hr style="opacity:0.1; margin: 15px 0;">
            <button class="btn btn-main" onclick="Visits.start(${p.id})">REGISTRAR VISITA</button>
            <div class="grid-2">
                <button class="btn btn-outline btn-sm" onclick="Nav.confirmExit('tela-historico', ${p.id})">HISTÓRICO</button>
                <button class="btn btn-outline btn-sm" onclick="Registry.prepareEdit(${p.id})">EDITAR CADASTRO</button>
            </div>
        </div>`;
    },
    async searchPessoa() {
        const term = document.getElementById('h-nome').value.toUpperCase().trim();
        if (!term) return CustomModals.alert("DIGITE UM NOME PARA PESQUISAR.");
        const all = await DB.getAll("municipes");
        const res = all.filter(p => p.nome.includes(term));
        this.renderList(`RESULTADOS PARA: ${term}`, res);
    },
    async searchEndereco() {
        const r = document.getElementById('h-rua').value;
        const n = document.getElementById('h-num').value.trim();
        if (!r) return CustomModals.alert("SELECIONE O LOGRADOURO.");
        const res = (await DB.getByIndex("municipes", "rua", r)).filter(p => !n || p.num === n);
        this.renderList(`ENDEREÇO: ${r}`, res);
    },
    async renderList(title, arr) {
        const list = document.getElementById('lista-resultados');
        list.innerHTML = `<h3>${title}</h3>`;
        if(arr.length === 0) {
            list.innerHTML += "<p>NENHUM CIDADÃO LOCALIZADO.</p>";
        } else {
            for (const p of arr) { list.innerHTML += await this.buildCard(p); }
        }
        Nav.goTo('tela-resultados');
    }
};
