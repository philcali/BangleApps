(function(back) {
    const SETTINGS_FILE = "settings.json";
    const storage = require('Storage');
    const settings = Object.assign({
        offlineLists: true,
    }, storage.readJSON(SETTINGS_FILE, true) || {});
    E.showMenu({
        '': { 'title': 'Recipe App' },
        '< Back': back,
        'Sync Groceries': {
            value: settings.offlineLists,
            onchange: value => {
                settings.offlineLists = value;
                storage.writeJSON(SETTINGS_FILE, settings);
            }
        }
    });
})
