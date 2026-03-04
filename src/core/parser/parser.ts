// ==========================================
// PARSER DO COMPILADOR LSP (AST Builder)
// Totalmente independente do VS Code.
// ==========================================

import { Token, TokenType } from '../lexer/lexer';
import { CompilerDiagnostic, DiagnosticSeverity, TextRange } from '../diagnostics/compilerDiagnostic';

// ==========================================
// ESTRUTURAS DA ÁRVORE SINTÁTICA (AST)
// Tipagem Refatorada para Discriminated Unions
// ==========================================
export interface BaseNode {
    type: string;
    token: Token;
}

export type Statement =
    | BlockStatement
    | VarDeclaration
    | FuncDeclaration
    | IfStatement
    | WhileStatement
    | ForStatement
    | ExpressionStatement
    | UsarStatement
    | RegraStatement
    | ReturnStatement
    | BreakStatement
    | ContinueStatement;

export type Expression =
    | Assignment
    | BinaryExpr
    | UnaryExpr
    | LiteralExpr
    | IdentifierExpr
    | CallExpr;

export type ASTNode = Statement | Expression;

// Nós de Declaração/Instrução (Statements)
export interface BlockStatement extends BaseNode { type: 'Block'; statements: Statement[]; }
export interface VarDeclaration extends BaseNode { type: 'VarDecl'; varType: string; identifier: string; initializer?: Expression; }
export interface ParamDeclaration { name: string; byRef: boolean; varType?: string; token: Token; }
export interface FuncDeclaration extends BaseNode { type: 'FuncDecl'; name: string; params: ParamDeclaration[]; body?: BlockStatement; isImplementation: boolean; }
export interface IfStatement extends BaseNode { type: 'If'; condition: Expression; thenBranch: Statement; elseBranch?: Statement; }
export interface WhileStatement extends BaseNode { type: 'While'; condition: Expression; body: Statement; }
export interface ForStatement extends BaseNode { type: 'For'; initializer?: Statement | null; condition?: Expression | null; increment?: Expression | null; body: Statement; }
export interface ExpressionStatement extends BaseNode { type: 'ExprStmt'; expression: Expression; }
export interface UsarStatement extends BaseNode { type: 'Usar'; rules: number[]; }
export interface RegraStatement extends BaseNode { type: 'Regra'; rule: number; }
export interface ReturnStatement extends BaseNode { type: 'Return'; value?: Expression; }
export interface BreakStatement extends BaseNode { type: 'Break'; }
export interface ContinueStatement extends BaseNode { type: 'Continue'; }

// Nós de Expressão Matemática/Lógica (Expressions)
export interface Assignment extends BaseNode { type: 'Assignment'; identifier: string; value: Expression; }
export interface BinaryExpr extends BaseNode { type: 'Binary'; left: Expression; operator: string; right: Expression; }
export interface UnaryExpr extends BaseNode { type: 'Unary'; operator: string; right: Expression; }
export interface LiteralExpr extends BaseNode { type: 'Literal'; value: string | number; }
export interface IdentifierExpr extends BaseNode { type: 'Identifier'; name: string; }
export interface CallExpr extends BaseNode { type: 'Call'; callee: string; args: Expression[]; }

// ==========================================
// CLASSE PRINCIPAL DO PARSER (Recursive Descent)
// ==========================================
export class Parser {
    private tokens: Token[];
    private current: number = 0;
    private diagnostics: CompilerDiagnostic[] = [];

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    /**
     * Opcional: Para manter compatibilidade com sistemas antigos que
     * só chamam parse() para verificar erros.
     */
    public parse(): CompilerDiagnostic[] {
        while (!this.isAtEnd()) {
            try {
                this.declaration();
            } catch (error) {
                this.synchronize();
            }
        }
        return this.diagnostics;
    }

    /**
     * Devolve a AST e os erros de sintaxe encontrados.
     */
    public getAST(): { ast: Statement[], diagnostics: CompilerDiagnostic[] } {
        this.current = 0;
        this.diagnostics = [];
        const ast: Statement[] = [];
        
        while (!this.isAtEnd()) {
            try {
                const stmt = this.declaration();
                if (stmt) ast.push(stmt);
            } catch (error) {
                this.synchronize();
            }
        }
        
        return { ast, diagnostics: this.diagnostics };
    }

