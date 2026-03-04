import { Lexer } from '../src/core/lexer/lexer';
import { Parser, Statement, Assignment, BinaryExpr } from '../src/core/parser/parser';

declare const process: any;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log('✓', name);
  } catch (err) {
    console.error('✗', name);
    console.error(err);
    process.exitCode = 1;
  }
}

const assertEqual = (a: any, b: any, msg?: string) => {
  if (!Object.is(a, b)) throw new Error(msg || `Esperado ${b}, obtido ${a}`);
};

const buildAst = (code: string) => {
  const { tokens, diagnostics: lexDiag } = new Lexer(code).tokenize();
  assertEqual(lexDiag.length, 0, 'Sem erros léxicos');
  const parser = new Parser(tokens);
  const { ast, diagnostics } = parser.getAST();
  assertEqual(diagnostics.length, 0, 'Sem erros sintáticos');
  return ast;
};

test('parser cria AST para declaração e atribuição com precedência', () => {
  const ast = buildAst('Definir Numero x; x = 5 + 2 * 3;');

  assertEqual(ast.length, 2);
  const decl = ast[0] as Statement;
  assertEqual(decl.type, 'VarDecl');

  const assignStmt = ast[1] as Statement;
  assertEqual(assignStmt.type, 'ExprStmt');
  const assignment = (assignStmt as any).expression as Assignment;
  assertEqual(assignment.type, 'Assignment');

  const binary = assignment.value as BinaryExpr;
  assertEqual(binary.type, 'Binary');
  assertEqual(binary.operator, '+');
  assertEqual((binary.right as BinaryExpr).operator, '*', 'Multiplicação tem precedência');
});

test('parser reconhece bloco com Se/Senao', () => {
  const ast = buildAst('Se (1 = 1) { Definir Numero a; } Senao Inicio Definir Numero b; Fim;');
  assertEqual(ast.length, 1);
  assertEqual(ast[0].type, 'If');
});