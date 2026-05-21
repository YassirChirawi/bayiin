const badText = "Ã˜Â¨Ã˜Â§Ã™Å Ã˜Â¹Ã™Å Ã™â€ .. Ã˜Â¨Ã˜Â§Ã˜Â´ Ã™Å Ã˜Â¨Ã™â€šÃ™â€° Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â²Ã™â€š Ã˜Â¨Ã˜Â§Ã™Å Ã™â€  Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ Ã˜Â¨Ã˜Â§Ã™Å Ã™â€ .";
const badText2 = "GÃƒÂ©rez";

function decode1(str) {
    try {
        return decodeURIComponent(escape(str));
    } catch(e) { return "error"; }
}

function decode2(str) {
    try {
        return Buffer.from(str, 'latin1').toString('utf8');
    } catch(e) { return "error"; }
}

function recursiveDecode(str) {
    let current = str;
    for(let i=0; i<3; i++) {
        let next = decode2(current);
        if(next !== current && !next.includes('Ã')) {
            current = next;
        }
    }
    return current;
}

console.log("Original 1:", badText);
console.log("Decode1 1:", decode1(badText));
console.log("Decode2 1:", decode2(badText));
console.log("Recursive2 1:", recursiveDecode(badText));
console.log("decode2(decode2) 1:", decode2(decode2(badText)));

console.log("\nOriginal 2:", badText2);
console.log("Decode1 2:", decode1(badText2));
console.log("Decode2 2:", decode2(badText2));
console.log("Recursive2 2:", recursiveDecode(badText2));
console.log("decode2(decode2) 2:", decode2(decode2(badText2)));
