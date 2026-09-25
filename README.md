# Atlas

Aplicativo financeiro pessoal local-first. O projeto está sendo construído em
pequenas etapas; esta versão contém a fundação e a persistência local inicial.

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
npm run format
npm run build
npm run db:seed
```

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

Valores são armazenados em centavos inteiros (`BigInt`), nunca em ponto
flutuante. Datas de transação usam `DateTime` e devem ser tratadas como instantes
UTC. O Atlas ainda não inclui autenticação nem integrações externas.
