import { Lexer } from '../src/core/lexer/lexer';
import { Parser } from '../src/core/parser/parser';
import { Interpreter } from '../src/core/interpreter/interpreter';

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

const runCode = (code: string): Interpreter => {
  const { tokens, diagnostics: lexDiag } = new Lexer(code).tokenize();
  assertEqual(lexDiag.length, 0, 'Sem erros léxicos');

  const parser = new Parser(tokens);
  const { ast, diagnostics } = parser.getAST();
  assertEqual(diagnostics.length, 0, 'Sem erros sintáticos');

  const interpreter = new Interpreter();
  interpreter.interpret(ast);
  return interpreter;
};

test('Exemplo A: Se/Senao com mensagem', () => {
  const code = `
    Definir Numero x;
    Definir Alfa msg;
    x = 50;
    Se (x > 10) {
        msg = "O valor é alto";
        Mensagem("Retorna", msg);
    } Senao Inicio
        msg = "O valor é baixo";
        Mensagem("Erro", msg);
    Fim;
  `;

  const interpreter = runCode(code);
  assertEqual(interpreter.getValue('msg'), 'O valor é alto');
});

test('Exemplo B: IntParaAlfa com passagem por referência', () => {
  const code = `
    Definir Numero vCod;
    Definir Alfa vCodTexto;
    vCod = 123;
    IntParaAlfa(vCod, vCodTexto);
    Mensagem("Retorna", vCodTexto);
  `;

  const interpreter = runCode(code);
  assertEqual(interpreter.getValue('vcodtexto'), '123');
});

test('Exemplo C: Para com soma acumulada', () => {
  const code = `
    Definir Numero i;
    Definir Numero total;
    total = 0;
    Para (i = 1; i <= 10; i++) {
        total = total + i;
    }
  `;

  const interpreter = runCode(code);
  assertEqual(interpreter.getValue('total'), 55);
});