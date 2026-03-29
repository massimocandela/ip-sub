const ipUtils = require("../ipUtils");

const iterations = 10000;

const v4Ips = [];
const v4Prefixes = [];
const v6Ips = [];
const v6Prefixes = [];
for (let i = 0; i < iterations; i++) {
    const a = (i >> 8) & 0xFF;
    const b = i & 0xFF;
    v4Ips.push(`10.0.${a}.${b}`);
    v4Prefixes.push(`10.0.${a}.${b}/24`);
    const hex = i.toString(16).padStart(4, "0");
    v6Ips.push(`2001:db8::${hex}`);
    v6Prefixes.push(`2001:db8:${hex}::/48`);
}

const bench = (label, fn) => {
    const start = process.hrtime.bigint();
    fn();
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`  ${label}: ${elapsed.toFixed(2)} ms`);
    return elapsed;
};

console.log(`\nPerformance Benchmark (${iterations} iterations)\n`);

bench(`toBinary v4`, () => {
    for (const ip of v4Ips) {
        ipUtils.toBinary(ip);
    }
});
bench(`toBinary v6`, () => {
    for (const ip of v6Ips) {
        ipUtils.toBinary(ip);
    }
});

bench(`expandIP v4`, () => {
    for (const ip of v4Ips) {
        ipUtils.expandIP(ip);
    }
});
bench(`expandIP v6`, () => {
    for (const ip of v6Ips) {
        ipUtils.expandIP(ip);
    }
});

bench(`isValidPrefix v4`, () => {
    for (const p of v4Prefixes) {
        ipUtils.isValidPrefix(p);
    }
});
bench(`isValidPrefix v6`, () => {
    for (const p of v6Prefixes) {
        ipUtils.isValidPrefix(p);
    }
});

bench(`applyNetmask v4`, () => {
    for (const p of v4Prefixes) {
        ipUtils.applyNetmask(p);
    }
});
bench(`applyNetmask v6`, () => {
    for (const p of v6Prefixes) {
        ipUtils.applyNetmask(p);
    }
});

bench(`isSubnet v4`, () => {
    for (const p of v4Prefixes) {
        ipUtils.isSubnet("10.0.0.0/8", p);
    }
});
bench(`isSubnet v6`, () => {
    for (const p of v6Prefixes) {
        ipUtils.isSubnet("2001:db8::/32", p);
    }
});

bench(`isEqualPrefix v4`, () => {
    for (const p of v4Prefixes) {
        ipUtils.isEqualPrefix(p, p);
    }
});
bench(`isEqualPrefix v6`, () => {
    for (const p of v6Prefixes) {
        ipUtils.isEqualPrefix(p, p);
    }
});

const v4Shuffled = [...v4Prefixes].sort(() => Math.random() - 0.5);
const v6Shuffled = [...v6Prefixes].sort(() => Math.random() - 0.5);
bench(`sortByPrefix v4 (${iterations} items)`, () => {
    v4Shuffled.sort((a, b) => ipUtils.sortByPrefix(a, b));
});
bench(`sortByPrefix v6 (${iterations} items)`, () => {
    v6Shuffled.sort((a, b) => ipUtils.sortByPrefix(a, b));
});

const v4WithDups = [...v4Ips.slice(0, iterations / 2), ...v4Ips.slice(0, iterations / 2)];
const v6WithDups = [...v6Ips.slice(0, iterations / 2), ...v6Ips.slice(0, iterations / 2)];
bench(`unique v4 (${v4WithDups.length} items, 50% dups)`, () => {
    ipUtils.unique(v4WithDups);
});
bench(`unique v6 (${v6WithDups.length} items, 50% dups)`, () => {
    ipUtils.unique(v6WithDups);
});

console.log("");
