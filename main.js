document.addEventListener('DOMContentLoaded', async () => {
    CustomModals.init();
    Nav.init();
    await DB.init();
    console.log("ACS PRO v12.0 - Inicializado com sucesso.");
});