    // --- REGRAS DE GRAMÁTICA (AST Builder) ---

    private declaration(): Statement | null {
        if (this.match(TokenType.Keyword, 'definir')) {
            if (this.match(TokenType.Keyword, 'funcao')) {
                return this.functionDeclaration();
            }
            return this.varDeclaration();
        }
        
        if (this.match(TokenType.Keyword, 'funcao')) {
            return this.functionImplementation();
        }

        return this.statement();
    }

    private varDeclaration(): VarDeclaration {
        const keywordToken = this.previous();
        
        if (!this.match(TokenType.Type)) {
            this.error(this.peek(), "Esperado um tipo ('Numero', 'Alfa', 'Data', etc) após 'Definir'.");
        }
        const typeToken = this.previous();

        if (!this.match(TokenType.Identifier)) {
            this.error(this.peek(), `Esperado nome da variável após o tipo '${typeToken.value}'.`);
        }
        const idToken = this.previous();

        let initializer: Expression | undefined;
        if (this.match(TokenType.Symbol, '=')) {
            initializer = this.expression();
        }

        this.consume(TokenType.Symbol, ';', "Esperado ';' após a declaração da variável.");

        return { type: 'VarDecl', token: keywordToken, varType: typeToken.value, identifier: idToken.value, initializer };
    }

    private functionDeclaration(): FuncDeclaration {
        const keywordToken = this.previous();
        const nameToken = this.consume(TokenType.Identifier, "", "Esperado o nome da função após 'Definir Funcao'.");

        const params = this.parseParameters();
        this.consume(TokenType.Symbol, ';', "Esperado ';' no final da declaração da função.");

        return { type: 'FuncDecl', token: keywordToken, name: nameToken.value, params, isImplementation: false };
    }

    private functionImplementation(): FuncDeclaration {
        const keywordToken = this.previous();
        const nameToken = this.consume(TokenType.Identifier, "", "Esperado o nome da função.");
        
        const params = this.parseParameters();

        // Algumas regras têm um ';' logo após a assinatura (ex.: Funcao X(); Inicio...)
        this.match(TokenType.Symbol, ';');
        
        let body: BlockStatement | undefined;
        if (this.match(TokenType.Keyword, 'inicio') || this.match(TokenType.Symbol, '{')) {
            body = this.block();
        } else {
            this.error(this.peek(), "Esperado bloco 'Inicio' ou '{' para implementação da função.");
        }

        return { type: 'FuncDecl', token: keywordToken, name: nameToken.value, params, body, isImplementation: true };
    }

    private parseParameters(): ParamDeclaration[] {
        const params: ParamDeclaration[] = [];
        this.consume(TokenType.Symbol, '(', "Esperado '(' após o nome da função.");

        while (!this.check(TokenType.Symbol, ')') && !this.isAtEnd()) {
            let varType: string | undefined = undefined;
            if (this.check(TokenType.Type)) {
                varType = this.advance().value;
            }

            let byRef = false;
            if (this.match(TokenType.Keyword, 'end')) {
                byRef = true;
            }

            const idToken = this.consume(TokenType.Identifier, "", "Esperado nome do parâmetro.");
            params.push({ name: idToken.value, byRef, varType, token: idToken });

            if (!this.match(TokenType.Symbol, ',')) break;
        }

        this.consume(TokenType.Symbol, ')', "Esperado ')' fechando os parâmetros da função.");
        return params;
    }

    private statement(): Statement {
        if (this.match(TokenType.Keyword, 'se')) return this.ifStatement();
        if (this.match(TokenType.Keyword, 'enquanto')) return this.whileStatement();
        if (this.match(TokenType.Keyword, 'para')) return this.forStatement();
        if (this.match(TokenType.Keyword, 'usar')) return this.usarStatement();
        if (this.match(TokenType.Keyword, 'regra')) return this.regraStatement();
        if (this.match(TokenType.Keyword, 'retorna')) return this.returnStatement();
        if (this.match(TokenType.Keyword, 'pare')) return this.breakStatement();
        if (this.match(TokenType.Keyword, 'continue')) return this.continueStatement();
        
        if (this.match(TokenType.Keyword, 'inicio') || this.match(TokenType.Symbol, '{')) {
            return this.block();
        }
        
        return this.expressionStatement();
    }

