// ==========================================
// TRANSPILER LSP -> JS
// Gera JS simples e inclui um runtime embutido mínimo para nativas/cursor.
// ==========================================

import { funcoesNativas } from '../builtins/funcoesNativas';
import {
  Assignment,
  BinaryExpr,
  BlockStatement,
  CallExpr,
  Expression,
  ExpressionStatement,
  ForStatement,
  FuncDeclaration,
  IdentifierExpr,
  IfStatement,
  LiteralExpr,
  ReturnStatement,
  BreakStatement,
  ContinueStatement,
  Statement,
  UnaryExpr,
  VarDeclaration,
  WhileStatement,
} from '../parser/parser';

export interface TranspileResult {
  code: string;
}

export class Transpiler {
  private readonly ast: Statement[];
  private readonly lines: string[] = [];
  private indentLevel = 0;
  private readonly nativeSet = new Set<string>(Object.keys(funcoesNativas).map((n) => n.toLowerCase()));
  private readonly cursorMethods = new Set<string>(['sql', 'abrircursor', 'fecharcursor', 'achou', 'naoachou', 'proximo', 'eof', 'destruir']);

  constructor(ast: Statement[]) {
    this.ast = ast;
  }

  public transpile(): TranspileResult {
    this.emitRuntimePrelude();

    for (const stmt of this.ast) {
      this.emitStatement(stmt);
    }

    return { code: this.lines.join('\n') };
  }

  // ==========================================
  // Runtime embutido
  // ==========================================
  private emitRuntimePrelude(): void {
    const nativeBodies = Object.keys(funcoesNativas)
      .map((name) => {
        return `    ${name}: (...args) => { /* nativa stub */ return undefined; }`;
      })
      .join(',\n');

    this.lines.push('// Runtime mínimo para nativas e cursores');
    this.lines.push('const __rt = (() => {');
    this.lines.push('  const cursors = {');
    this.lines.push('    create: () => ({ rows: [], index: 0, sql: "" }),');
    this.lines.push('    sql: (c, query) => { c.sql = query; return c; },');
    this.lines.push('    abrircursor: (c) => { c.index = 0; return c.rows.length > 0; },');
    this.lines.push('    fecharcursor: (c) => { c.index = c.rows.length; return true; },');
    this.lines.push('    destruir: (c) => { c.rows = []; c.index = 0; return true; },');
    this.lines.push('    achou: (c) => c.index < c.rows.length,');
    this.lines.push('    naoachou: (c) => !(c.index < c.rows.length),');
    this.lines.push('    proximo: (c) => { c.index++; return c.index < c.rows.length; },');
    this.lines.push('    eof: (c) => c.index >= c.rows.length');
    this.lines.push('  };');
    this.lines.push('  const natives = {');
    this.lines.push(nativeBodies);
    this.lines.push('  };');
    this.lines.push('  return { cursors, natives };');
    this.lines.push('})();');
    this.lines.push('');
  }

  // ==========================================
  // Statements
  // ==========================================
  private emitStatement(stmt: Statement): void {
    switch (stmt.type) {
      case 'Block':
        this.emitBlock(stmt as BlockStatement);
        break;
      case 'VarDecl':
        this.emitVarDecl(stmt as VarDeclaration);
        break;
      case 'ExprStmt':
        this.emitLine(`${this.emitExpression((stmt as ExpressionStatement).expression)};`);
        break;
      case 'If':
        this.emitIf(stmt as IfStatement);
        break;
      case 'While':
        this.emitWhile(stmt as WhileStatement);
        break;
      case 'For':
        this.emitFor(stmt as ForStatement);
        break;
      case 'FuncDecl':
        this.emitFunction(stmt as FuncDeclaration);
        break;
      case 'Usar':
        this.emitLine(`// usar ${JSON.stringify((stmt as any).rules)}`);
        break;
      case 'Regra':
        this.emitLine(`// regra ${(stmt as any).rule}`);
        break;
      case 'Return':
        this.emitReturn(stmt as ReturnStatement);
        break;
      case 'Break':
        this.emitLine('break;');
        break;
      case 'Continue':
        this.emitLine('continue;');
        break;
      default:
        this.emitLine('// TODO: statement não suportado');
    }
  }

  private emitBlock(block: BlockStatement): void {
    this.emitLine('{');
    this.indentLevel++;
    for (const inner of block.statements) {
      this.emitStatement(inner);
    }
    this.indentLevel--;
    this.emitLine('}');
  }

  private emitVarDecl(stmt: VarDeclaration): void {
    const initial = stmt.initializer
      ? this.emitExpression(stmt.initializer)
      : this.defaultValue(stmt.varType);
    this.emitLine(`let ${stmt.identifier} = ${initial};`);
  }

  private emitIf(stmt: IfStatement): void {
    const condition = this.emitExpression(stmt.condition);
    this.emitLine(`if (${condition})`);
    this.emitStatement(stmt.thenBranch);
    if (stmt.elseBranch) {
      this.emitLine('else');
      this.emitStatement(stmt.elseBranch);
    }
  }

