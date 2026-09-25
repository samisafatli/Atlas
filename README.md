# Atlas

Aplicativo financeiro pessoal local-first com transações manuais, importação
Nubank CSV, categorias e regras, dashboard mensal, identificação de recorrências,
histórico patrimonial e backup/restauração em JSON.

O saldo calculado no dashboard soma receitas menos despesas registradas até o
fim do mês selecionado. Não representa saldo bancário conciliado: não inclui
saldo inicial, contas patrimoniais ou transações que ainda não foram cadastradas.

## Requisitos

- Node.js 22.18+ ou 24+
- npm

## Começar

```bash
npm install
npm run db:setup
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Comandos úteis

```bash
npm run lint
npm run typecheck
npm test
npm run format
npm run build
npm run db:seed
```

`npm test` aplica as migrations em um SQLite temporário e verifica CRUD,
importação/reimportação (incluindo hashes antigos), regras, snapshots,
recorrências e exportação/restauração com histórico de importações. O banco
de uso diário não é alterado. Os testes substituem apenas o contexto de
redirect/cache do Next.js; a persistência usa o Prisma e o SQLite reais.

## Tecnologias

- Next.js com App Router
- TypeScript
- Tailwind CSS
- ESLint e Prettier
- Prisma ORM com SQLite

## Estrutura

```text
src/
  app/        Rotas, layout e estilos globais
  lib/        Acesso server-side ao banco
prisma/
  migrations/ Histórico versionado do esquema
  schema.prisma
```

## Banco local

O banco SQLite fica no arquivo `finance.db` na raiz do projeto. Esse arquivo é
local e não é versionado. A configuração padrão pode ser alterada por meio de
`DATABASE_URL` (veja `.env.example`).

`npm run db:setup` aplica as migrations e carrega os dados iniciais. O seed é
idempotente: cria a conta principal e categorias padrão sem inserir transações
de exemplo.

## Backup e restauração

Em **Backup** (`/backup`), baixe um JSON versionado com transações, categorias, contas, regras e snapshots patrimoniais. O navegador salva o arquivo na pasta de downloads configurada no sistema.

Ao restaurar, o Atlas valida a versão e as referências antes de substituir dados. Antes da troca, salva uma cópia de proteção em `backups/atlas-pre-restore-<data>.json`, dentro da pasta do banco SQLite. Com a configuração padrão `file:./finance.db`, esse diretório fica na raiz do projeto. Guarde também os arquivos JSON baixados fora do computador para ter uma cópia independente.

Valores são armazenados em centavos inteiros (`BigInt`), nunca em ponto
flutuante. Datas de transação usam `DateTime` e devem ser tratadas como instantes
UTC. O Atlas ainda não inclui autenticação nem integrações externas.