    private block(): BlockStatement {
        const startToken = this.previous();
        const isBrace = startToken.value === '{';
        const statements: Statement[] = [];

        while (!this.check(TokenType.Keyword, 'fim') && !this.check(TokenType.Symbol, '}') && !this.isAtEnd()) {
            const decl = this.declaration();
            if (decl) statements.push(decl);
        }

        if (isBrace) {
            this.consume(TokenType.Symbol, '}', "Bloco aberto com '{' deve ser fechado com '}'.");
        } else {
            this.consume(TokenType.Keyword, 'fim', "Bloco 'Inicio' deve ser fechado com 'Fim'.");
            this.match(TokenType.Symbol, ';'); 
        }

        return { type: 'Block', token: startToken, statements };
    }

    private ifStatement(): IfStatement {
        const token = this.previous();
        this.consume(TokenType.Symbol, '(', "Esperado '(' após 'Se'.");
        const condition = this.expression();
        this.consume(TokenType.Symbol, ')', "Esperado ')' após a condição do 'Se'.");

        const thenBranch = this.statement();
        let elseBranch: Statement | undefined = undefined;

        if (this.match(TokenType.Keyword, 'senao')) {
            elseBranch = this.statement();
        }

        return { type: 'If', token, condition, thenBranch, elseBranch };
    }

    private whileStatement(): WhileStatement {
        const token = this.previous();
        this.consume(TokenType.Symbol, '(', "Esperado '(' após 'Enquanto'.");
        const condition = this.expression();
        this.consume(TokenType.Symbol, ')', "Esperado ')' após a condição do 'Enquanto'.");

        const body = this.statement();

        return { type: 'While', token, condition, body };
    }

    private forStatement(): ForStatement {
        const token = this.previous();
        this.consume(TokenType.Symbol, '(', "Esperado '(' após 'Para'.");

        let initializer: Statement | null = null;
        if (!this.check(TokenType.Symbol, ';')) {
            if (this.match(TokenType.Keyword, 'definir')) {
                initializer = this.varDeclaration();
            } else {
                initializer = this.expressionStatement();
            }
        } else {
            this.advance(); // consome ';'
        }

        let condition: Expression | null = null;
        if (!this.check(TokenType.Symbol, ';')) {
            condition = this.expression();
        }
        this.consume(TokenType.Symbol, ';', "Esperado ';' após a condição do 'Para'.");

        let increment: Expression | null = null;
        if (!this.check(TokenType.Symbol, ')')) {
            increment = this.expression();
        }
        this.consume(TokenType.Symbol, ')', "Esperado ')' fechando a instrução 'Para'.");

        const body = this.statement();

        return { type: 'For', token, initializer, condition, increment, body };
    }

    private returnStatement(): ReturnStatement {
        const token = this.previous();
        let value: Expression | undefined = undefined;
        if (!this.check(TokenType.Symbol, ';')) {
            value = this.expression();
        }
        this.consume(TokenType.Symbol, ';', "Esperado ';' após 'Retorna'.");
        return { type: 'Return', token, value };
    }

    private breakStatement(): BreakStatement {
        const token = this.previous();
        this.consume(TokenType.Symbol, ';', "Esperado ';' após 'Pare'.");
        return { type: 'Break', token };
    }

    private continueStatement(): ContinueStatement {
        const token = this.previous();
        this.consume(TokenType.Symbol, ';', "Esperado ';' após 'Continue'.");
        return { type: 'Continue', token };
    }

    private usarStatement(): UsarStatement {
        const token = this.previous();
        const rules: number[] = [];

        do {
            const num = this.consume(TokenType.Number, "", "Esperado o número da regra após 'Usar' ou vírgula.");
            rules.push(parseFloat(num.value));
        } while (this.match(TokenType.Symbol, ','));

        this.consume(TokenType.Symbol, ';', "Esperado ';' no final do comando 'Usar'.");
        return { type: 'Usar', token, rules };
    }

    private regraStatement(): RegraStatement {
        const token = this.previous();
        const num = this.consume(TokenType.Number, "", "Esperado o número da regra após o comando 'Regra'.");
        this.consume(TokenType.Symbol, ';', "Esperado ';' no final do comando 'Regra'.");
        return { type: 'Regra', token, rule: parseFloat(num.value) };
    }