  private emitWhile(stmt: WhileStatement): void {
    const condition = this.emitExpression(stmt.condition);
    this.emitLine(`while (${condition})`);
    this.emitStatement(stmt.body);
  }

  private emitFor(stmt: ForStatement): void {
    const init = stmt.initializer ? this.statementToInline(stmt.initializer) : '';
    const cond = stmt.condition ? this.emitExpression(stmt.condition) : '';
    const inc = stmt.increment ? this.emitExpression(stmt.increment) : '';
    this.emitLine(`for (${init}; ${cond}; ${inc})`);
    this.emitStatement(stmt.body);
  }

  private emitFunction(func: FuncDeclaration): void {
    if (!func.isImplementation) {
      this.emitLine(`// declaração de função ${func.name}`);
      return;
    }

    const params = func.params.map((p) => p.name).join(', ');
    this.emitLine(`function ${func.name}(${params}) {`);
    this.indentLevel++;
    if (func.body) {
      for (const inner of func.body.statements) {
        this.emitStatement(inner);
      }
    }
    this.indentLevel--;
    this.emitLine('}');
  }

  private statementToInline(stmt: Statement): string {
    if (stmt.type === 'ExprStmt') {
      return this.emitExpression((stmt as ExpressionStatement).expression);
    }
    if (stmt.type === 'VarDecl') {
      const v = stmt as VarDeclaration;
      const init = v.initializer
        ? this.emitExpression(v.initializer)
        : this.defaultValue(v.varType);
      return `let ${v.identifier} = ${init}`;
    }
    return '';
  }

  // ==========================================
  // Expressions
  // ==========================================
  private emitExpression(expr: Expression): string {
    switch (expr.type) {
      case 'Literal':
        return this.literalValue(expr as LiteralExpr);
      case 'Identifier':
        return (expr as IdentifierExpr).name;
      case 'Assignment': {
        const assign = expr as Assignment;
        return `${assign.identifier} = ${this.emitExpression(assign.value)}`;
      }
      case 'Binary': {
        const bin = expr as BinaryExpr;
        const op = this.mapBinaryOperator(bin.operator);
        return `(${this.emitExpression(bin.left)} ${op} ${this.emitExpression(bin.right)})`;
      }
      case 'Unary': {
        const un = expr as UnaryExpr;
        const op = this.mapUnaryOperator(un.operator);
        return `${op}${this.emitExpression(un.right)}`;
      }
      case 'Call': {
        const call = expr as CallExpr;
        const args = call.args.map((a) => this.emitExpression(a)).join(', ');
        return this.emitCall(call.callee, args);
      }
      default:
        return 'undefined /* expr não suportada */';
    }
  }

  private emitCall(callee: string, argsCode: string): string {
    const lower = callee.toLowerCase();

    if (callee.includes('.')) {
      const lastDot = callee.lastIndexOf('.');
      const recv = callee.substring(0, lastDot);
      const method = callee.substring(lastDot + 1);
      const methodLower = method.toLowerCase();
      if (this.cursorMethods.has(methodLower)) {
        const allArgs = [recv, argsCode].filter(Boolean).join(', ');
        return `__rt.cursors.${methodLower}(${allArgs})`;
      }
      const allArgs = argsCode;
      return `${callee}(${allArgs})`;
    }

    if (this.nativeSet.has(lower)) {
      return `__rt.natives.${callee}(${argsCode})`;
    }

    return `${callee}(${argsCode})`;
  }

  private emitReturn(stmt: ReturnStatement): void {
    if (stmt.value) {
      this.emitLine(`return ${this.emitExpression(stmt.value)};`);
    } else {
      this.emitLine('return;');
    }
  }

  private literalValue(expr: LiteralExpr): string {
    return typeof expr.value === 'string' ? JSON.stringify(expr.value) : String(expr.value);
  }

  private mapBinaryOperator(op: string): string {
    const lower = op.toLowerCase();
    if (op === '=') return '===';
    if (op === '<>') return '!==';
    if (op === '!=') return '!=';
    if (lower === 'e' || lower === 'and') return '&&';
    if (lower === 'ou' || lower === 'or') return '||';
    return op;
  }

  private mapUnaryOperator(op: string): string {
    const lower = op.toLowerCase();
    if (lower === 'nao' || op === '!') return '!';
    return op;
  }

  private defaultValue(type: string): string {
    const lower = type.toLowerCase();
    if (lower === 'numero') return '0';
    if (lower === 'alfa') return '""';
    if (lower === 'cursor') return '__rt.cursors.create()';
    return 'null';
  }

  // ==========================================
  // Helpers
  // ==========================================
  private emitLine(text: string): void {
    const padding = '  '.repeat(this.indentLevel);
    this.lines.push(padding + text);
  }
}
