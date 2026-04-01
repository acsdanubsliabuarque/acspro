const AppState = {
    activePatient: null,
    visitStartTime: null,
    history: ['tela-home'],
    unsavedChanges: false,
    markUnsaved() { this.unsavedChanges = true; },
    resetUnsaved() { this.unsavedChanges = false; },
    clearSearch() {
        const ids = ['h-nome', 'b-resp-nome', 'b-resp-nasc'];
        ids.forEach(id => { const el = document.getElementById(id); if(el) el.value = ""; });
        const listResp = document.getElementById('lista-resp-resultados');
        if(listResp) listResp.innerHTML = "";
    },
    resetPatient() { 
        this.activePatient = null; 
        this.visitStartTime = null; 
        this.clearSearch();
    }
};

const CONFIG = {
    DB_NAME: "ACS_DATABASE_PRO_V12",
    DB_VERSION: 1, 
    RUAS: ["RUA DA MINÁ", "VIELA DA RUA DA MINA", "RUA APÓSTOLO JOÃO BATISTA", "RUA SACERDOTE MELQUISEDEQUE", "RUA APÓSTOLO MATEUS", "RUA MÁRIO TORRES", "RUA APÓSTOLO PEDRO", "RUA APÓSTOLO FELIPE", "RUA VIRGINIA JOANA DA SILVA", "RUA JOSÉ LUIZ DE JESUS SANTOS", "VIELA UTINGA", "AVENIDA DOS TRABALHADORES"]
};
