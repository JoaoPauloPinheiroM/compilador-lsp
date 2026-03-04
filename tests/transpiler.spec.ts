import * as assert from 'assert';
import { Lexer } from '../src/core/lexer/lexer';
import { Parser } from '../src/core/parser/parser';
import { SemanticAnalyzer } from '../src/core/analyzer/analyzer';
import { Transpiler } from '../src/core/transpiler/transpiler';

// Smoke test: transpiler gera JS contendo runtime e código para uma atribuição simples
(() => {
  const source = `
    var x numero
    x = 1
  `;

  const lexer = new Lexer(source);
  const { tokens } = lexer.tokenize();
  const parser = new Parser(tokens);
  const { ast } = parser.getAST();

  // Rodamos o analisador para garantir que a AST está consistente
  const analyzer = new SemanticAnalyzer(ast);
  const diags = analyzer.analyze();
  assert.strictEqual(diags.length, 0, 'Sem diagnósticos esperados');

  const transpiler = new Transpiler(ast);
  const { code } = transpiler.transpile();

  assert.ok(code.includes('__rt'), 'Runtime embutido deve ser emitido');
  assert.ok(code.length > 0, 'Código gerado não deve ser vazio');

  console.log('✓ transpiler gera JS básico com runtime');
})();
