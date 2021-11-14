export function getTokenParser(tokenText) {
  if (!tokenText) return () => undefined;
  const tokenPattern = /{([^{}]+)}/g;

  // We break tokenText into pieces that are either plain text or tokens,
  // then construct an array of functions to parse each piece
  const tokenFuncs = [];
  let charIndex  = 0;
  while (charIndex < tokenText.length) {
    // Find the next token
    const result = tokenPattern.exec(tokenText);

    if (!result) {
      // No tokens left. Parse the plain text after the last token
      const str = tokenText.substring(charIndex);
      tokenFuncs.push(() => str);
      break;
    } else if (result.index > charIndex) {
      // There is some plain text before the token
      const str = tokenText.substring(charIndex, result.index);
      tokenFuncs.push(() => str);
    }

    // Add a function to process the current token
    const token = result[1];
    tokenFuncs.push(props => props[token]);
    charIndex = tokenPattern.lastIndex;
  }

  // We now have an array of functions returning either a text string or
  // a feature property
  // Return a function that assembles everything
  return function(properties) {
    return tokenFuncs.reduce(concat, "");
    function concat(str, tokenFunc) {
      const text = tokenFunc(properties) || "";
      return str += text;
    }
  };
}
