import appConfig from '../../app.json';

export const APP_VERSION = appConfig.expo.version;

// Nome comercial do app, usado como fallback quando não há empresa/vendedor cadastrado (saudação
// da HomeScreen, rodapé do PDF) — diferente de `app.json#expo.name` (slug técnico "vendas-app").
export const APP_DISPLAY_NAME = 'Vendas App';
