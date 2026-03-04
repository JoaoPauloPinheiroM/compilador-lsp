"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lexer_1 = require("../src/core/lexer/lexer");
// Mini harness sem dependências externas
function test(name, fn) {
    try {
        fn();
        console.log('✓', name);
    }
    catch (err) {
        console.error('✗', name);
        console.error(err);
        process.exitCode = 1;
    }
}
const assertEqual = (a, b, msg) => {
    if (!Object.is(a, b))
        throw new Error(msg || `Esperado ${b}, obtido ${a}`);
};
const assertDeepEqual = (a, b, msg) => {
    const aStr = JSON.stringify(a);
    const bStr = JSON.stringify(b);
    if (aStr !== bStr)
        throw new Error(msg || `Esperado ${bStr}, obtido ${aStr}`);
};
test('lexer tokeniza declaração e atribuição simples', () => {
    const code = 'Definir Numero x; x = 5;';
    const { tokens, diagnostics } = new lexer_1.Lexer(code).tokenize();
    assertEqual(diagnostics.length, 0, 'Sem erros léxicos');
    const values = tokens.map(t => t.value);
    assertDeepEqual(values, ['Definir', 'Numero', 'x', ';', 'x', '=', '5', ';', ''], 'Sequência básica de tokens');
});
test('lexer reconhece operadores compostos', () => {
    const code = 'Para(i=0; i<=10; i++) { }';
    const { tokens, diagnostics } = new lexer_1.Lexer(code).tokenize();
    assertEqual(diagnostics.length, 0);
    const ops = tokens.filter(t => t.value === '<=' || t.value === '++').map(t => t.value);
    assertDeepEqual(ops, ['<=', '++'], 'Operadores <= e ++ tokenizados');
});
//# sourceMappingURL=lexer.spec.js.map