// ==========================================
// INTERPRETADOR (MÁQUINA VIRTUAL LSP)
// Responsável por executar a Árvore Sintática (AST)
// ==========================================

import { 
    Statement, Expression, BlockStatement, VarDeclaration, FuncDeclaration,
    IfStatement, WhileStatement, ForStatement, Assignment, ExpressionStatement,
    BinaryExpr, UnaryExpr, LiteralExpr, IdentifierExpr, CallExpr, ReturnStatement, BreakStatement, ContinueStatement
} from '../parser/parser';
import { funcoesNativas, NativeCallArg } from '../builtins/funcoesNativas';

class Environment {
    private values = new Map<string, any>();
    constructor(public readonly parent?: Environment) {}

    public define(name: string, value: any): void {
        this.values.set(name.toLowerCase(), value);
    }

    public assign(name: string, value: any): void {
        const key = name.toLowerCase();
        if (this.values.has(key)) {
            this.values.set(key, value);
            return;
        }
        if (this.parent) {
            this.parent.assign(name, value);
            return;
        }
        this.define(name, value);
    }

    public get(name: string): any {
        const key = name.toLowerCase();
        if (this.values.has(key)) {
            return this.values.get(key);
        }
        if (this.parent) {
            return this.parent.get(key);
        }
        return undefined;
    }

    public snapshot(): Map<string, any> {
        return new Map(this.values);
    }
}

export class Interpreter {
    private globals: Environment;
    private environment: Environment;
    private functions = new Map<string, FuncDeclaration>();

    constructor() {
        this.globals = new Environment();
        this.environment = this.globals;
        this.injectSystemVariables();
    }

    /**
     * Inicializa variáveis globais que o ERP da Senior já disponibiliza
     */
    private injectSystemVariables() {
        this.globals.define('datsis', new Date().toLocaleDateString('pt-BR'));
        this.globals.define('horsis', new Date().getHours() * 60 + new Date().getMinutes());
        this.globals.define('empatu', 1);
        this.globals.define('codusu', 999);
        this.globals.define('nomusu', 'Desenvolvedor Local');
    }

    /**
     * Ponto de entrada: Executa a lista de instruções (AST)
     */
    public interpret(statements: Statement[]): void {
        this.registerFunctions(statements);

        for (const statement of statements) {
            if (statement.type === 'FuncDecl') continue; // Implementações já foram registadas
            this.execute(statement);
        }
    }

    /**
     * Imprime o estado final da memória (Útil para testes no terminal)
     */
    public printMemory(): void {
        console.log("\n=== ESTADO FINAL DA MEMÓRIA ===");
        this.globals.snapshot().forEach((value, key) => {
            console.log(`[${key}]:`, value);
        });
        console.log("===============================\n");
    }

    /**
     * Recupera o valor atual de uma variável (útil para testes automatizados).
     */
    public getValue(name: string): any {
        return this.environment.get(name);
    }

    private registerFunctions(statements: Statement[]): void {
        for (const stmt of statements) {
            if (stmt.type === 'FuncDecl') {
                const func = stmt as FuncDeclaration;
                if (func.isImplementation && func.body) {
                    this.functions.set(func.name.toLowerCase(), func);
                }
            } else if (stmt.type === 'Block') {
                this.registerFunctions((stmt as BlockStatement).statements);
            }
        }
    }

    // ==========================================
    // EXECUÇÃO DE INSTRUÇÕES (STATEMENTS)
    // ==========================================
    private execute(stmt: Statement): void {
        switch (stmt.type) {
            case 'Block':
                this.executeBlock((stmt as BlockStatement).statements);
                break;
            case 'VarDecl':
                this.executeVarDecl(stmt as VarDeclaration);
                break;
            case 'ExprStmt':
                this.evaluate((stmt as ExpressionStatement).expression);
                break;
            case 'If':
                this.executeIf(stmt as IfStatement);
                break;
            case 'While':
                this.executeWhile(stmt as WhileStatement);
                break;
            case 'For':
                this.executeFor(stmt as ForStatement);
                break;
            case 'FuncDecl':
                break;
            case 'Return':
                this.executeReturn(stmt as ReturnStatement);
                break;
            case 'Break':
                throw new BreakSignal();
            case 'Continue':
                throw new ContinueSignal();
        }
    }

