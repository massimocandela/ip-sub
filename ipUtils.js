const cache = {
    v4: {},
    v6: {}
};

const spaceConfig = {
    v4: {
        blockSize: 8,
        ipSizeCheck: 32,
        splitChar: ".",
        blockMax: 255,
        bits: 32,
        regex: new RegExp("^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$")
    },
    v6: {
        blockSize: 16,
        ipSizeCheck: 64,
        splitChar: ":",
        blockMax: "ffff",
        bits: 128,
        regex: new RegExp("^((::[0-128]?)|(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})| :((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])))$")
    }
};

const ip = {

    getIpAndCidr: function(prefix) {
        let bits, ip;

        for (let n=prefix.length - 1; n>=0; n--) {
            if (prefix[n] == '/') {
                ip = prefix.slice(0, n);
                bits = prefix.slice(n + 1);
                if (bits !== "" && !isNaN(bits)) {
                    return [ip, parseInt(bits)];
                }
            }
        }
        throw new Error("Not valid prefix");
    },

    isValidPrefix: function(prefix){
        try {
            return this._isValidPrefix(prefix, this.getAddressFamily(prefix));
        } catch (error) {
            return false;
        }
    },

    _isValidPrefix: function(prefix, af){
        let bits, ip;

        if (prefix !== prefix.trim()) {
            return false;
        }

        try {
            const components = this.getIpAndCidr(prefix);

            ip = components[0];
            bits = components[1];
            if (af === 4) {
                return this._isValidIP(ip, af) && (bits >= 0 && bits <= spaceConfig.v4.bits);
            } else {
                return this._isValidIP(ip, af) && (bits >= 0 && bits <= spaceConfig.v6.bits);
            }

        } catch (e) {
            return false;
        }
    },

    isValidIP: function(ip) {
        try {
            return this._isValidIP(ip, this.getAddressFamily(ip));
        } catch (error) {
            return false;
        }
    },

    _isValidIP: function(ip, af) {
        try {
            if (!ip.includes("/")) {
                if (af === 4) {
                    return spaceConfig.v4.regex.test(ip);
                } else {
                    return spaceConfig.v6.regex.test(ip);
                }
            }

            return false;
        } catch (e) {
            return false;
        }
    },

    sortByPrefixLength: function (a, b) {
        const netA = this.getIpAndCidr(a)[1];
        const netB = this.getIpAndCidr(b)[1];

        return parseInt(netA) - parseInt(netB);
    },

    sortByPrefix: function (a, b) {
        const prefixAndNetA = this.getIpAndCidr(a);
        const prefixAndNetB = this.getIpAndCidr(b);
        const prefixA = prefixAndNetA[0];
        const prefixB = prefixAndNetB[0];
        const netA = prefixAndNetA[1];
        const netB = prefixAndNetB[1];

        const sortIp = this.sortByIp(prefixA, prefixB);

        if (sortIp === 0) {
            return parseInt(netA) - parseInt(netB);
        } else {
            return sortIp;
        }
    },

    getPieces: function(ip) {
        const af = this.getAddressFamily(ip);

        if (af === 4) {
            return ip.split(spaceConfig.v4.splitChar).map(i => parseInt(i));
        } else {
            return ip.split(spaceConfig.v6.splitChar).map(i => parseInt(i, 16));
        }
    },

    sortByIp: function (ipA, ipB) {
        const piecesA = this.getPieces(ipA);
        const piecesB = this.getPieces(ipB);

        for (let n=0; n<piecesA.length; n++) {
            if (piecesA[n] < piecesB[n]) {
                return -1;
            } else if (piecesA[n] > piecesB[n]) {
                return 1;
            }
        }

        return 0;
    },

    _v6Pad: function(ip){
        return parseInt(ip, 16).toString(2).padStart(spaceConfig.v6.blockSize, '0');
    },

    _v4Pad: function(ip){
        return parseInt(ip).toString(2).padStart(spaceConfig.v4.blockSize, '0');
    },

    _expandIP: function(ip, af, shortenedIpv6) {
        af = af || this.getAddressFamily(ip);
        return (af === 4) ? this._expandIPv4(ip) : this._expandIPv6(ip, shortenedIpv6);
    },

    expandIP: function(ip, shortenedIpv6) {
        const af = this.getAddressFamily(ip);

        if (this._isValidIP(ip, af)) {
            return this._expandIP(ip, af, shortenedIpv6);
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

    _expandIPv6: function(ip, shortenedIpv6) {
        ip = ip.toLowerCase();
        const segments = ip.split(spaceConfig.v6.splitChar);
        const count = segments.length - 1;

        ip = segments
            .map(segment => {
                if (segment.length && segment == 0) { // Weak equality
                    return "0";
                } else {
                    return segment || ""
                }
            })
            .join(spaceConfig.v6.splitChar);

        if (count !== 7) {
            const extra = ':' + (new Array(8 - count).fill(0)).join(':') + ':';

            ip = ip.replace("::", extra);

            if (ip[0] === ':') {
                ip = '0' + ip;
            }
            if (ip[ip.length - 1] === ':') {
                ip += '0';
            }
        }

        return shortenedIpv6 ? ip : ip.split(":").map(i => ("0000" + i).slice(-4)).join(":");
    },

    isEqualIP: function(ip1, ip2) {
        const af1 = this.getAddressFamily(ip1);
        const af2 = this.getAddressFamily(ip2);
        if (this._isValidIP(ip1, af1) && this._isValidIP(ip2, af2)) {
            return af1 === af2 && this._isEqualIP(ip1, ip2, af1);
        } else {
            throw new Error("Not valid IP");
        }
    },

    isEqualPrefix: function(prefix1, prefix2) {
        const af1 = this.getAddressFamily(prefix1);
        const af2 = this.getAddressFamily(prefix2);
        if (this._isValidPrefix(prefix1, af1) && this._isValidPrefix(prefix2, af2)) {
            return af1 === af2 && this._isEqualPrefix(prefix1, prefix2, af1);
        } else {
            throw new Error("Not valid prefix");
        }
    },

    _isEqualIP: function(ip1, ip2, af) {
        return this._expandIP(ip1, af) === this._expandIP(ip2, af);
    },

    _isEqualPrefix: function(prefix1, prefix2, af) {
        const components1 = this.getIpAndCidr(prefix1);
        const components2 = this.getIpAndCidr(prefix2);

        return components1[1] === components2[1] && this._isEqualIP(components1[0], components2[0], af);
    },

    getAddressFamily: function(ip) {
        try {
            return (ip.indexOf(spaceConfig.v6.splitChar) === -1) ? 4 : 6;
        } catch (error) {
            throw new Error("Not valid IP or Prefix");
        }
    },

    toBinary: function (ip) {
        return this._toBinary(ip, this.getAddressFamily(ip));
    },

    _toBinary: function(ip, af) {
        let bytes = "";
        let pad, splitter;
        let point = 0;
        let internalCache;

        if (af === 4) {
            pad = this._v4Pad;
            splitter = spaceConfig.v4.splitChar;
            ip = this._expandIPv4(ip);
            internalCache = cache.v4;
        } else {
            pad = this._v6Pad;
            splitter = spaceConfig.v6.splitChar;
            ip = this._expandIPv6(ip);
            internalCache = cache.v6;
        }

        for (let n=1; n<ip.length; n++) {
            if (ip[n] == splitter) {

                const segment = ip.slice(point, n);
                if (internalCache[segment] == undefined) {
                    internalCache[segment] = pad(segment);
                }
                bytes += internalCache[segment];
                point = n + 1;
            }
        }

        const segment = ip.slice(point);
        if (internalCache[segment] == undefined) {
            internalCache[segment] = pad(segment);
        }
        bytes += internalCache[segment];

        return bytes;
    },

    applyNetmask: function(prefix, af) {
        const components = this.getIpAndCidr(prefix);
        const ip = components[0];
        const bits = components[1];
        af = af || this.getAddressFamily(ip);

        return this._applyNetmask(ip, bits, af);
    },

    _applyNetmask: function(ip, bits, af) {
        if (af === 4){
            return this._toBinary(ip, af).padEnd(spaceConfig.v4.bits, '0').slice(0, bits);
        } else {
            return this._toBinary(ip, af).padEnd(spaceConfig.v6.bits, '0').slice(0, bits);
        }
    },

    _getPaddedNetmask: function (binary, af) {
        if (af === 4){
            return binary.padEnd(spaceConfig.v4.bits, '0');
        } else {
            return binary.padEnd(spaceConfig.v6.bits, '0');
        }
    },

    isSubnetBinary: (prefixContainer, prefixContained) => {
        return prefixContained !== prefixContainer && prefixContained.startsWith(prefixContainer);
    },

    isSubnet: function (prefixContainer, prefixContained) {
        const p1af = this.getAddressFamily(prefixContainer);
        const p2af = this.getAddressFamily(prefixContained);

        return p1af === p2af && this._isSubnet(prefixContainer, prefixContained, p1af, p2af);
    },

    _isSubnet: function (prefixContainer, prefixContained, p1af, p2af) {
        const components1 = this.getIpAndCidr(prefixContainer);
        const components2 = this.getIpAndCidr(prefixContained);

        return this.isSubnetBinary(this._applyNetmask(components1[0], components1[1], p1af), this._applyNetmask(components2[0], components2[1], p2af));
    },

    cidrToRange: function (cidr) { // Not optimized!
        const af = this.getAddressFamily(cidr);

        return this._cidrToRange(cidr, af);
    },

    _cidrToRange: function (prefix, af) {
        const components = this.getIpAndCidr(prefix);
        const ip = components[0];
        const bits = components[1];
        let first, last;

        if (af === 4){
            first = this._toBinary(ip, af).slice(0, bits).padEnd(spaceConfig.v4.bits, '0');
            last = this._toBinary(ip, af).slice(0, bits).padEnd(spaceConfig.v4.bits, '1');
        } else {
            first = this._toBinary(ip, af).slice(0, bits).padEnd(spaceConfig.v6.bits, '0');
            last = this._toBinary(ip, af).slice(0, bits).padEnd(spaceConfig.v6.bits, '1');
        }

        first = this.fromBinary(first, af);
        last = this.fromBinary(last, af);

        return [first, last];
    },

    getComponents: function (ip) {
        const af = this.getAddressFamily(ip);
        ip = this._expandIP(ip, af);

        return this._getComponents(ip, af);
    },

    _getComponents: function (ip, af) {
        return ip.split((af === 4) ? spaceConfig.v4.splitChar : spaceConfig.v6.splitChar);
    },

    fromBinary: function (ip, af) {
        let splitter, blockSize, mapper;

        if (af === 4) {
            blockSize = spaceConfig.v4.blockSize;
            splitter = spaceConfig.v4.splitChar;
            mapper = function (bin) {
                return parseInt(bin, 2);
            }
        } else {
            blockSize = spaceConfig.v6.blockSize;
            splitter = spaceConfig.v6.splitChar;
            mapper = function (bin) {
                return parseInt(bin, 2).toString(16);
            }
        }
        const components = ip.match(new RegExp('.{1,' + blockSize + '}', 'g')).map(mapper);

        return components.join(splitter);
    },

    getSubPrefixes: function (prefix, recursive, netMaskIndex, af) {
        const [ip, bits] = this.getIpAndCidr(prefix);
        let out = [];
        netMaskIndex = netMaskIndex || {};

        const newbits = bits + 1;
        const position = Math.floor(bits / spaceConfig[`v${af}`].blockSize);

        if (af === 4) {
            let components = this._getComponents(ip, af);

            if (bits >= spaceConfig.v4.ipSizeCheck) {
                return [];
            }
            while (components[position] < spaceConfig.v4.blockMax) {
                const ipTmp = components.join(spaceConfig.v4.splitChar);
                const msk = this._applyNetmask(ipTmp, newbits, af);
                if (!netMaskIndex[msk]) {
                    out.push(ipTmp + "/" + newbits);
                    netMaskIndex[msk] = true;
                }

                components[position] ++;
            }

        } else {
            let components = this._getComponents(this._expandIP(ip, af), af)
            if (bits >= spaceConfig.v6.ipSizeCheck) {
                return [];
            }
            let item = parseInt(components[position], spaceConfig.v6.blockSize);
            const max = parseInt(spaceConfig.v6.blockMax, spaceConfig.v6.blockSize);

            while (item < max) {
                const ipTmp = components.join(spaceConfig.v6.splitChar);
                const prefixTmp = `${ipTmp}/${newbits}`;
                const msk = this._applyNetmask(ipTmp, newbits, af);
                if (!netMaskIndex[msk]) {
                    out.push(prefixTmp);
                    netMaskIndex[msk] = true;
                }

                item ++;
                components[position] = item.toString(16);
            }

        }

        if (recursive) {
            return [].concat.apply([], out.concat(out.map(prefix => this.getSubPrefixes(prefix, true, netMaskIndex, af))));
        } else {
            return out;
        }
    },

    getAllSiblings: function (prefix) {
        const [ip, bits] = this.getIpAndCidr(prefix);
        const af = this.getAddressFamily(ip);
        this._getAllSiblings(ip, bits, af, bits);
    },

    _getAllSiblings: function (ip, bits, af, parentBits) {
        let next = this._getNextSiblingPrefix(ip, bits, af, parentBits);
        const out = [];

        while (next) {
            out.push(next);
            next = this._getNextSiblingPrefix(...next, parentBits)
        }

        return out.map(i => i[0] + "/" + i[1]);
    },

    _getNextSiblingPrefix: function (ip, bits, af, parentBits) {
        parentBits = parentBits || bits - 1;
        ip = this._expandIP(ip, af);
        let msk = this._applyNetmask(ip, bits, af);

        if (af === 4) {
            let value = parseInt(msk, 2) + 1;
            const result = value.toString(2).padStart(msk.length, "0");

            if (msk.slice(0, parentBits) === result.slice(0, parentBits)) {
                return [this.fromBinary(this._getPaddedNetmask(result, 4), 4), bits, af];
            } else {
                return null;
            }
        } else {
            // TODO

            // let value = parseInt(msk, 16) + "1".toString(16);
            // return [this.fromBinary(this._getPaddedNetmask(value.toString(2), 6), 6), bits, af];
        }
    },

    ipRangeToCidr: function (ip1, ip2) { // Not optimized!
        const af = this.getAddressFamily(ip1);
        let blockSize, ipSizeCheck, splitChar;

        ip1 = this._expandIP(ip1, af);
        ip2 = this._expandIP(ip2, af);

        if (af === 4) {
            blockSize = spaceConfig.v4.blockSize;
            ipSizeCheck = spaceConfig.v4.ipSizeCheck;
            splitChar = spaceConfig.v4.splitChar;
        } else {
            blockSize = spaceConfig.v6.blockSize;
            ipSizeCheck = spaceConfig.v6.ipSizeCheck;
            splitChar = spaceConfig.v6.splitChar;
        }

        const ip1Blocks = ip1.split(splitChar);
        const ip2Blocks = ip2.split(splitChar);

        let bits = 0;

        for (let n=0; n<= ip1Blocks.length; n++) {
            if (ip1Blocks[n] === ip2Blocks[n]) {
                bits += blockSize;
            } else {
                break;
            }
        }

        return this._compositeRange(ip1, ip2, bits, af, ipSizeCheck);
    },

    _compositeRange: function (ip1, ip2, bits, af, ipSizeCheck) {
        let mPrefixes = [];

        for (let b=bits; b <= ipSizeCheck; b++){
            const tested = `${ip1}/${b}`;
            mPrefixes.push(tested);
            mPrefixes = mPrefixes.concat(this._getAllSiblings(ip1, b, af, bits));
            const range = this._cidrToRange(tested, af);
            if (range[0] === ip1 && range[1] === ip2) {
                return [tested];
            }
        }

        const out = [];
        const start = this._toBinary(ip1, af);
        const stop = this._toBinary(ip2, af);
        const sorted = mPrefixes
            .filter(prefix => {
                const range = this._cidrToRange(prefix, af).map(ip => this._toBinary(ip, af));

                return  range[0] >= start && range[1] <= stop;
            })
            .sort((a, b) => this.sortByPrefixLength(a, b));

        let pTmp = sorted.pop();
        while (pTmp) {
            if (!sorted.some(prefix => this._isSubnet(prefix, pTmp, af, af))) {
                out.push(pTmp);
            }
            pTmp = sorted.pop();
        }

        return out;
    },

    toPrefix: function (ipOrPrefix) {
        if (this.isValidPrefix(ipOrPrefix)) {
            return ipOrPrefix;
        } else if (this.isValidIP(ipOrPrefix)) {
            if (this.getAddressFamily(ipOrPrefix) === 4) {
                return `${ipOrPrefix}/${spaceConfig.v4.bits}`;
            } else {
                return `${ipOrPrefix}/${spaceConfig.v6.bits}`;
            }
        }

    },

    // DEPRECATIONS
    getIpAndNetmask: function (prefix) {
        return this.getIpAndCidr(prefix);
    },
    getNetmask: function(prefix, af) {
        return this.applyNetmask(prefix, af);
    },
    _getNetmask: function (ip, bits, af) {
        return this._applyNetmask(ip, bits, af);
    },
    addCidr: function (prefix) {
        return this.toPrefix(prefix);
    },
};

module.exports = ip;