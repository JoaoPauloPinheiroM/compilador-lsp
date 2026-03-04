# LSP Senior Pro

Compilador, interpretador e extensão VS Code para a Linguagem Senior de Programação (LSP).

## Autoria
- Autor: João Paulo Pinheiro Mourão
- Data: 02/03/2026 — Cascavel, PR

## Badges
- [![VS Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/PMSystem.lsp-senior)](https://marketplace.visualstudio.com/items?itemName=PMSystem.lsp-senior)

## Capacidades do projeto
- **Lexer**: tokenização de LSP com suporte a comentários, operadores compostos e palavras-chave.
- **Parser (AST)**: construção de AST com blocos, funções, chamadas, cursores e expressões.
- **Analisador Semântico**: escopos, variáveis de sistema, verificação de tipos (com tolerância Numero/Data), by-ref, funções nativas, avisos de cursor e retornos.
- **Interpretador**: execução da AST em memória.
- **Transpiler LSP → JS**: gera JS simples com runtime embutido para nativas e cursores.
- **CLI**: compila, transpila e (opcionalmente) executa regras LSP.
- **Extensão VS Code**: diagnósticos, completion, hover, assinatura, definição e formatação básica.
- **Testes**: suíte em TS/JS para lexer, parser, interpretador e transpiler.

## Estrutura
- `src/core/lexer` — lexer
- `src/core/parser` — parser (AST)
- `src/core/analyzer` — semântica
- `src/core/interpreter` — interpretador
- `src/core/transpiler` — transpile para JS + runtime
- `src/core/builtins/funcoesNativas.ts` — catálogo de nativas (stubs + algumas implementadas)
- `src/cli/index.ts` — interface de linha de comando
- `src/extension` — extensão VS Code (DocumentManager + providers)
- `tests/` — specs TS/JS

## Como usar (CLI)
1. Instale dependências: `npm install`
2. Compile TypeScript: `npm run compile`
3. Transpilar sem executar:
   ```
   node out/cli/index.js caminho/arquivo.lsp --out caminho/saida.js --no-run
   ```
4. Transpilar e executar:
   ```
   node out/cli/index.js caminho/arquivo.lsp --out caminho/saida.js
   ```

## Extensão VS Code
- `npm run compile`
- F5 (Run Extension) abre uma janela de desenvolvimento com a linguagem LSP registrada.
- Recursos: diagnósticos em tempo real, autocompletar (keywords, variáveis, nativas, métodos de cursor), hover, definição, assinatura e formatter simples.

## Transpiler e runtime
- Gera JS com preâmbulo `__rt` contendo:
  - `cursors`: create/sql/abrircursor/fecharcursor/achou/naoachou/proximo/eof/destruir (em memória)
  - `natives`: stubs para cada função declarada em `funcoesNativas`
- Mapeamento:
  - Nativas → `__rt.natives.Nome(args)`
  - Métodos de cursor (`Cur.Sql`, `Cur.AbrirCursor`, etc.) → `__rt.cursors.metodo(recv, args)`
  - Demais chamadas → `nome(args)`
- Defaults: Numero → 0, Alfa → "", Cursor → `__rt.cursors.create()`, outros → null.

## Testes
- Rodar toda a suíte:
  ```
  npm test
  ```

## Empacotar para VS Code Marketplace
- `npm run compile`
- `npm run package` (gera `.vsix` via `vsce`)

## Observações atuais
- Nativas de banco/relatório estão como stubs; implemente em `funcoesNativas` se precisar de efeito real.
- Transpiler gera JS ingênuo (sem otimizações) e o runtime de cursor é em memória.

## Licença
MIT — veja [LICENSE.md](LICENSE.md).
