/* ==========================================================================
   005: MÓDULO DE VISITAS DOMICILIARES, SINAIS VITAIS E PENDÊNCIAS
   DOCUMENTAÇÃO: MOTOR DE PRODUTIVIDADE E MONITORAMENTO EPIDEMIOLÓGICO
   ESTE ARQUIVO IMPLEMENTA A FICHA DE VISITA DOMICILIAR COMPLETA DO SISAB
   ========================================================================== */

window.Visits = {

    /* 001: MOTOR DE INICIALIZACAO DA VISITA (DIRETRIZ 7) */
    async start(id) {
        const municipe = await DB.get("municipes", id);
        if (!municipe) return Utils.CustomModals.alert("ERRO: MUNÍCIPE NÃO LOCALIZADO NO BANCO.");

        // 002: DEFINE O ESTADO DA VISITA ATIVA
        AppState.activePatient = municipe;
        AppState.visitStartTime = new Date();

        // 003: PREPARA A INTERFACE COM DADOS DE IDENTIFICAÇÃO (ONIPRESENÇA DA IDADE)
        const idade = Utils.calculateAge(municipe.nasc);
        document.getElementById('v-nome-label').innerText = `VISITA: ${municipe.nome} (${idade} ANOS)`;
        document.getElementById('v-data').value = new Date().toLocaleDateString('pt-BR');
        
        // 004: LIMPEZA TÉCNICA DOS CAMPOS DA FICHA
        this.resetForm();

        // 005: LÓGICA DE VISITA EM CADEIA (DIRETRIZ 7)
        // LOCALIZA AUTOMATICAMENTE TODOS OS OUTROS MORADORES DA MESMA UNIDADE HABITACIONAL
        const famArea = document.getElementById('v-familiares-area');
        if (famArea) {
            famArea.innerHTML = "";
            const moradores = await DB.getByIndex("municipes", "idx_endereco_chave", [municipe.rua, municipe.num, municipe.comp]);
            
            // FILTRA PARA NÃO MOSTRAR O PRÓPRIO MUNÍCIPE NA LISTA DE "OUTROS MORADORES"
            const outros = moradores.filter(m => m.id !== municipe.id);
            
            if (outros.length > 0) {
                famArea.innerHTML = `<div style="background:#e3f2fd; padding:10px; border-radius:8px; margin-bottom:15px;">
                    <div style="font-size:10px; font-weight:bold; color:#1565c0; margin-bottom:5px;">OUTROS MORADORES NESTE ENDEREÇO:</div>`;
                
                outros.forEach(m => {
                    famArea.innerHTML += `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px; margin-bottom:5px; border-radius:5px; border:1px solid #bbdefb;">
                            <div style="font-size:12px;"><b>${m.nome}</b><br><small>${Utils.calculateAge(m.nasc)} ANOS | ${m.relacao}</small></div>
                            <button class="btn btn-sm btn-main" style="width:auto; margin:0;" onclick="Visits.start(${m.id})">VISITAR</button>
                        </div>`;
                });
                famArea.innerHTML += `</div>`;
            }
        }

        Nav.goTo('tela-visita');
    },

    /* 006: RESET DE FORMULÁRIO PARA EVITAR CONTAMINAÇÃO DE DADOS */
    resetForm() {
        document.getElementById('v-pa').value = "";
        document.getElementById('v-hgt').value = "";
        document.getElementById('v-peso').value = "";
        document.getElementById('v-estatura').value = "";
        document.getElementById('v-relato').value = "";
        document.getElementById('v-pendencia').value = "";
        document.getElementById('v-desfecho').value = "VISITA REALIZADA";
        
        // DESMARCA TODOS OS MOTIVOS SISAB
        document.querySelectorAll('input[name="v-motivo"]').forEach(cb => cb.checked = false);
    },

    /* 007: MOTOR DE GRAVACAO - CONFORMIDADE SISAB/E-SUS */
    async save() {
        // 008: COLETA DE MOTIVOS (CHECKBOXES MULTIPLOS)
        const motivosSelecionados = Array.from(document.querySelectorAll('input[name="v-motivo"]:checked')).map(cb => cb.value);
        
        const desfecho = document.getElementById('v-desfecho').value;
        const relato = document.getElementById('v-relato').value.toUpperCase().trim();
        const pendenciaTexto = document.getElementById('v-pendencia').value.toUpperCase().trim();

        // 009: VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS DA VISITA
        if (motivosSelecionados.length === 0 && desfecho === "VISITA REALIZADA") {
            return Utils.CustomModals.alert("ATENÇÃO: SELECIONE PELO MENOS UM MOTIVO PARA A VISITA REALIZADA.");
        }
        if (!relato) {
            return Utils.CustomModals.alert("ATENÇÃO: O RELATO DA EVOLUÇÃO É OBRIGATÓRIO PARA O SISAB.");
        }

        // 010: MONTAGEM DO OBJETO TÉCNICO DE VISITA
        const visitaData = {
            pacienteId: AppState.activePatient.id,
            nome: AppState.activePatient.nome,
            dataTS: Date.now(),
            dataBR: new Date().toLocaleDateString('pt-BR'),
            horaVisita: new Date().toLocaleTimeString('pt-BR'),
            turno: document.getElementById('v-turno').value,
            desfechoVisita: desfecho,
            motivos: motivosSelecionados.join(", "),
            
            // SINAIS VITAIS (DIRETRIZ 7)
            pa: document.getElementById('v-pa').value,
            hgt: document.getElementById('v-hgt').value,
            peso: document.getElementById('v-peso').value,
            estatura: document.getElementById('v-estatura').value,
            
            relato: relato,
            pendencia: pendenciaTexto,
            resolvida: false, // TODA PENDENCIA NASCE ATIVA
            dataResolvido: "",
            relatoResolvido: ""
        };

        try {
            await DB.put("visitas", visitaData);
            await Utils.CustomModals.alert("VISITA REGISTRADA COM SUCESSO NO PRONTUÁRIO.");
            Nav.goTo('tela-home', true);
        } catch (error) {
            Utils.CustomModals.alert("ERRO AO SALVAR VISITA NO BANCO LOCAL.");
        }
    },

    /* 011: MOTOR DE HISTÓRICO INDIVIDUAL */
    async viewHistory(id) {
        const p = await DB.get("municipes", id);
        const visitas = await DB.getByIndex("visitas", "idx_pacienteId", id);
        
        // ORDENAÇÃO CRONOLÓGICA REVERSA (MAIS RECENTE PRIMEIRO)
        visitas.sort((a, b) => b.dataTS - a.dataTS);

        const container = document.getElementById('lista-historico');
        document.getElementById('hist-nome').innerText = `HISTÓRICO TÉCNICO: ${p.nome}`;
        container.innerHTML = "";

        if (visitas.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:30px; opacity:0.5;">NENHUMA VISITA REGISTRADA PARA ESTE CIDADÃO.</div>`;
        }

        visitas.forEach(v => {
            container.innerHTML += `
                <div class="card" style="border-left-color: var(--secondary); font-size:13px;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold; color:var(--primary); margin-bottom:10px;">
                        <span>📅 ${v.dataBR} - ${v.turno}</span>
                        <span>${v.pa ? 'PA: '+v.pa : ''} ${v.hgt ? ' | HGT: '+v.hgt : ''}</span>
                    </div>
                    <div style="margin-bottom:8px;"><b>MOTIVOS:</b> ${v.motivos}</div>
                    <div style="background:#f8f9fa; padding:10px; border-radius:8px; border-left:3px solid #dee2e6;">
                        <i>"${v.relato}"</i>
                    </div>
                    ${v.pendencia ? `
                        <div class="pendencia-ativa-no-card" style="background:${v.resolvida ? '#e8f5e9' : '#fffde7'}; border-color:${v.resolvida ? '#c8e6c9' : '#fff59d'}; animation:none;">
                            <div style="flex:1;">
                                <b>${v.resolvida ? '✅ RESOLVIDA' : '⚠️ PENDÊNCIA'}:</b> ${v.pendencia}
                                ${v.resolvida ? `<br><small style="color:#2e7d32;">SOLUÇÃO: ${v.relatoResolvido} (${v.dataResolvido})</small>` : ''}
                            </div>
                            ${!v.resolvida ? `<button class="btn-icon" onclick="Visits.resolvePendency(${v.id})">✅</button>` : ''}
                        </div>` : ''}
                </div>`;
        });
        Nav.goTo('tela-historico');
    },

    /* 012: GESTÃO AVANÇADA DE PENDÊNCIAS (DIRETRIZ 8) */
    async viewPendencies() {
        const todas = await DB.getAll("visitas");
        const ativas = todas.filter(v => v.pendencia && !v.resolvida);
        
        const container = document.getElementById('lista-resultados');
        container.innerHTML = `<h3 style="text-align:center; margin-bottom:20px;">CONTROLE DE PENDÊNCIAS ATIVAS (${ativas.length})</h3>`;

        if (ativas.length === 0) {
            container.innerHTML += `<div style="text-align:center; padding:50px; opacity:0.5;">PARABÉNS! NÃO HÁ PENDÊNCIAS ATIVAS NO TERRITÓRIO.</div>`;
        } else {
            for (const v of ativas) {
                container.innerHTML += `
                    <div class="card card-pendencia">
                        <div class="info-label">CIDADÃO / ENDEREÇO</div>
                        <div class="info-valor"><strong>${v.nome}</strong></div>
                        <div class="pendencia-ativa-no-card">
                            <span style="font-weight:bold;">${v.pendencia}</span>
                            <div style="display:flex; gap:8px;">
                                <button class="btn-icon" title="EDITAR TEXTO" onclick="Visits.editPendency(${v.id})">✏️</button>
                                <button class="btn-icon" title="CONCLUIR" onclick="Visits.resolvePendency(${v.id})">✅</button>
                            </div>
                        </div>
                        <div style="font-size:10px; margin-top:10px; color:#888;">GERADA NA VISITA DE: ${v.dataBR}</div>
                    </div>`;
            }
        }
        Nav.goTo('tela-resultados');
    },

    /* 013: RESOLUÇÃO E ARQUIVAMENTO (DIRETRIZ 8) */
    async resolvePendency(id) {
        const visita = await DB.get("visitas", id);
        if (!visita) return;

        const solucao = await Utils.CustomModals.prompt("RESOLUÇÃO DE PENDÊNCIA", `O QUE FOI FEITO PARA RESOLVER: "${visita.pendencia}"?`);
        
        if (solucao && solucao.trim() !== "") {
            visita.resolvida = true;
            visita.relatoResolvido = solucao;
            visita.dataResolvido = new Date().toLocaleString('pt-BR');
            
            await DB.put("visitas", visita);

            // 014: LOG DE ARQUIVO MORTO PARA AUDITORIA
            const logArquivo = {
                visitaId: visita.id,
                pacienteId: visita.pacienteId,
                nome Municipe: visita.nome,
                pendenciaOriginal: visita.pendencia,
                solucaoAplicada: solucao,
                dataArquivamento: Date.now(),
                dataArquivamentoBR: visita.dataResolvido
            };
            await DB.put("arquivo_pendencias", logArquivo);

            await Utils.CustomModals.alert("PENDÊNCIA RESOLVIDA E ARQUIVADA COM SUCESSO.");
            
            // RECARREGA A VIEW ATUAL
            if (AppState.history[AppState.history.length-1] === 'tela-resultados') this.viewPendencies();
            else this.viewHistory(visita.pacienteId);
        }
    },

    /* 015: EDIÇÃO RÁPIDA DE TEXTO DE PENDÊNCIA */
    async editPendency(id) {
        const visita = await DB.get("visitas", id);
        if (!visita) return;

        const novoTexto = await Utils.CustomModals.prompt("EDITAR PENDÊNCIA", "CORRIJA O TEXTO DA PENDÊNCIA:");
        if (novoTexto && novoTexto.trim() !== "") {
            visita.pendencia = novoTexto;
            await DB.put("visitas", visita);
            this.viewPendencies();
        }
    }
};
