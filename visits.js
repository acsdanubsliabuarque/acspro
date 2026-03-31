// 001: MODULO DE REGISTRO DE VISITAS DOMICILIARES E GESTAO DE PENDENCIAS
// 002: FOCO EM SINAIS VITAIS, HISTORICO ATIVO E ARQUIVO MORTO DE PENDENCIAS (PROTOCOLO OSASCO)
const Visits = {

    // 003: INICIALIZA O FORMULARIO DE VISITA PARA UM PACIENTE ESPECIFICO
    async start(id) {
        const p = await DB.get("municipes", id);
        if (!p) return Utils.CustomModals.alert("ERRO: PACIENTE NÃO LOCALIZADO.");

        AppState.activePatient = p;
        AppState.visitStartTime = new Date();

        // 004: PREENCHIMENTO AUTOMATICO DOS DADOS NO FORMULARIO
        document.getElementById('v-nome-label').innerText = `VISITA: ${p.nome} (${Utils.calculateAge(p.nasc)} ANOS)`;
        document.getElementById('v-data').value = new Date().toLocaleDateString('pt-BR');
        
        // 005: LIMPEZA DE CAMPOS DE VISITA ANTERIOR
        document.getElementById('v-relato').value = "";
        document.getElementById('v-pendencia').value = "";
        document.getElementById('v-pa').value = "";
        document.getElementById('v-hgt').value = "";
        
        // 006: DESMARCAR TODOS OS MOTIVOS DA VISITA ANTERIOR
        document.querySelectorAll('input[name="v-motivo"]').forEach(cb => cb.checked = false);

        // 007: LOGICA DE NAVEGACAO FAMILIAR DENTRO DA VISITA
        // 008: SE O PACIENTE FOR CHEFE, MOSTRA OS DEPENDENTES PARA VISITA EM SEQUENCIA
        const famArea = document.getElementById('v-familiares-area'); // 009: Area que deve existir no HTML em visitas
        if (famArea) {
            famArea.innerHTML = "";
            if (p.isResp === 'SIM') {
                const familiares = await DB.getByIndex("municipes", "respId", p.id);
                if (familiares.length > 0) {
                    famArea.innerHTML = "<h4>NÚCLEO FAMILIAR (DEPENDENTES):</h4>";
                    familiares.forEach(f => {
                        famArea.innerHTML += `
                            <div class="card-familiar" style="padding:10px; background:#f0f0f0; margin-bottom:5px; border-radius:8px;">
                                ${f.nome} (${f.relacao})
                                <button class="btn btn-xs btn-outline" onclick="Visits.start(${f.id})">VISITAR ESTE</button>
                            </div>`;
                    });
                }
            }
        }

        Nav.goTo('tela-visita');
    },

    // 010: PERSISTENCIAS DOS DADOS DA VISITA NO BANCO DE DADOS
    async save() {
        const motivos = Array.from(document.querySelectorAll('input[name="v-motivo"]:checked')).map(i => i.value);
        const relato = document.getElementById('v-relato').value.toUpperCase().trim();
        const pendencia = document.getElementById('v-pendencia').value.toUpperCase().trim();
        const pa = document.getElementById('v-pa').value;
        const hgt = document.getElementById('v-hgt').value;

        // 011: VALIDACOES MINIMAS PARA EVITAR REGISTROS VAZIOS (PADRAO SISAB)
        if (motivos.length === 0) return Utils.CustomModals.alert("ERRO: VOCÊ DEVE SELECIONAR PELO MENOS UM MOTIVO DE VISITA.");
        if (!relato) return Utils.CustomModals.alert("ERRO: O RELATO DA EVOLUÇÃO É OBRIGATÓRIO.");

        const visitaData = {
            pacienteId: AppState.activePatient.id,
            nome: AppState.activePatient.nome,
            dataTS: Date.now(),
            dataBR: new Date().toLocaleDateString('pt-BR'),
            turno: document.getElementById('v-turno').value,
            motivos: motivos.join(", "),
            relato: relato,
            pa: pa,
            hgt: hgt,
            pendencia: pendencia,
            resolvida: false, // 012: Pendencia inicia sempre como ativa se preenchida
            dataResolvido: "",
            relatoResolvido: ""
        };

        try {
            await DB.put("visitas", visitaData);
            await Utils.CustomModals.alert("VISITA E EVOLUÇÃO REGISTRADAS COM SUCESSO!");
            Nav.goTo('tela-home', true);
        } catch (err) {
            Utils.CustomModals.alert("ERRO AO SALVAR VISITA: " + err.message);
        }
    },

    // 013: RENDERIZACAO DO HISTORICO COMPLETO DO PACIENTE
    async viewHistory(id) {
        const p = await DB.get("municipes", id);
        const visitas = await DB.getByIndex("visitas", "pacienteId", id);
        // 014: ORDENAR POR DATA MAIS RECENTE
        visitas.sort((a, b) => b.dataTS - a.dataTS);

        const list = document.getElementById('lista-historico');
        document.getElementById('hist-nome').innerText = `HISTÓRICO: ${p.nome}`;
        list.innerHTML = "";

        if (visitas.length === 0) {
            list.innerHTML = "<p style='text-align:center;'>NENHUM REGISTRO DE VISITA ENCONTRADO.</p>";
        }

        for (const v of visitas) {
            list.innerHTML += `
                <div class="card" style="border-left-color: #6c757d; font-size: 13px;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold;">
                        <span>📅 ${v.dataBR} (${v.turno})</span>
                        <span style="color:var(--primary)">${v.pa ? 'PA: '+v.pa : ''} ${v.hgt ? '| HGT: '+v.hgt : ''}</span>
                    </div>
                    <div style="margin:5px 0;"><strong>MOTIVOS:</strong> ${v.motivos}</div>
                    <div style="background:#f9f9f9; padding:8px; border-radius:5px; border:1px solid #eee;">
                        <strong>RELATO:</strong> "${v.relato}"
                    </div>
                    ${v.pendencia ? `
                        <div class="pendencia-ativa-no-card" style="background:${v.resolvida ? '#e8f5e9' : '#fff8e1'}; border-color:${v.resolvida ? '#81c784' : '#ffe082'};">
                            <div>
                                <b style="color:${v.resolvida ? '#218838' : '#795548'}">
                                    ${v.resolvida ? '✅ RESOLVIDO' : '⚠️ PENDENTE'}: ${v.pendencia}
                                </b>
                                ${v.resolvida ? `<br><small>SOLUÇÃO: ${v.relatoResolvido} (${v.dataResolvido})</small>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>`;
        }
        Nav.goTo('tela-historico');
    },

    // 015: VISUALIZACAO DE TODAS AS PENDENCIAS ATIVAS NO TERRITORIO
    async viewPendencies() {
        const todasVisitas = await DB.getAll("visitas");
        const ativas = todasVisitas.filter(v => v.pendencia && !v.resolvida);
        
        const list = document.getElementById('lista-resultados');
        list.innerHTML = `<h3 style="text-align:center">PENDÊNCIAS ATIVAS NO TERRITÓRIO (${ativas.length})</h3>`;

        if (ativas.length === 0) {
            list.innerHTML += "<p style='text-align:center'>TUDO EM DIA NO SEU SETOR!</p>";
        } else {
            for (const v of ativas) {
                list.innerHTML += `
                    <div class="card" style="border-left-color: var(--warning)">
                        <div class="info-label">CIDADÃO</div>
                        <div class="info-valor"><strong>${v.nome}</strong></div>
                        <div class="pendencia-ativa-no-card">
                            <span>${v.pendencia}</span>
                            <div>
                                <button class="btn-icon" title="EDITAR" onclick="Visits.editPendency(${v.id})">✏️</button>
                                <button class="btn-icon" title="RESOLVER" onclick="Visits.resolvePendency(${v.id})">✅</button>
                            </div>
                        </div>
                        <div style="font-size:10px; margin-top:5px; opacity:0.6">GERADA EM: ${v.dataBR}</div>
                    </div>`;
            }
        }
        Nav.goTo('tela-resultados');
    },

    // 016: FUNCAO PARA RESOLVER PENDENCIA E ARQUIVAR (LOGICA SOLICITADA)
    async resolvePendency(id) {
        const v = await DB.get("visitas", id);
        if (!v) return;

        const solucao = await Utils.CustomModals.prompt(`RESOLVENDO PENDÊNCIA PARA ${v.nome}:\nO QUE FOI FEITO PARA RESOLVER?`);
        
        if (solucao && solucao.trim() !== "") {
            // 017: ATUALIZA O ESTADO NA TABELA DE VISITAS
            v.resolvida = true;
            v.relatoResolvido = solucao.toUpperCase().trim();
            v.dataResolvido = new Date().toLocaleString('pt-BR');

            await DB.put("visitas", v);

            // 018: MOVE PARA A TABELA DE ARQUIVO MORTO PARA GARANTIR PERFORMANCE
            const arquivoData = {
                visitaId: v.id,
                pacienteId: v.pacienteId,
                nome: v.nome,
                pendenciaOriginal: v.pendencia,
                solucao: v.relatoResolvido,
                dataArquivamento: Date.now(),
                dataArquivamentoBR: v.dataResolvido
            };

            await DB.put("arquivo_pendencias", arquivoData);
            await Utils.CustomModals.alert("PENDÊNCIA RESOLVIDA E ARQUIVADA!");
            
            // 019: RECARREGA A TELA QUE O USUARIO ESTIVER (PENDENCIAS OU HISTORICO)
            if (document.getElementById('tela-resultados').classList.contains('hidden') === false) {
                this.viewPendencies();
            } else {
                this.viewHistory(v.pacienteId);
            }
        } else {
            Utils.CustomModals.alert("A DESCRIÇÃO DA SOLUÇÃO É OBRIGATÓRIA PARA FINALIZAR.");
        }
    },

    // 020: FUNCAO PARA EDITAR APENAS O TEXTO DA PENDENCIA (ICONE LAPIS)
    async editPendency(id) {
        const v = await DB.get("visitas", id);
        if (!v) return;

        const novoTexto = await Utils.CustomModals.prompt("EDITAR TEXTO DA PENDÊNCIA:", v.pendencia);
        if (novoTexto && novoTexto.trim() !== "") {
            v.pendencia = novoTexto.toUpperCase().trim();
            await DB.put("visitas", v);
            this.viewPendencies();
        }
    },

    // 021: FUNCAO PARA REVERTER PENDENCIA RESOLVIDA (MODO ARQUIVO MORTO)
    // 022: EXIGE JUSTIFICATIVA QUE SERA ANEXADA AO RELATO DA VISITA
    async revertPendency(arquivoId) {
        const arquivo = await DB.get("arquivo_pendencias", arquivoId);
        if (!arquivo) return;

        const confirmacao = await Utils.CustomModals.confirm(`DESEJA REALMENTE REVERTER A PENDÊNCIA DE ${arquivo.nome} PARA 'ATIVA'?`);
        
        if (confirmacao) {
            const motivo = await Utils.CustomModals.prompt("MOTIVO DA REVERSÃO (OBRIGATÓRIO):");
            if (!motivo) return Utils.CustomModals.alert("VOCÊ PRECISA JUSTIFICAR A REVERSÃO.");

            // 023: BUSCA A VISITA ORIGINAL PARA RESETAR O STATUS
            const v = await DB.get("visitas", arquivo.visitaId);
            if (v) {
                v.resolvida = false;
                v.relato += `\n[REVERTIDO EM ${new Date().toLocaleString()} POR MOTIVO: ${motivo.toUpperCase()}]`;
                v.dataResolvido = "";
                v.relatoResolvido = "";
                
                await DB.put("visitas", v);
                await DB.delete("arquivo_pendencias", arquivoId);
                
                await Utils.CustomModals.alert("PENDÊNCIA REVERTIDA COM SUCESSO!");
                location.reload(); // 024: Recarrega para limpar estados da UI
            }
        }
    }
};

// 025: VINCULACAO DINAMICA DE MASCARA PARA PRESSAO ARTERIAL NA VISITA
document.addEventListener('input', (e) => {
    if (e.target.id === 'v-pa') {
        e.target.value = Utils.masks.pa(e.target.value);
    }
});

// 026: COMENTARIO DE ARQUITETO:
// 027: A FUNCAO 'viewHistory' AGORA RENDERIZA AS PENDENCIAS DENTRO DO CARD DO HISTORICO.
// 028: ISSO GARANTE QUE O ACS TENHA A LINHA DO TEMPO COMPLETA DE CADA CIDADÃO.
// 029: AS MAIÚSCULAS SÃO FORÇADAS EM TODOS OS PROMPTS E INPUTS DE RELATO.
