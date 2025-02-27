(function() {
    const SETTINGS_FILE = "coin_info.settings.json";
    const settings = require("Storage").readJSON(SETTINGS_FILE,1) || {};

    function retrieveClkInfo(token) {
        // TODO: do something useful here -> http request to CMC
        console.log("Retrieving:", token);
        return {
            text : token,
            // color: "#f00",
            img : atob("MDCBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAA//8AAAAB///AAAAB8A/gAAAAgAH4AAAwAAB8AAB4AAA+AADwA4APAADgA4APAAHgA4AHgADAf/ADwAAAf/gBwAAAf/wB4AAAcB4A4AAAcA4A4AAAcA4A4AYAcA4AcA8AcB4AcB+Af/wDdj/Af/4D/n/Af/8D/n/AcAcB/A4AcAOA+A4AcAOAcAcAcAOAAAcAcAAAAAcAcAAAAAeAf/AAAAOAf/AAAAPAf/ADAAHgA4AHgADwA4AHAADwA4APAAB8AAA+AAA+AAB8AAAfgAH4AAAH8A/gAAAD///AAAAA//8AAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==")
        }
    }

    function showClkInfo() {
        console.log("Show called");
        const self = this;
        this.interval = setTimeout(() => {
            self.emit("redraw");
            self.interval = setInterval(() => {
                console.log("Interval refresh");
                self.emit("redraw");
            }, 60000);
        }, 60000 - (Date.now() % 60000));
    }

    function hideClkInfo() {
        console.log("Hide called");
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    function createClkInfoItems() {
        console.log("Creating items from:", settings.tokenSelected);
        return (settings.tokenSelected || []).map(token => ({
            name: token,
            get: () => retrieveClkInfo(token),
            show: showClkInfo,
            hide: hideClkInfo,
            hasRange: false
        }));
    }

    return {
        name: "CoinInfo",
        items: createClkInfoItems
    };
});
