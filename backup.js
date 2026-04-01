const Backup = {
    async exportCSV() {
        const visitas = await DB.getAll("visitas");
        if (!visitas.length) return CustomModals.alert("SEM DADOS PARA EXPORTAR.");
        let csv = "\ufeffDATA;HORA;NOME;MOTIVOS;RELATO;PENDENCIA;STATUS;SOLUCAO\n";
        visitas.forEach(v => {
            const status = v.pendencia ? (v.resolvida ? "RESOLVIDA" : "ABERTA") : "N/A";
            csv += `${new Date(v.dataTS).toLocaleDateString()};${new Date(v.dataTS).toLocaleTimeString()};${v.nome};${v.motivos};${v.relato};${v.pendencia};${status};${v.relatoResolvido}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `ACS_PRO_RELATORIO_${Date.now()}.csv`;
        link.click();
    },
    async createBackup() {
        const m = await DB.getAll("municipes");
        const v = await DB.getAll("visitas");
        const data = JSON.stringify({ m, v, version: 12.0, ts: Date.now() });
        const blob = new Blob([data], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `BACKUP_ACSPRO_V12.json`;
        link.click();
    },
    async restoreBackup(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const municipes = data.m || data.municipes || [];
                const visitas = data.v || data.visitas || [];
                for (let item of municipes) { if(!item.cpf) delete item.cpf; await DB.put("municipes", item); }
                for (let item of visitas) { await DB.put("visitas", item); }
                await DB.updateCount();
                await CustomModals.alert("BACKUP RESTAURADO COM SUCESSO!");
                location.reload();
            } catch (err) { CustomModals.alert("ERRO CRÍTICO NA LEITURA DO BACKUP."); }
        };
        reader.readAsText(file);
    }
};
