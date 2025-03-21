const chai = require("chai");
const ipUtils = require("../ipUtils");
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);
const expect = chai.expect;

const generateTestList = () => {
    const prefix = "211.130.0.0/16";
    const ip = "211.130";
    const bits = 16;
    const subs = [];

    const binary = ipUtils.applyNetmask(prefix);

    for (let n=0; n<=255; n++) {
        for (let f=0; f<=255; f++) {
            for (let s=bits + 1; s<=32; s++) {
                const prefix = [ip, n, f].join(".") + "/" + s;
                subs.push({
                    prefix,
                    binary: ipUtils.applyNetmask(prefix)
                });
            }
        }
    }

    return { prefix, binary, subs };
}

describe("Tests", function() {
    const { prefix, subs, binary } = generateTestList();

    it("subprefix test", function () {

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
            ],

            "23.20.0.0/14": [
                {
                    prefix: "23.11.254.0/23",
                    subPrefix: false
                },
                {
                    prefix: "23.11.244.0/22",
                    subPrefix: false
                },
                {
                    prefix: "23.11.16.0/20",
                    subPrefix: false
                }
            ],

            "201:11:123::/40": [
                {
                    prefix: "201:11:123::/48",
                    subPrefix: true
                },
                {
                    prefix: "201:db8:123::/48",
                    subPrefix: false
                },
                {
                    prefix: "201.11.123.0/24",
                    subPrefix: false
                }
            ]
        };

        for (let prefix in list) {
            for (let sub of list[prefix]) {
                expect(ipUtils.isSubnet(prefix, sub.prefix)).to.equal(sub.subPrefix);
            }
        }

    });

    it("subprefix range test", function () {

        for (let sub of subs) {
            expect(ipUtils.isSubnet(prefix, sub.prefix)).to.equal(true);
        }
    }).timeout(15000);

    it("subprefix range test - binary (performance)", function () {

        for (let sub of subs) {
            expect(ipUtils.isSubnetBinary(binary, sub.binary)).to.equal(true);
        }
    }).timeout(20000);

    it("sort by prefix length", function () {

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

    it("validity", function () {
        expect(ipUtils.isValidIP(null)).to.equal(false);
        expect(ipUtils.isValidIP("2001:db8:123::")).to.equal(true);
        expect(ipUtils.isValidIP("::ffff:0:0")).to.equal(true);
        expect(ipUtils.isValidIP("::ffff::0:0")).to.equal(false);
        expect(ipUtils.isValidIP("::")).to.equal(true);
        expect(ipUtils.isValidIP("::1")).to.equal(true);
        expect(ipUtils.isValidIP("2001:db8:123::/64")).to.equal(false);
        expect(ipUtils.isValidIP("2001:db8:123::/6433")).to.equal(false);
        expect(ipUtils.isValidIP("2001:db8:123::/64ff")).to.equal(false);
        expect(ipUtils.isValidIP("127.0.0.1")).to.equal(true);
        expect(ipUtils.isValidIP("127.0.0.1/32")).to.equal(false);

        expect(ipUtils.isValidIP("127.0.0.290")).to.equal(false);
        expect(ipUtils.isValidIP("127.0")).to.equal(false);
        expect(ipUtils.isValidIP("2001::db8:123::")).to.equal(false);

        expect(ipUtils.isValidPrefix("2001:db8:123::/64")).to.equal(true);
        expect(ipUtils.isValidPrefix("94.228.208.0/20\tNL\tNL-NH\tAmsterdam")).to.equal(false);
        expect(ipUtils.isValidPrefix("::/0")).to.equal(true);
        expect(ipUtils.isValidPrefix("::/128")).to.equal(true);
        expect(ipUtils.isValidPrefix("::/129")).to.equal(false);
        expect(ipUtils.isValidPrefix("::1/0")).to.equal(true);
        expect(ipUtils.isValidPrefix("2001:db8:123::/129")).to.equal(false);
        expect(ipUtils.isValidPrefix("127.0.0.1/32")).to.equal(true);
        expect(ipUtils.isValidPrefix("127.0.0.1/64")).to.equal(false);
        expect(ipUtils.isValidPrefix("204.2.186.0/")).to.equal(false);
        expect(ipUtils.isValidPrefix("185.5.202.255/32")).to.equal(true);
        expect(ipUtils.isValidPrefix("185.5.202.0/32")).to.equal(true);
        expect(ipUtils.isValidPrefix("0::/0")).to.equal(true);
        expect(ipUtils.isValidPrefix("::/0")).to.equal(true);
        expect(ipUtils.isValidPrefix("2804:8f8::/32")).to.equal(true);

    });

    it("equality", function () {
        expect(ipUtils.isEqualIP("2001:db8:123::", "2001:db8:123:0::0:0")).to.equal(true);
        expect(ipUtils.isEqualIP("2001:db8:123::", "2001:db8:123::")).to.equal(true);
        expect(ipUtils.isEqualIP("2001:db8:123::", "2001:DB8:123::0")).to.equal(true);
        expect(ipUtils.isEqualIP("2001:db8:123::", "2001:db8::123:0")).to.equal(false);
        expect(ipUtils.isEqualIP("2001:db8:123::", "2001:db8::123")).to.equal(false);


        expect(ipUtils._isEqualIP("127", "127.0.0.0")).to.equal(true);
        expect(ipUtils._isEqualIP("127", "127.0.0.1")).to.equal(false);
        expect(ipUtils._isEqualIP("127.0.1", "127.0.0.1")).to.equal(false);


        expect(ipUtils.isEqualPrefix("2001:db8:123::/48", "2001:db8:123::/48")).to.equal(true);
        expect(ipUtils.isEqualPrefix("2001:db8:123::/48", "2001:db8:123::/49")).to.equal(false);
        expect(ipUtils.isEqualPrefix("2001:db8::/48", "2001:db8:0000::/48")).to.equal(true);
        expect(ipUtils.isEqualPrefix("2001:db8::/48", "2001:db9::/48")).to.equal(false);
        expect(ipUtils.isEqualPrefix("2001:db8::/48", "2001:db8:0000::/48")).to.equal(true);
        expect(ipUtils.isEqualPrefix("2001:db8::/48", "2001:db8:0001::/48")).to.equal(false);
        expect(ipUtils.isEqualPrefix("2001:db8::/48", "2001:db8::/47")).to.equal(false);
        expect(ipUtils.isEqualPrefix("2001:db8::/47", "2001:0db8:0001:ffff:ffff:ffff:ffff:ffff/47")).to.equal(true);
        expect(ipUtils.isEqualPrefix("2001:db8::/47", "2001:0db8:0002:ffff:ffff:ffff:ffff:ffff/47")).to.equal(false);

        expect(ipUtils.isEqualPrefix("127.0.0.0/8", "127.0.0.0/8")).to.equal(true);
        expect(ipUtils.isEqualPrefix("127.0.0.0/8", "130.0.0.0/8")).to.equal(false);
        expect(ipUtils.isEqualPrefix("127.1.1.1/24", "127.0.0.8/24")).to.equal(false);
        expect(ipUtils.isEqualPrefix("127.1.1.1/24", "127.1.1.8/24")).to.equal(true);
        expect(ipUtils.isEqualPrefix("127.1.1.1/24", "127.1.1.8/23")).to.equal(false);
        expect(ipUtils.isEqualPrefix("127.1.1.1/22", "127.1.2.8/22")).to.equal(true);
        expect(ipUtils.isEqualPrefix("127.1.1.1/22", "127.1.3.8/22")).to.equal(true);
        expect(ipUtils.isEqualPrefix("127.1.1.1/22", "127.1.4.8/22")).to.equal(false);
        expect(ipUtils._isEqualPrefix("127/8", "127.0.0.0/8")).to.equal(true);

        expect(ipUtils._expandIP("127")).to.equal("127.0.0.0");
    });

    it("netmask test - cache mixup", function () {
        expect(ipUtils.applyNetmask("2001:11::/64")).to.equal("0010000000000001000000000001000100000000000000000000000000000000");
        expect(ipUtils.applyNetmask("127.11.0.0/22")).to.equal("0111111100001011000000");
    });

    it("expansion", function () {
        expect(ipUtils._expandIP("2001:db8:123::")).to.equal("2001:0db8:0123:0000:0000:0000:0000:0000");
        expect(ipUtils.expandIP("2001:db8:123::", true)).to.equal("2001:db8:123:0:0:0:0:0");
        expect(ipUtils.expandIP("2001:db8:123::", false)).to.equal("2001:0db8:0123:0000:0000:0000:0000:0000");
        expect(ipUtils.expandIP("2001:db8:123::")).to.equal("2001:0db8:0123:0000:0000:0000:0000:0000");
        expect(ipUtils._expandIP("127")).to.equal("127.0.0.0");
        expect(ipUtils.expandIP("2001:db8:123::", true)).to.equal("2001:db8:123:0:0:0:0:0");
        expect(ipUtils._expandIP("2001:db8:123::")).to.equal("2001:0db8:0123:0000:0000:0000:0000:0000");
        expect(ipUtils._expandIP("2001:db8::")).to.equal(ipUtils._expandIP("2001:db8:0::"));
        expect(ipUtils._expandIP("2001:db8::")).to.equal(ipUtils._expandIP("2001:db8:0000::"));
        expect(ipUtils.expandPrefix("2001:db8:123::/48")).to.equal("2001:0db8:0123:0000:0000:0000:0000:0000/48");
        expect(ipUtils.expandPrefix("2001:0db8:0123:0000:0000:0000:0000:0000/48")).to.equal("2001:0db8:0123:0000:0000:0000:0000:0000/48");


        expect(ipUtils.shortenPrefix("2001:0db8:0123:0000:0000:0000:0000:0000/48")).to.equal("2001:db8:123::/48");
        expect(ipUtils.shortenIP("2001:0db8:0123:0000:0000:0000:0000:0000")).to.equal("2001:db8:123::");
        expect(ipUtils.shortenIP("1.3.2.3")).to.equal("1.3.2.3");

    });


    it("range to cidr", function () {
        expect(ipUtils.ipRangeToCidr("216.168.129.0", "216.168.130.255"))
            .to.have.members(["216.168.129.0/24", "216.168.130.0/24"]);

        expect(ipUtils.ipRangeToCidr("89.219.134.0", "89.219.154.255"))
            .to.have.members(["89.219.134.0/23", "89.219.136.0/21", "89.219.144.0/21", "89.219.152.0/23", "89.219.154.0/24"]);

        expect(ipUtils.ipRangeToCidr("216.168.129.0", "216.168.130.254").sort())
            .to.have.members(["216.168.129.0/24", "216.168.130.0/25", "216.168.130.128/26", "216.168.130.192/27", "216.168.130.224/28", "216.168.130.240/29", "216.168.130.248/30", "216.168.130.252/31", "216.168.130.254/32"].sort());

    }).timeout(20000);

    it("add cidr", function () {
        expect(ipUtils.toPrefix("216.168.129.0"))
            .to.equal("216.168.129.0/32");

        expect(ipUtils.toPrefix("216.168.129.0/28"))
            .to.equal("216.168.129.0/28");

        expect(ipUtils.toPrefix("216.168.129.0/32"))
            .to.equal("216.168.129.0/32");

        expect(ipUtils.toPrefix("2001:db8:0000::"))
            .to.equal("2001:db8::/128");

        expect(ipUtils.toPrefix("2001:db8:0000::/64"))
            .to.equal("2001:db8::/64");

        expect(ipUtils.toPrefix("2001:db8::/128"))
            .to.equal("2001:db8::/128");

    }).timeout(20000);

    it("to prefix", function () {
        expect(ipUtils.toPrefix("216.168.129.0"))
            .to.equal("216.168.129.0/32");

        expect(ipUtils.toPrefix("216.168.129.0/28"))
            .to.equal("216.168.129.0/28");

        expect(ipUtils.toPrefix("216.168.129.0/32"))
            .to.equal("216.168.129.0/32");

        expect(ipUtils.toPrefix("2001:db8:0000::"))
            .to.equal("2001:db8::/128");

        expect(ipUtils.toPrefix("2001:db8:0000::/64"))
            .to.equal("2001:db8::/64");

        expect(ipUtils.toPrefix("2001:db8::/128"))
            .to.equal("2001:db8::/128");

    }).timeout(20000);

    it("sort IPs", function () {

        const ips = [
            "216.168.129.3",
            "116.168.129.0",
            "216.168.129.1",
            "216.5.129.0",
            "116.268.129.0",
            "216.168.129.0"
        ];

        const sorted = [
            "116.168.129.0",
            "116.268.129.0",
            "216.5.129.0",
            "216.168.129.0",
            "216.168.129.1",
            "216.168.129.3"
        ];

        expect(ips.sort((a, b) => ipUtils.sortByIp(a, b)).join("-"))
            .to.equal(sorted.join("-"));

    }).timeout(20000);

    it("sort prefixes v4", function () {

        const ips = [
            "216.168.129.1/24",
            "216.168.129.0/28",
            "216.168.129.1/23",
            "116.168.129.0/20",
            "216.168.129.3/24",
            "116.168.129.0/21"
        ];

        const sorted = [
            "116.168.129.0/20",
            "116.168.129.0/21",
            "216.168.129.0/28",
            "216.168.129.1/23",
            "216.168.129.1/24",
            "216.168.129.3/24"
        ];

        expect(ips.sort((a, b) => ipUtils.sortByPrefix(a, b)).join("-"))
            .to.equal(sorted.join("-"));

    }).timeout(20000);

    it("sort prefixes v6", function () {

        const ips = [
            "2002:db0:0000::/128",
            "2001:db1:0000::/128",
            "2001:db2:0000::/128",
            "2002:db0:0000::/126",
        ];

        const sorted = [
            "2001:db1:0000::/128",
            "2001:db2:0000::/128",
            "2002:db0:0000::/126",
            "2002:db0:0000::/128"
        ];

        expect(ips.sort((a, b) => ipUtils.sortByPrefix(a, b)).join("-"))
            .to.equal(sorted.join("-"));

    }).timeout(20000);


    it("cidr to range", function () {

        expect(ipUtils.cidrToRange("216.168.236.112/28").join("-")).to.equal("216.168.236.112-216.168.236.127");
        expect(ipUtils.cidrToRange("2002:db0::/32").join("-")).to.equal("2002:db0:0:0:0:0:0:0-2002:db0:ffff:ffff:ffff:ffff:ffff:ffff");

    });

    it("to prefix", function () {

        expect(ipUtils.toPrefix("216.168.236.112/8")).to.equal("216.0.0.0/8");
        expect(ipUtils.toPrefix("216.168.236.112/32")).to.equal("216.168.236.112/32");

        expect(ipUtils.toPrefix("2001:db8::5/16")).to.equal("2001::/16");
        expect(ipUtils.toPrefix("2001:db8::/32")).to.equal("2001:db8::/32");
        expect(ipUtils.toPrefix("2001:db8::1/128")).to.equal("2001:db8::1/128");

    });

    it("valid cidr", function () {

        expect(ipUtils.isValidCIDR("123.1.0.0/32")).to.equal(true);
        expect(ipUtils.isValidCIDR("123.1.0.0/19")).to.equal(true);
        expect(ipUtils.isValidCIDR("123.1.0.0/16")).to.equal(true);
        expect(ipUtils.isValidCIDR("123.1.0.0/15")).to.equal(false);
        expect(ipUtils.isValidCIDR("123.1.0.0/14")).to.equal(false);
        expect(ipUtils.isValidCIDR("123.1.0.0/13")).to.equal(false);

        expect(ipUtils.isValidCIDR("2001:db8::1/128")).to.equal(true);
        expect(ipUtils.isValidCIDR("2001:db8::/32")).to.equal(true);
        expect(ipUtils.isValidCIDR("2001:db8::/16")).to.equal(false);
    });

    it("getAllLessSpecificBinaries", function () {

        expect(ipUtils.getAllLessSpecificBinaries("123.1.0.0/12").sort().join("-"))
            .to.equal(["0","01","011","0111","01111","011110","0111101","01111011","011110110","0111101100","01111011000","011110110000"].sort().join("-"));

        expect(ipUtils.getAllLessSpecificBinaries("2001::/16").sort().join("-"))
            .to.equal(["0","00","001","0010","00100","001000","0010000","00100000","001000000","0010000000","00100000000","001000000000","0010000000000","00100000000000","001000000000000","0010000000000001"].sort().join("-"));
    });
});