    private executeBlock(statements: Statement[]): void {
        const previous = this.environment;
        this.environment = new Environment(previous);
        try {
            for (const stmt of statements) {
                this.execute(stmt);
            }
        } finally {
            this.environment = previous;
        }
    }

    private executeVarDecl(stmt: VarDeclaration): void {
        const type = stmt.varType.toLowerCase();
        let defaultValue: any = null;
        
        // Inicialização padrão da linguagem Senior
        if (type === 'numero') defaultValue = 0;
        else if (type === 'alfa') defaultValue = "";
        
        const init = stmt.initializer ? this.evaluate(stmt.initializer) : defaultValue;
        this.environment.define(stmt.identifier, init);
    }

    private executeIf(stmt: IfStatement): void {
        const conditionValue = this.evaluate(stmt.condition);
        
        // Na LSP, números diferentes de zero e booleanos verdadeiros passam no IF
        if (this.isTruthy(conditionValue)) {
            this.execute(stmt.thenBranch);
        } else if (stmt.elseBranch) {
            this.execute(stmt.elseBranch);
        }
    }

    private executeWhile(stmt: WhileStatement): void {
        while (this.isTruthy(this.evaluate(stmt.condition))) {
            try {
                this.execute(stmt.body);
            } catch (signal) {
                if (signal instanceof BreakSignal) break;
                if (signal instanceof ContinueSignal) continue;
                if (signal instanceof ReturnSignal) throw signal;
                throw signal;
            }
        }
    }

    private executeFor(stmt: ForStatement): void {
        if (stmt.initializer) this.execute(stmt.initializer);

        while (stmt.condition ? this.isTruthy(this.evaluate(stmt.condition)) : true) {
            try {
                this.execute(stmt.body);
            } catch (signal) {
                if (signal instanceof BreakSignal) break;
                if (signal instanceof ContinueSignal) {
                    if (stmt.increment) this.evaluate(stmt.increment);
                    continue;
                }
                if (signal instanceof ReturnSignal) throw signal;
                throw signal;
            }
            if (stmt.increment) {
                this.evaluate(stmt.increment);
            }
        }
    }

    // ==========================================
    // AVALIAÇÃO DE EXPRESSÕES (EXPRESSIONS)
    // ==========================================
    private evaluate(expr: Expression): any {
        switch (expr.type) {
            case 'Literal':
                return (expr as LiteralExpr).value;
            case 'Identifier':
                return this.evaluateIdentifier(expr as IdentifierExpr);
            case 'Assignment':
                return this.evaluateAssignment(expr as Assignment);
            case 'Binary':
                return this.evaluateBinary(expr as BinaryExpr);
            case 'Unary':
                return this.evaluateUnary(expr as UnaryExpr);
            case 'Call':
                return this.evaluateCall(expr as CallExpr);
            default:
                return null;
        }
    }

    private executeReturn(stmt: ReturnStatement): void {
        const value = stmt.value ? this.evaluate(stmt.value) : undefined;
        throw new ReturnSignal(value);
    }

    private evaluateIdentifier(expr: IdentifierExpr): any {
        const name = expr.name.toLowerCase();
        const current = this.environment.get(name);
        if (current !== undefined) {
            return current;
        }

        if (name.includes('.')) {
            return `[Valor Fictício do Banco: ${name}]`;
        }

        // Variável implícita (Numero) é criada on-demand
        this.environment.define(name, 0);
        return 0;
    }

    private evaluateAssignment(expr: Assignment): any {
        const value = this.evaluate(expr.value);
        this.environment.assign(expr.identifier, value);
        return value;
    }

