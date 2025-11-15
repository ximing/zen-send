import { ExternalTokenizer } from '@lezer/lr'
import { NoteContent } from "./parser.terms.js"
import { LANGUAGE_TOKENS } from '../languages.js';

const EOF = -1;

const FIRST_TOKEN_CHAR = "\n".charCodeAt(0)
const SECOND_TOKEN_CHAR = "∞".charCodeAt(0)

const languageTokensMatcher = LANGUAGE_TOKENS.join("|")
const tokenRegEx = new RegExp(
    `^\\n∞∞∞(${languageTokensMatcher})(-a)?(?:;[^∞\\n]+)*\\n`
)

const HEADER_MAX_LOOKAHEAD = 256

export const noteContent = new ExternalTokenizer((input) => {
    let current = input.peek(0);
    let next = input.peek(1);

    if (current === EOF) {
        return;
    }

    while (true) {
        if (current === FIRST_TOKEN_CHAR && next === SECOND_TOKEN_CHAR) {
            let potentialHeader = "";
            let i = 0;

            while (i < HEADER_MAX_LOOKAHEAD) {
                const ch = input.peek(i);
                if (ch === EOF) break;

                potentialHeader += String.fromCharCode(ch);

                if (i > 0 && ch === FIRST_TOKEN_CHAR) {
                    break;
                }

                i++;
            }

            if (potentialHeader.match(tokenRegEx)) {
                input.acceptToken(NoteContent);
                return;
            }
        }

        if (next === EOF) {
            input.acceptToken(NoteContent, 1);
            return;
        }

        current = input.advance(1);
        next = input.peek(1);
    }
});
