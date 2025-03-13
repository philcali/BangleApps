const settings = require("Storage").readJSON("coin_info.settings.json", 1) || {};
const db = require("Storage").readJSON("coin_info.cmc_key.json", 1) || {};
let ticker = 0;

var Layout = require("Layout");
var layout = new Layout({
        type:"v", c: [
            {type:"h",
                c: [
                    {type:"txt", id:"tknName", label:"Load...", halign:-1},
                    {type:"btn", label:"...", halign:1, cb: d=>setDummy("dot-dot-dot")}
                ]
            },
            {type:"txt", id:"tknGraph", font:"20%", label:"graph..." },
            {type:"h",
                c: [
                    {type:"btn", label:"07", cb: d=>setDummy("seven")},
                    {type:"btn", label:"14", cb: d=>setDummy("fourteen")},
                    {type:"btn", label:"30", cb: d=>setDummy("thirty")},
                    {type:"btn", label:"60", cb: d=>setDummy("sixty")}
                ]
            }
        ]
    },
    { lazy:true });
layout.update();

//
var currentLabel = "loading...";
function setDummy(x) {
    currentLabel = x;
}

// timeout used to update every minute
var drawTimeout;
// update the screen
function draw() {
    //
    layout.tknGraph.label = currentLabel;
    layout.tknName.label = settings.tokenSelected[ticker];
    layout.render();

    // schedule a draw for the next minute
    if (drawTimeout) clearTimeout(drawTimeout);
    drawTimeout = setTimeout(function() {
        drawTimeout = undefined;
        draw();
    }, 15000 - (Date.now() % 15000));
}

// update time and draw
g.clear();
draw();

//
Bangle.loadWidgets(); // loading widgets after drawing the layout in `drawMain()` to display the app UI ASAP.
require("widget_utils").swipeOn(); // hide widgets, make them visible with a swipe