    private evaluateBinary(expr: BinaryExpr): any {
        const left = this.evaluate(expr.left);
        const right = this.evaluate(expr.right);
        const op = expr.operator.toLowerCase();

        switch (op) {
            // Matemáticos
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/': 
                if (right === 0) throw new Error("Erro de Execução: Divisão por zero.");
                return left / right;
            
            // Comparação
            case '=': return left === right; // A LSP usa = para igualdade em condições
            case '<>':
            case '!=': return left !== right;
            case '>': return left > right;
            case '>=': return left >= right;
            case '<': return left < right;
            case '<=': return left <= right;

            // Lógicos
            case 'e':
            case 'and': return this.isTruthy(left) && this.isTruthy(right);
            case 'ou':
            case 'or': return this.isTruthy(left) || this.isTruthy(right);
        }

        return null;
    }

    private evaluateUnary(expr: UnaryExpr): any {
        const right = this.evaluate(expr.right);
        const op = expr.operator;
        if (op === '-') return -right;
        if (op === '+') return +right;
        if (op === '!' || op.toLowerCase() === 'nao') return !this.isTruthy(right);
        return right;
    }

    private evaluateCall(expr: CallExpr): any {
        const funcName = expr.callee.toLowerCase();

        const nativeKey = Object.keys(funcoesNativas).find(k => k.toLowerCase() === funcName);
        if (nativeKey) {
            const native = funcoesNativas[nativeKey];
            const callArgs: NativeCallArg[] = [];

            native.parametros.forEach((param, idx) => {
                const argExpr = expr.args[idx];
                const ref = param.byRef ? this.toRef(argExpr) : undefined;
                if (param.byRef && !ref) {
                    throw new Error(`Parâmetro '${param.nome}' deve ser uma variável passada por referência.`);
                }
                callArgs.push({ value: this.evaluate(argExpr), ref });
            });

            return native.execute(callArgs);
        }

        if (this.functions.has(funcName)) {
            const decl = this.functions.get(funcName)!;
            const callerEnv = this.environment;
            const refs: { paramName: string; ref: { get(): any; set: (v: any) => void } }[] = [];
            const argValues: any[] = [];

            decl.params.forEach((param, idx) => {
                const argExpr = expr.args[idx];
                const value = this.evaluate(argExpr);
                argValues.push(value);
                if (param.byRef) {
                    const ref = this.toRef(argExpr);
                    if (!ref) {
                        throw new Error(`Parâmetro '${param.name}' deve ser variável (passagem por referência).`);
                    }
                    refs.push({ paramName: param.name.toLowerCase(), ref });
                }
            });

            const localEnv = new Environment(callerEnv);
            const previousEnv = this.environment;
            this.environment = localEnv;

            decl.params.forEach((param, idx) => {
                localEnv.define(param.name, argValues[idx]);
            });

            let result: any = undefined;
            try {
                if (decl.body) {
                    this.executeBlock(decl.body.statements);
                }
                result = localEnv.get('valret');
            } finally {
                refs.forEach(binding => {
                    const updated = this.environment.get(binding.paramName);
                    binding.ref.set(updated);
                });
                this.environment = previousEnv;
            }

            return result;
        }

        console.log(`⚡ [CHAMADA DE FUNÇÃO SIMULADA]: ${expr.callee}`);
        return null; 
    }

    // ==========================================
    // UTILITÁRIOS
    // ==========================================
    private isTruthy(value: any): boolean {
        if (value === null || value === undefined) return false;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') return value.trim() !== "";
        return true;
    }

    private toRef(expr: Expression): { get(): any; set: (value: any) => void } | undefined {
        if (expr.type === 'Identifier') {
            const name = (expr as IdentifierExpr).name;
            // Garante que a variável existe (implícito Numero)
            if (this.environment.get(name) === undefined) {
                this.environment.define(name, 0);
            }
            return {
                get: () => this.environment.get(name),
                set: (value: any) => this.environment.assign(name, value)
            };
        }
        return undefined;
    }
}

class ReturnSignal {
    constructor(public readonly value: any) {}
}

class BreakSignal {}

class ContinueSignal {}