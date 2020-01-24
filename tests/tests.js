var chai = require("chai");
var ipUtils = require("..//ipUtils");
var chaiSubset = require('chai-subset');
chai.use(chaiSubset);
var expect = chai.expect;

describe("Tests", function() {

    describe("subprefix test", function () {

        const list = {
            "211.130.0.0/16": [
                {
                    prefix: "211.130.128.0/20",
                    subPrefix: true
                },
                {
                    prefix: "211.130.0.0/16",
                    subPrefix: false
                },
                {
                    prefix: "211.130.96.0/19",
                    subPrefix: true
                },
                {
                    prefix: "211.130.152.0/22",
                    subPrefix: true
                }
            ]
        };

        for (let prefix in list) {
            for (let sub of list[prefix]) {
                expect(ipUtils.isSubnet(prefix, sub.prefix)).to.equal(sub.subPrefix);
            }

        }

    });


    describe("subprefix range test", function () {

        const prefix = "211.130.0.0/16";
        const ip = "211.130";
        const bits = 16;


        for (let n=0; n<=255; n++) {
            for (let f=0; f<=255; f++) {
                for (let s=bits + 1; s<=32; s++) {

                    const sub = [ip, n, f].join(".") + "/" + s;
                    expect(ipUtils.isSubnet(prefix, sub)).to.equal(true);
                }
            }
        }

    });

    describe("sort by prefix length", function () {

        const ip = "211.130.0.0";
        const list = [];

        for (let n=8; n<=32; n++) {
            const sub = ip + "/" + n;
            list.push(sub);
        }

        list.sort((a, b) => ipUtils.sortByPrefixLength(b, a));
        const previous = list[0];
        for (let prefix of list.slice(1)) {
            expect(ipUtils.isSubnet(prefix, previous)).to.equal(true);

        }
    });

    describe("equality", function () {
        expect(ipUtils.isEqualIP("2001:db8:123::", "2001:db8:123:0::0:0")).to.equal(true);
        expect(ipUtils.isEqualIP("2001:db8:123::", "2001:db8:123::")).to.equal(true);
        expect(ipUtils.isEqualIP("2001:db8:123::", "2001:db8:123::0")).to.equal(true);
        expect(ipUtils.isEqualIP("2001:db8:123::", "2001:db8::123:0")).to.equal(false);
        expect(ipUtils.isEqualIP("2001:db8:123::", "2001:db8::123")).to.equal(false);


        expect(ipUtils._isEqualIP("127", "127.0.0.0")).to.equal(true);
        expect(ipUtils._isEqualIP("127", "127.0.0.1")).to.equal(false);
        expect(ipUtils._isEqualIP("127.0.1", "127.0.0.1")).to.equal(false);


        expect(ipUtils.isEqualPrefix("2001:db8:123::/48", "2001:db8:123::/48")).to.equal(true);
        expect(ipUtils.isEqualPrefix("2001:db8:123::/48", "2001:db8:123::/49")).to.equal(false);
        expect(ipUtils.isEqualPrefix("2001:db8:123::/48", "2001:db8:124::/48")).to.equal(false);

        expect(ipUtils.isEqualPrefix("127.0.0.0/8", "127.0.0.0/8")).to.equal(true);
        expect(ipUtils._isEqualPrefix("127/8", "127.0.0.0/8")).to.equal(true);

        expect(ipUtils._expandIP("127")).to.equal("127.0.0.0");

    });

    describe("espansion", function () {
        expect(ipUtils._expandIP("2001:db8:123::")).to.equal("2001:db8:123:0:0:0:0:0");
        expect(ipUtils._expandIP("127")).to.equal("127.0.0.0");
        expect(ipUtils._expandIP("2001:db8:123::")).to.equal("2001:db8:123:0:0:0:0:0");
    });



});