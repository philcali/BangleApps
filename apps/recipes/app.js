const SETTINGS_FILE = 'settings.json';
const APP_URL = 'https://api.petroni.us';
const Storage = require('Storage');
const settings = Object.assign({
    offlineLists: true,
}, Storage.readJSON(SETTINGS_FILE, true) || {});

class ResourceService {
    constructor(url, settings) {
        this.url = url;
        this.settings = settings;
    }

    request(url, method, options) {
        let overrideUrl = url;
        let queryParams = [];
        let bangleOptions = {
            method: method,
            headers: {
                'Authorization': `Bearer ${this.settings.token}`,
            }
        };
        for (let key in options) {
            if (key === 'queryparams') {
                for (let p in options[key]) {
                let v = options[key][p];
                if (typeof v === 'undefined') {
                    continue;
                }
                queryParams.push(`${p}=${encodeURIComponent(options[key][p])}`);
            }
            overrideUrl = `${overrideUrl}?${queryParams.join('&')}`;
            } else {
                bangleOptions[key] = options[key];
            }
        }
        return new Promise((resolve, reject) => {
            Bangle.http(overrideUrl, bangleOptions)
                .then(
                data => resolve(JSON.parse(data.resp)),
                error => reject(error)
            );
        });
    }

    list(params) {
        return this.request(this.url, 'GET', {
            queryparams: (params || {})
        });
    }

    get(itemId) {
        return this.request(`${this.url}/${itemId}`, 'GET', {});
    }

    resource(id, resourceName) {
        return new ResourceService(`${this.url}/${id}/${resourceName}`, this.settings);
    }
}

class RecipeApi {
    constructor(settings) {
        this.settings = settings;
    }

    recipes() {
        return new ResourceService(`${APP_URL}/recipes`, this.settings);
    }

    shoppingLists() {
        return new ResourceService(`${APP_URL}/lists`, this.settings);
    }
}

const api = new RecipeApi(settings);

function viewGroceryList(item) {
    const menu = {
        '': { 'title': item.name },
        '< Back': () => groceryLists(),
    };
    item.items.forEach(listItem => {
        menu[listItem.name.trim()] = {
        value: listItem.completed,
        onchange: value => listItem.completed = value,
        };
    });
    E.showMenu(menu);
}

function groceryLists() {
    E.showMessage("Loading...", "Groceries");
    const menu = {
        '': { 'title': 'Groceries' },
        '< Back': () => dashboardView(),
    };
    function viewLists(lists) {
        lists.items.forEach(item => {
            menu[item.name.trim()] = () => viewGroceryList(item);
        });
        E.showMenu(menu);
    }
    api.shoppingLists()
        .list()
        .then(viewLists)
        .error(error => {
            const offlineLists = Storage.readJSON("offline.json", true) || {items: []}
            viewLists(offlineLists);
        });
}

function viewRecipeIngredients(recipe, ingredients) {
    const menu = {
        '': { 'title': 'Ingredients' },
        '< Back': () => viewRecipe(recipe),
    };
    ingredients.forEach(ingredient => {
        menu[`${ingredient.name.trim()} ${ingredient.amount} ${ingredient.measurement}`] = () => {};
    });
    E.showMenu(menu);
}

function viewRecipeInstructions(recipe, instructions, back) {
    let fontSize = "6x15";
    g.setFont(fontSize);
    let lines = [].concat(
        [recipe.name.trim(), ""],
        g.wrapString(instructions, g.getWidth() - 10),
        [""]
    );
    E.showScroller({
        h: g.getFontHeight(),
        c: lines.length,
        back: () => back ? back() : viewRecipe(recipe),
        draw: (i, r) => {
            g.setBgColor(i === 0 ? g.theme.bg2 : g.theme.bg)
                .setColor(i === 0 ? g.theme.fg2 : g.theme.fg)
                .clearRect(r.x, r.y, r.x + r.w, r.y + r.h);
            g.setFont(fontSize)
                .setFontAlign(0, -1)
                .drawString(lines[i], r.x  + r.w / 2, r.y);
        }
    });
}

function viewRecipe(recipe) {
    const menu = {
        '': { 'title': recipe.name },
        '< Back': () => recipeLists(),
    };
    if (recipe.ingredients.length> 0) {
        menu['Ingredients'] = () => viewRecipeIngredients(recipe, recipe.ingredients);
    }
    if (recipe.instructions) {
        menu['Instructions'] = () => viewRecipeInstructions(recipe, recipe.instructions);
    }
    E.showMenu(menu);
}

const recipePaginators = [];
function recipeLists(nextToken) {
    E.showMessage("Loading...", "Recipes");
    const menu = {
        '': { 'title': 'Recipes '},
        '< Back': () => {
            const previousToken = recipePaginators.pop();
            if (previousToken) {
                recipeLists(previousToken);
            } else {
                dashboardView();
            }
        }
    };
    api.recipes()
        .list({ limit: 5, nextToken })
        .then(resp => {
            resp.items.forEach(item => {
                menu[item.name.trim()] = () => viewRecipe(item);
            });
            if (resp.nextToken) {
                menu['Load More...'] = () => {
                    recipePaginators.push(resp.nextToken);
                    recipeLists(resp.nextToken);
                }
            }
            E.showMenu(menu);
        })
        .catch(error => {
            console.error(error);
            E.showAlert("Failed to list receipes", "Recipes").then(() => dashboardView());
        });
}

function dashboardView() {
    E.showMenu({
        '': { 'title': 'Recipe App' },
        '< Back': () => load(),
        'Recipes': () => recipeLists(),
        'Groceries': () => groceryLists(),
    });
}

Bangle.loadWidgets();
dashboardView();
Bangle.drawWidgets();