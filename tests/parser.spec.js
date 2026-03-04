"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lexer_1 = require("../src/core/lexer/lexer");
const parser_1 = require("../src/core/parser/parser");
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
const buildAst = (code) => {
    const { tokens, diagnostics: lexDiag } = new lexer_1.Lexer(code).tokenize();
    assertEqual(lexDiag.length, 0, 'Sem erros léxicos');
    const parser = new parser_1.Parser(tokens);
    const { ast, diagnostics } = parser.getAST();
    assertEqual(diagnostics.length, 0, 'Sem erros sintáticos');
    return ast;
};
test('parser cria AST para declaração e atribuição com precedência', () => {
    const ast = buildAst('Definir Numero x; x = 5 + 2 * 3;');
    assertEqual(ast.length, 2);
    const decl = ast[0];
    assertEqual(decl.type, 'VarDecl');
    const assignStmt = ast[1];
    assertEqual(assignStmt.type, 'ExprStmt');
    const assignment = assignStmt.expression;
    assertEqual(assignment.type, 'Assignment');
    const binary = assignment.value;
    assertEqual(binary.type, 'Binary');
    assertEqual(binary.operator, '+');
    assertEqual(binary.right.operator, '*', 'Multiplicação tem precedência');
});
test('parser reconhece bloco com Se/Senao', () => {
    const ast = buildAst('Se (1 = 1) { Definir Numero a; } Senao Inicio Definir Numero b; Fim;');
    assertEqual(ast.length, 1);
    assertEqual(ast[0].type, 'If');
});
//# sourceMappingURL=parser.spec.js.map