    private expressionStatement(): Statement {
        const expr = this.expression();
        this.consume(TokenType.Symbol, ';', "Esperado ';' ao final do comando.");
        return { type: 'ExprStmt', token: expr.token, expression: expr };
    }

    private expression(): Expression {
        return this.assignment();
    }

    private logicalOr(): Expression {
        let expr = this.logicalAnd();
        while (this.match(TokenType.Symbol, 'ou') || this.match(TokenType.Symbol, 'or')) {
            const operator = this.previous().value;
            const right = this.logicalAnd();
            expr = { type: 'Binary', token: expr.token, left: expr, operator, right };
        }
        return expr;
    }

    private logicalAnd(): Expression {
        let expr = this.equality();
        while (this.match(TokenType.Symbol, 'e') || this.match(TokenType.Symbol, 'and')) {
            const operator = this.previous().value;
            const right = this.equality();
            expr = { type: 'Binary', token: expr.token, left: expr, operator, right };
        }
        return expr;
    }

    private assignment(): Expression {
        // Heurística: se o próximo padrão for Identificador (=) tratamos como atribuição
        const start = this.current;
        if (this.check(TokenType.Identifier)) {
            let idToken = this.advance();
            let identifier = idToken.value;

            if (this.match(TokenType.Symbol, '.')) {
                if (this.match(TokenType.Identifier)) {
                    identifier = `${identifier}.${this.previous().value}`;
                } else {
                    this.error(this.peek(), "Esperado nome da propriedade após o ponto (.).");
                }
            }

            if (this.match(TokenType.Symbol, '=')) {
                const equals = this.previous();
                const value = this.assignment();
                return { type: 'Assignment', token: equals, identifier, value };
            }
            // Não era atribuição; volta o cursor e segue fluxo normal
            this.current = start;
        }

        return this.logicalOr();
    }

    private equality(): Expression {
        let expr = this.comparison();

        while (this.match(TokenType.Symbol, '=') || this.match(TokenType.Symbol, '<>') || this.match(TokenType.Symbol, '!=')) {
            const operator = this.previous().value;
            const right = this.comparison();
            expr = { type: 'Binary', token: expr.token, left: expr, operator, right };
        }

        return expr;
    }

    private comparison(): Expression {
        let expr = this.term();

        while (this.match(TokenType.Symbol, '>') || this.match(TokenType.Symbol, '>=') || this.match(TokenType.Symbol, '<') || this.match(TokenType.Symbol, '<=')) {
            const operator = this.previous().value;
            const right = this.term();
            expr = { type: 'Binary', token: expr.token, left: expr, operator, right };
        }

        return expr;
    }

    private term(): Expression {
        let expr = this.factor();

        while (this.match(TokenType.Symbol, '+') || this.match(TokenType.Symbol, '-')) {
            const operator = this.previous().value;
            const right = this.factor();
            expr = { type: 'Binary', token: expr.token, left: expr, operator, right };
        }

        return expr;
    }

    private factor(): Expression {
        let expr = this.unary();

        while (this.match(TokenType.Symbol, '*') || this.match(TokenType.Symbol, '/')) {
            const operator = this.previous().value;
            const right = this.unary();
            expr = { type: 'Binary', token: expr.token, left: expr, operator, right };
        }

        return expr;
    }

    private unary(): Expression {
        if (this.match(TokenType.Symbol, '-') || this.match(TokenType.Symbol, '+') || this.match(TokenType.Symbol, '!') || this.match(TokenType.Symbol, 'nao')) {
            const operator = this.previous().value;
            const right = this.unary();
            return { type: 'Unary', token: this.previous(), operator, right };
        }
        return this.primary();
    }

