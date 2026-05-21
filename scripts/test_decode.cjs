const badText = "Ã˜Â¬Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž...";

// Let's decode it safely
function decodeMojibake(text) {
    let buf = Buffer.alloc(text.length);
    for (let i = 0; i < text.length; i++) {
        buf[i] = text.charCodeAt(i) & 0xFF;
    }
    return buf.toString('utf8');
}

console.log("Decoded:", decodeMojibake(badText));
