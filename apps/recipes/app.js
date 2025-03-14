const SETTINGS_FILE = 'recipes.settings.json';
const OFFLINE_FILE = 'recipes.offline.json';
const MAX_ITEMS = 4;
const APP_URL = 'https://api.petroni.us';
const Storage = require('Storage');
const Layout = require('Layout');
const settings = Object.assign({
    offlineLists: true,
}, Storage.readJSON(SETTINGS_FILE, true) || {});

class ResourceService {
    constructor(url, settings) {
        this.url = url;
        this.settings = settings;
    }

    request(url, method, options, body) {
        let overrideUrl = url;
        let queryParams = [];
        let headers = {
            'Authorization': `Bearer ${this.settings.token}`,
        };
        let bangleOptions = {
            method: method,
            headers: headers,
        };
        if (body) {
            let payload = JSON.stringify(body);
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = payload.length;
            bangleOptions.body = payload;
        }
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

    remove(itemId) {
        return this.request(`${this.url}/${itemId}`, 'DELETE', {});
    }

    put(itemId, body) {
        return this.request(`${this.url}/${itemId}`, 'PUT', {}, body);
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

    audits() {
        return new ResourceService(`${APP_URL}/audits`, this.settings);
    }

    shares() {
        return new ResourceService(`${APP_URL}/shares`, this.settings);
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
        .list({ limit: MAX_ITEMS })
        .then(viewLists)
        .catch(() => {
            const offlineLists = Storage.readJSON(OFFLINE_FILE, true) || {items: []}
            viewLists(offlineLists);
        });
}

function viewRecipeIngredients(recipe, ingredients, nextToken) {
    const menu = {
        '': { 'title': 'Ingredients' },
        '< Back': () => viewRecipe(recipe, nextToken),
    };
    ingredients.forEach(ingredient => {
        menu[`${ingredient.name.trim()} ${ingredient.amount} ${ingredient.measurement}`] = () => {};
    });
    E.showMenu(menu);
}

function viewRecipeInstructions(recipe, instructions, nextToken) {
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
        back: () => viewRecipe(recipe, nextToken),
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

const recipePaginators = [];
function previousRecipeList() {
    const previousPage = recipePaginators.pop();
    if (previousPage) {
        previousPage();
    } else {
        dashboardView();
    }
}

function viewRecipe(recipe, nextToken) {
    const menu = {
        '': { 'title': recipe.name },
        '< Back': () => recipeLists(nextToken),
    };
    if (recipe.ingredients.length > 0) {
        menu['Ingredients'] = () => viewRecipeIngredients(recipe, recipe.ingredients, nextToken);
    }
    if (recipe.instructions) {
        menu['Instructions'] = () => viewRecipeInstructions(recipe, recipe.instructions, nextToken);
    }
    E.showMenu(menu);
}

function recipeLists(nextToken) {
    E.showMessage("Loading...", "Recipes");
    const menu = {
        '': { 'title': 'Recipes' },
        '< Back': () => previousRecipeList(),
    };
    api.recipes()
        .list({ limit: MAX_ITEMS, stripFields: "thumbnail", nextToken: nextToken })
        .then(resp => {
            resp.items.forEach(item => {
                menu[item.name.trim()] = () => viewRecipe(item, nextToken);
            });
            if (resp.nextToken) {
                menu['Load More...'] = () => {
                    recipePaginators.push(() => recipeLists(nextToken));
                    recipeLists(resp.nextToken);
                }
            }
            E.showMenu(menu);
        })
        .catch(() => {
            E.showAlert("Failed to list receipes", "Recipes").then(() => dashboardView());
        });
}

function auditList(nextToken) {
    E.showMessage("Loading...", "Activity");
    let btns = [{
        type: 'btn',
        font: '6x8',
        label: 'Back',
        cb: () => previousRecipeList(),
        pad: 1,
    }];
    const colors = {
        'CREATED': '#008000',
        'UPDATED': '#0000ff',
        'REMOVED': '#ff0000',
    }
    api.audits()
        .list({
            limit: MAX_ITEMS,
            nextToken: nextToken,
            sortOrder: 'descending',
            stripFields: 'thumbnail,items',
        })
        .then(resp => {
            const back = () => auditList(nextToken);
            if (resp.nextToken !== null && resp.nextToken !== undefined) {
                btns.push({
                    type: 'btn',
                    font: '6x8',
                    label: 'More',
                    pad: 1,
                    cb: () => {
                        recipePaginators.push(back);
                        auditList(resp.nextToken);
                    }
                });
            }
            if (resp.items.length === 0) {
                E.showAlert("No more activity logs", "Activity").then(() => previousRecipeList());
            } else {
                const layout = new Layout({
                    type: 'v', c: [].concat(
                        resp.items.map(item => {
                            const createTime = new Date(item.createTime);
                            return {
                                type: 'h',
                                c: [{
                                    type: 'custom',
                                    width: 32,
                                    filly: 1,
                                    col: colors[item.action],
                                    id: `${item.id}:color`,
                                    render: l => g.fillCircle(l.x + (l.w / 2), l.y + (l.h / 2), 8),
                                }, {
                                    type: 'txt',
                                    font: '6x15',
                                    label: `${item.resourceType} ${String(createTime.getMonth() + 1).padStart(2, '0')}/${String(createTime.getDate()).padStart(2, '0')}`,
                                    cb: l => {
                                        E.showPrompt([
                                            `${item.resourceType} was ${item.action.toLowerCase()}`,
                                            "Delete this record?"
                                        ].join("\n"), {title: item.resourceType}).then(selected => {
                                            if (selected) {
                                                api.audits()
                                                    .remove(item.id)
                                                    .then(back)
                                                    .catch(() => E.showAlert("Failed to delete activity", item.resourceType).then(back));
                                            }
                                        });
                                    },
                                    id: item.id,
                                }, {
                                    type: 'txt',
                                    font: '6x15',
                                    label: '>',
                                    id: `${item.id}:arrow`,
                                }]
                            };
                        }),
                        [{type: 'h', c: btns}],
                    ),
                }, {
                    back: () => dashboardView(),
                });
                g.reset().clearRect(Bangle.appRect);
                layout.render();
            }
        })
        .catch(e => {
            E.showAlert("Failed to load activity logs", "Activity").then(() => dashboardView());
        });
}

function loadSharingRequests(title, nextToken) {
    E.showMessage("Loading...", title);
    const menu = {
        '': { 'title': title },
        '< Back': () => previousRecipeList(),
    };
    let params = { limit: MAX_ITEMS, nextToken: nextToken };
    if (title === 'With Me') {
        params['status'] = 'REQUESTED';
    }
    api.shares()
        .list(params)
        .then(resp => {
            if (resp.items.length === 0) {
                E.showAlert("No open share requests", title).then(() => previousRecipeList());
            } else {
                const back = () => loadSharingRequests(title, nextToken);
                resp.items.forEach(item => {
                    if (title === 'With Me') {
                        username = item.requester.split('@')[0];
                        const approvalThunk = status => {
                            return () => {
                                E.showPrompt(`Mark as ${status.toLowerCase()}?`, { title: username })
                                    .then(selected => {
                                        if (selected) {
                                            api.shares()
                                                .put(item.id, { approvalStatus: status })
                                                .then(back)
                                                .catch(() => E.showAlert(`Failed to mark as ${status.toLowerCase()}`, username).then(back));
                                        }
                                    });
                            };
                        };
                        menu[username] = () => {
                            E.showMenu({
                                '': { 'title': username },
                                '< Back': back,
                                'Approve': approvalThunk("APPROVED"),
                                'Reject': approvalThunk("REJECTED"),
                            });
                        };
                    } else {
                        username = (item.id === item.approver ? item.requester : item.approver).split('@')[0];
                        menu[username] = () => {
                            E.showPrompt("Delete request?", username).then(selected => {
                                if (selected) {
                                    api.shares()
                                        .remove(item.id)
                                        .then(back)
                                        .catch(() => E.showAlert("Failed to remove request", username).then(back));
                                }
                            });
                        };
                    }
                });
                if (resp.nextToken) {
                    menu['Load More...'] = () => {
                        recipePaginators.push(back);
                        loadSharingRequests(title, resp.nextToken);
                    };
                }
                E.showMenu(menu);
            }
        })
        .catch(() => {
            E.showAlert("Failed to list share requests", title).then(() => dashboardView());
        });
}

function sharingDashboard() {
    E.showMenu({
        '': { 'title': 'Sharing' },
        '< Back': () => dashboardView(),
        'With Me': () => loadSharingRequests("With Me"),
        'From Me': () => loadSharingRequests("From Me"),
    })
}

function dashboardView() {
    E.showMenu({
        '': { 'title': 'Recipe App' },
        '< Back': () => load(),
        'Recipes': () => recipeLists(),
        'Groceries': () => groceryLists(),
        'Sharing': () => sharingDashboard(),
        'Activity': () => auditList(),
    });
}

Bangle.loadWidgets();
dashboardView();
Bangle.drawWidgets();