    private primary(): Expression {
        if (this.match(TokenType.Number)) {
            return { type: 'Literal', token: this.previous(), value: parseFloat(this.previous().value) };
        }
        if (this.match(TokenType.String)) {
            return { type: 'Literal', token: this.previous(), value: this.previous().value };
        }
        if (this.match(TokenType.Keyword, 'retorna')) {
            const tok = this.previous();
            return { type: 'Literal', token: tok, value: 'Retorna' };
        }
        if (this.match(TokenType.Identifier)) {
            let id = this.previous();
            
            if (this.match(TokenType.Symbol, '.')) {
                if (this.match(TokenType.Identifier)) {
                    id = { ...id, value: id.value + '.' + this.previous().value };
                } else {
                    this.error(this.peek(), "Esperado nome da propriedade após o ponto (.).");
                }
            }
            
            // Chamada de função
            if (this.match(TokenType.Symbol, '(')) {
                const args: Expression[] = [];
                if (!this.check(TokenType.Symbol, ')')) {
                    do {
                        args.push(this.expression());
                    } while (this.match(TokenType.Symbol, ','));
                }
                this.consume(TokenType.Symbol, ')', "Esperado ')' fechando os argumentos da função.");
                return { type: 'Call', token: id, callee: id.value, args };
            }

            // Chamada implícita estilo cursor: Cur.SQL "SELECT ..."
            if (this.check(TokenType.String) || this.check(TokenType.Number)) {
                const lit = this.advance();
                const arg: LiteralExpr = {
                    type: 'Literal',
                    token: lit,
                    value: lit.type === TokenType.Number ? parseFloat(lit.value) : lit.value
                };
                return { type: 'Call', token: id, callee: id.value, args: [arg] };
            }

            // Pós-incremento/decremento (i++ / i--)
            if (this.match(TokenType.Symbol, '++') || this.match(TokenType.Symbol, '--')) {
                const opToken = this.previous();
                const operator = opToken.value === '++' ? '+' : '-';
                const oneLiteral: LiteralExpr = { type: 'Literal', token: opToken, value: 1 };
                const idExpr: IdentifierExpr = { type: 'Identifier', token: id, name: id.value };
                return { type: 'Assignment', token: opToken, identifier: id.value, value: { type: 'Binary', token: opToken, left: idExpr, operator, right: oneLiteral } };
            }
            
            return { type: 'Identifier', token: id, name: id.value };
        }

        if (this.match(TokenType.Symbol, '(')) {
            const expr = this.expression();
            this.consume(TokenType.Symbol, ')', "Esperado ')' após a expressão matemática.");
            return expr;
        }

        if (this.match(TokenType.Type)) {
            throw this.error(this.previous(), `A palavra '${this.previous().value}' é um tipo reservado e não pode ser usada aqui.`);
        }

        throw this.error(this.peek(), `Sintaxe inválida ou símbolo inesperado: '${this.peek().value}'`);
    }

    // --- FUNÇÕES DE NAVEGAÇÃO DOS TOKENS ---

    private match(type: TokenType, value?: string): boolean {
        if (this.check(type, value)) {
            this.advance();
            return true;
        }
        return false;
    }

    private check(type: TokenType, value?: string): boolean {
        if (this.isAtEnd()) return false;
        const token = this.peek();
        if (token.type !== type) return false;
        if (value && token.value.toLowerCase() !== value.toLowerCase()) return false;
        return true;
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    private peek(): Token {
        return this.tokens[this.current];
    }

    private previous(): Token {
        return this.tokens[this.current - 1];
    }

    private consume(type: TokenType, value: string, message: string): Token {
        if (this.check(type, value)) return this.advance();
        throw this.error(this.peek(), message);
    }

    private error(token: Token, message: string): Error {
        // Evita reportar múltiplos erros na mesma linha para não inundar o console
        const alreadyHasErrorHere = this.diagnostics.some(d => d.range.startLine === token.line);
        
        if (!alreadyHasErrorHere) {
            const range: TextRange = {
                startLine: token.line,
                startColumn: token.column,
                endLine: token.line,
                endColumn: token.column + Math.max(1, token.value.length)
            };
            this.diagnostics.push(new CompilerDiagnostic(range, `[Erro de Sintaxe]: ${message}`, DiagnosticSeverity.Error));
        }
        return new Error(message);
    }

    private synchronize(): void {
        this.advance();

        while (!this.isAtEnd()) {
            if (this.previous().value === ';') return;

            switch (this.peek().value.toLowerCase()) {
                case 'se':
                case 'para':
                case 'enquanto':
                case 'definir':
                case 'inicio':
                case 'funcao':
                    return;
            }

            this.advance();
        }
    }
}