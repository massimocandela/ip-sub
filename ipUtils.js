const ipAdd = require("ip-address");
const Address4 = ipAdd.Address4;
const Address6 = ipAdd.Address6;

const cache = {};

const ip = {

    getPrefixAndNetmask: function(prefix) {
        let bits, ip;

        for (let n=prefix.length - 1; n>=0; n--) {
            if (prefix[n] === '/') {
                ip = prefix.slice(0, n);
                bits = parseInt(prefix.slice(n + 1));
                return [ip, bits];
            }
        }
        throw new Error("Not valid prefix");
    },

    isValidPrefix: function(prefix){
        let bits, ip;

        try {

            const components = this.getPrefixAndNetmask(prefix);

            ip = components[0];
            bits = components[1];
            if (ip.indexOf(":") === -1) {
                return this.isValidIP(ip) && (bits >= 0 && bits <= 32);
            } else {
                return this.isValidIP(ip) && (bits >= 0 && bits <= 128);
            }

        } catch (e) {
            return false;
        }
    },

    isValidIP: function(ip) {

        try {
            if (ip.indexOf(":") === -1) {
                return new Address4(ip).isValid();
            } else {
                return new Address6(ip).isValid();
            }
        } catch (e) {
            return false;
        }
    },

    sortByPrefixLength: function (a, b) {
        const netA = this.getPrefixAndNetmask(a)[1];
        const netB = this.getPrefixAndNetmask(b)[1];

        return parseInt(netA) - parseInt(netB);
    },

    toDecimalOld: function(ip) {
        let bytes = "";
        if (ip.indexOf(":") === -1) {

            bytes = ip.split(".")
                .map(segment => {
                    if (!cache[segment]) {
                        cache[segment] = parseInt(segment).toString(2).padStart(8, '0');
                    }
                    return cache[segment];
                }).join("");
        } else {
            bytes = ip.split(":").filter(ip => ip !== "").map(ip => parseInt(ip, 16).toString(2).padStart(16, '0')).join("");
        }

        return bytes;
    },

    _v6Pad: function(ip){
        return parseInt(ip, 16).toString(2).padStart(16, '0');
    },

    _v4Pad: function(ip){
        return parseInt(ip).toString(2).padStart(8, '0');
    },

    expandIPv6: function(ip) {
        let count = 0;
        for(let i = 0; i<ip.length; i++)
            if(ip[i] == ':')
                count++;

        if (count != 7) {
            const extra = ':' + (new Array(8 - count).fill(0)).join(':') + ':';
            ip = ip.replace("::", extra);
            if (ip[0] == ':')
                ip = '0' + ip;
            if (ip[ip.length - 1] == ':')
                ip += '0';
        }
        return ip;
    },

    toDecimal: function(ip) {
        let bytes = "";
        let pad, splitter;
        let point = 0;

        if (ip.indexOf(":") === -1) {
            pad = this._v4Pad;
            splitter = ".";
        } else {
            pad = this._v6Pad;
            splitter = ":";
            ip = this.expandIPv6(ip);
        }

        for (let n=1; n<ip.length; n++) {
            if (ip[n] == splitter) {

                const segment = ip.slice(point, n);
                if (cache[segment] == undefined) {
                    cache[segment] = pad(segment);
                }
                bytes += cache[segment];
                point = n + 1;
            }
        }

        const segment = ip.slice(point);
        if (cache[segment] == undefined) {
            cache[segment] = pad(segment);
        }
        bytes += cache[segment];

        return bytes;
    },

    getNetmask: function(prefix) {
        const components = this.getPrefixAndNetmask(prefix);
        const ip = components[0];
        const bits = components[1];

        let binaryRoot;

        if (ip.indexOf(":") === -1){
            binaryRoot = this.toDecimal(ip).padEnd(32, '0').slice(0, bits);
        } else {
            binaryRoot = this.toDecimal(ip).padEnd(128, '0').slice(0, bits);
        }

        return binaryRoot;

    },

    isSubnetBinary: (prefixContainer, prefixContained) => {
        return prefixContained != prefixContainer && prefixContained.startsWith(prefixContainer);
    },

    isSubnet: function (prefixContainer, prefixContained) {
        return this.isSubnetBinary(this.getNetmask(prefixContainer), this.getNetmask(prefixContained));
    }

};

module.exports = ip;