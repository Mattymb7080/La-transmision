/* * settings-manager.js 
 * Este módulo gestiona el guardado y carga de datos.
 * ¡Otros scripts pueden importar estas funciones!
 */

// --- Claves de Guardado ---
// Así las llamaste para acceder fácilmente:
export const DEVICE_KEY = 'la-transmision-device';
export const THEME_KEY = 'la-transmision-theme';

// --- Paletas de Colores (Fuente de Verdad) ---
// Exportamos los colores para que cualquier script pueda usarlos
export const THEME_PALETTES = {
    'verde-crt': {
        '--primary-color': '#00FF00',
        '--background-color': '#000000',
        '--background-secondary': '#111',
        '--hover-bg': '#00FF00',
        '--hover-text': '#000000',
        '--danger-color': '#FF0000',
        '--danger-border': '#FF0000',
        '--danger-hover-bg': '#FF0000',
        '--danger-hover-text': '#000000',
    },
    'ambar': {
        '--primary-color': '#FFB000',
        '--background-color': '#000000',
        '--background-secondary': '#1a1100',
        '--hover-bg': '#FFB000',
        '--hover-text': '#000000',
        '--danger-color': '#FF3333',
        '--danger-border': '#FF3333',
        '--danger-hover-bg': '#FF3333',
        '--danger-hover-text': '#000000',
    },
    'azul': {
        '--primary-color': '#00FFFF',
        '--background-color': '#000000',
        '--background-secondary': '#001a1a',
        '--hover-bg': '#00FFFF',
        '--hover-text': '#000000',
        '--danger-color': '#FF007F',
        '--danger-border': '#FF007F',
        '--danger-hover-bg': '#FF007F',
        '--danger-hover-text': '#000000',
    },
    'blanco': {
        '--primary-color': '#EEEEEE',
        '--background-color': '#000000',
        '--background-secondary': '#222222',
        '--hover-bg': '#EEEEEE',
        '--hover-text': '#000000',
        '--danger-color': '#FF1111',
        '--danger-border': '#FF1111',
        '--danger-hover-bg': '#FF1111',
        '--danger-hover-text': '#000000',
    },
    'negro': {
        '--primary-color': '#000000',
        '--background-color': '#FFFFFF',
        '--background-secondary': '#DDDDDD',
        '--hover-bg': '#000000',
        '--hover-text': '#FFFFFF',
        '--danger-color': '#FF0000',
        '--danger-border': '#FF0000',
        '--danger-hover-bg': '#FF0000',
        '--danger-hover-text': '#FFFFFF',
    }
};


// --- Funciones para Dispositivo ---
export function setDevice(deviceType) {
    localStorage.setItem(DEVICE_KEY, deviceType);
}

export function getDevice() {
    return localStorage.getItem(DEVICE_KEY); // Retornará 'pc' o 'mobile'
}

// --- Funciones para Tema ---
export function setTheme(themeName) {
    localStorage.setItem(THEME_KEY, themeName);
}

export function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'verde-crt'; // Devuelve 'verde-crt' por defecto
}

// --- Función de Reseteo ---
export function resetAllSettings() {
    if (confirm('¿Estás seguro de que quieres resetear todos tus datos? Esta acción no se puede deshacer.')) {
        localStorage.clear();
        location.reload();
    }
}