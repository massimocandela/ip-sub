const ipAdd = require("ip-address");
const Address4 = ipAdd.Address4;
const Address6 = ipAdd.Address6;

const cache = {
    v4: {},
    v6: {}
};

const spaceConfig = {
    v4: {
        blockSize: 8,
        ipSizeCheck: 32,
        splitChar: ".",
        blockMax: 255
    },
    v6: {
        blockSize: 16,
        ipSizeCheck: 64,
        splitChar: ":",
        blockMax: "ffff"
    }
};

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
        return this._isValidPrefix(prefix, this.getAddressFamily(prefix));
    },

    _isValidPrefix: function(prefix, af){
        let bits, ip;

        try {
            const components = this.getIpAndNetmask(prefix);

            ip = components[0];
            bits = components[1];
            if (af === 4) {
                return this._isValidIP(ip, af) && (bits >= 0 && bits <= 32);
            } else {
                return this._isValidIP(ip, af) && (bits >= 0 && bits <= 128);
            }

        } catch (e) {
            return false;
        }
    },

    isValidIP: function(ip) {
        return this._isValidIP(ip, this.getAddressFamily(ip));
    },

    _isValidIP: function(ip, af) {

        try {
            if (af === 4) {
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
        return parseInt(ip, 16).toString(2).padStart(spaceConfig.v6.blockSize, '0');
    },

    _v4Pad: function(ip){
        return parseInt(ip).toString(2).padStart(spaceConfig.v4.blockSize, '0');
    },

    _expandIP: function(ip, af) {
        return ((af || this.getAddressFamily(ip)) === 4) ? this._expandIPv4(ip) : this._expandIPv6(ip);
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
        ip = ip.toLowerCase();
        const segments = ip.split(spaceConfig.v6.splitChar);
        const count = segments.length - 1;

        ip = segments
            .map(segment => {
                if (segment.length && segment == 0) { // Weak equality
                    return "0";
                } else {
                    return segment || "";
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
        if (this.isValidPrefix(prefix1) && this.isValidPrefix(prefix2)) {
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
        return (ip.indexOf(spaceConfig.v6.splitChar) === -1) ? 4 : 6;
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
            if (ip[n] === splitter) {

                const segment = ip.slice(point, n);
                if (internalCache[segment] === undefined) {
                    internalCache[segment] = pad(segment);
                }
                bytes += internalCache[segment];
                point = n + 1;
            }
        }

        const segment = ip.slice(point);
        if (internalCache[segment] === undefined) {
            internalCache[segment] = pad(segment);
        }
        bytes += internalCache[segment];

        return bytes;
    },

    getNetmask: function(prefix) {
        const components = this.getIpAndNetmask(prefix);
        const ip = components[0];
        const bits = components[1];
        const af = this.getAddressFamily(ip);

        return this._getNetmask(ip, bits, af);
    },

    _getNetmask: function(ip, bits, af) {
        if (af === 4){
            return this._toBinary(ip, af).padEnd(32, '0').slice(0, bits);
        } else {
            return this._toBinary(ip, af).padEnd(128, '0').slice(0, bits);
        }
    },

    _getPaddedNetmask: function (binary, af) {
        if (af === 4){
            return binary.padEnd(32, '0');
        } else {
            return binary.padEnd(128, '0');
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
        const components1 = this.getIpAndNetmask(prefixContainer);
        const components2 = this.getIpAndNetmask(prefixContained);

        return this.isSubnetBinary(this._getNetmask(components1[0], components1[1], p1af), this._getNetmask(components2[0], components2[1], p2af));
    },

    cidrToRange: function (cidr) { // Not optimized!
        const af = this.getAddressFamily(cidr);

        return this._cidrToRange(cidr, af);
    },

    _cidrToRange: function (cidr, af) { // Not optimized!
        const addr = (af === 4) ? new Address4(cidr) : new Address6(cidr);

        return [this._expandIP(addr.startAddress().address, af), this._expandIP(addr.endAddress().address, af)];
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
            ip = this._expandIP(ip, af);
            mapper = function (bin) {
                return parseInt(bin, 2).toString(16);
            }
        }
        const components = ip.match(new RegExp('.{1,' + blockSize + '}', 'g')).map(mapper);

        return components.join(splitter);
    },

    getSubPrefixes: function (prefix, recursive, netMaskIndex, af) {
        const [ip, bits] = this.getIpAndNetmask(prefix);
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
                const msk = this._getNetmask(ipTmp, newbits, af);
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
                const msk = this._getNetmask(ipTmp, newbits, af);
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
        const [ip, bits] = this.getIpAndNetmask(prefix);
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
        let msk = this._getNetmask(ip, bits, af);

        if (af === 4) {
            let value = parseInt(msk, 2) + 1;
            const result = value.toString(2);

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
    }
};

module.exports = ip;