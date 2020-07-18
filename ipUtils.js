const ipAdd = require("ip-address");
const Address4 = ipAdd.Address4;
const Address6 = ipAdd.Address6;

const cache = {};

const ip = {

    getIpAndNetmask: function(prefix) {
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

            const components = this.getIpAndNetmask(prefix);

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
        const netA = this.getIpAndNetmask(a)[1];
        const netB = this.getIpAndNetmask(b)[1];

        return parseInt(netA) - parseInt(netB);
    },

    _v6Pad: function(ip){
        return parseInt(ip, 16).toString(2).padStart(16, '0');
    },

    _v4Pad: function(ip){
        return parseInt(ip).toString(2).padStart(8, '0');
    },

    _expandIP: function(ip) {
        return (this.getAddressFamily(ip) === 4) ? this._expandIPv4(ip) : this._expandIPv6(ip);
    },

    expandIP: function(ip) {
      if (this.isValidIP(ip)) {
          return this._expandIP(ip);
      } else {
          throw new Error("Not valid IP");
      }
    },

    _expandIPv4: function(ip) {
        let count = 0;
        for(let i = 0; i<ip.length; i++)
            if(ip[i] === '.')
                count++;

        for (let n=count; n<3; n++) {
            ip += '.0';
        }

        return ip;
    },

    _expandIPv6: function(ip) {
        let count = 0;
        for(let i = 0; i<ip.length; i++)
            if(ip[i] === ':')
                count++;

        if (count !== 7) {
            const extra = ':' + (new Array(8 - count).fill(0)).join(':') + ':';
            ip = ip.replace("::", extra);
            if (ip[0] === ':')
                ip = '0' + ip;
            if (ip[ip.length - 1] === ':')
                ip += '0';
        }
        return ip;
    },

    isEqualIP: function(ip1, ip2) {
        if (this.isValidIP(ip1) && this.isValidIP(ip2)) {
            return this._isEqualIP(ip1, ip2);
        } else {
            throw new Error("Not valid IP");
        }
    },

    isEqualPrefix: function(prefix1, prefix2) {
        if (this.isValidIP(prefix1) && this.isValidIP(prefix2)) {
            return this._isEqualPrefix(prefix1, prefix2);
        } else {
            throw new Error("Not valid IP");
        }
    },

    _isEqualIP: function(ip1, ip2) {
        return this._expandIP(ip1) === this._expandIP(ip2);
    },

    _isEqualPrefix: function(prefix1, prefix2) {
        const components1 = this.getIpAndNetmask(prefix1);
        const components2 = this.getIpAndNetmask(prefix2);

        return components1[1] === components2[1] && this._isEqualIP(components1[0], components2[0]);
    },

    getAddressFamily: function(ip) {
        return (ip.indexOf(":") === -1) ? 4 : 6;
    },

    toDecimal: function(ip) {
        let bytes = "";
        let pad, splitter;
        let point = 0;

        if (ip.indexOf(":") === -1) {
            pad = this._v4Pad;
            splitter = ".";
            ip = this._expandIPv4(ip);
        } else {
            pad = this._v6Pad;
            splitter = ":";
            ip = this._expandIPv6(ip);
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
        const components = this.getIpAndNetmask(prefix);
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