# Atlas

Aplicativo financeiro pessoal local-first com transações manuais, importação
Nubank CSV, categorias e regras, dashboard mensal, identificação de recorrências,
histórico patrimonial e backup/restauração em JSON.

O resultado do período no dashboard é receitas menos despesas líquidas do mês
selecionado. Créditos/estornos reduzem despesas; transferências, pagamentos de
fatura, movimentos RDB e valores administrados para a mãe ficam fora do
resultado. Isso não é saldo bancário: não inclui saldo inicial, contas
patrimoniais nem movimentações ausentes.

Decisões financeiras pessoais (classificações por pessoa, marco de
acompanhamento em setembro/2026 e estimativas) estão em
[`docs/CONTEXTO.md`](docs/CONTEXTO.md).

## Fatura e extrato da conta

Aplicação RDB e Resgate RDB são movimentos de investimento separados, fora de
receitas e despesas, tanto em CSV quanto em OFX. O resgate inteiro não é tratado
como rendimento. Esses movimentos não identificam a caixinha ou seu titular e
não atualizam os snapshots de patrimônio; informe os saldos manualmente.
Para corrigir lançamentos antigos do extrato, execute `node scripts/repair-rdb.mjs`:
o procedimento cria um backup JSON antes de reclassificar, mantém os valores e
identificadores e pode ser repetido sem duplicar ou alterar novamente os dados.

A tela **Importar** aceita seleção ou arraste de vários CSVs/OFXs
ao mesmo tempo (até 50 arquivos, 20 MB no total e 50.000 lançamentos).
Revise o resumo por arquivo e escolha uma conta de destino para todo o lote.
Arquivos de contas diferentes devem ser importados em lotes separados.
A deduplicação considera o banco e os demais arquivos selecionados. Cada
arquivo mantém seu registro no histórico; qualquer falha cancela o lote inteiro.

- **OFX da conta:** envie o `.ofx` em **Importar**, no mesmo fluxo do
  CSV. Aceita um extrato bancário em BRL por arquivo, com campos XML ou SGML.
  Mantém a data bancária e usa `FITID` para evitar reimportações na mesma conta.
  CSV e OFX só são reconhecidos como o mesmo lançamento quando compartilham o
  identificador. Não importe a mesma movimentação nos dois formatos quando os
  identificadores forem diferentes. Pagamento explícito de fatura fica fora do
  resultado; revise transferências próprias e reembolsos antes de analisar as
  receitas. Saldo informado pelo OFX não é importado como receita ou patrimônio.

- **Fatura:** colunas `date,title,amount`. Cobranças positivas são despesas;
  negativos são créditos/estornos, exceto `Pagamento recebido`, tratado como
  pagamento de fatura, sem efeito no resultado.
- **Conta:** colunas `Data,Valor,Descrição` e, quando disponível, `Identificador`.
  Débito/Pix enviados são despesas; valores recebidos são receitas. Descrições
  explícitas de pagamento de fatura são transferências e estornos de compra no
  débito são créditos/estornos. Algumas descrições do extrato seguem regras
  pessoais fixas (`src/lib/personal-rules.ts`), descritas em `docs/CONTEXTO.md`. Revise Pix entre suas
  próprias contas e reembolsos em **Transações → Editar → Tipo**: o texto sozinho
  não comprova quem é o titular da outra conta.
- Importe os dois arquivos para cobrir crédito e débito. O preview mostra a
  origem e os totais antes de salvar. Arquivos ambíguos e linhas inválidas geram
  erro; nenhuma linha é descartada silenciosamente.
- Parcelas usam valor e data presentes no CSV; não há projeção de parcelas
  futuras, conciliação automática ou cálculo do saldo da fatura a pagar.
- A deduplicação separa conta/origem. Usa o identificador bancário quando
  disponível; sem identificador, lançamentos idênticos em data, descrição,
  valor e natureza continuam indistinguíveis. Confira esse caso no preview.

## Atualizar e reparar uma importação antiga

Após atualizar o código, aplique as migrations e gere o client:

```bash
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
```

Reinicie o servidor. Importações da versão antiga aparecem no histórico como
pendentes de revisão e bloqueiam novas importações na mesma conta até o reparo.
Com o ID do lote original, execute:

```bash
node scripts/repair-import.mjs ID_DO_LOTE "caminho/arquivo-original.csv"
```

O comando cria uma cópia SQLite consistente em `backups/` antes de atualizar o
lote, preserva IDs e categorias compatíveis e compara cada linha com os dados
originais. Divergências, edições manuais ou correspondências ambíguas cancelam
a operação inteira. Executar novamente um lote corrigido não altera os dados.
O CSV deve ser o original completo; não use um arquivo de outro período.

Backups JSON novos usam versão 2, incluindo origem e identificador. A restauração
aceita também versão 1 e sinaliza os lotes antigos como pendentes de revisão.

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
  app/        Rotas, telas, server actions e API de backup
  lib/        Banco, importação, deduplicação, regras e backup
prisma/
  migrations/ Histórico versionado do esquema
  schema.prisma
scripts/      Manutenções explícitas (reparos e revisão de setembro)
tests/        Testes com SQLite temporário
docs/         Contexto e decisões financeiras
```

## Banco local

O banco SQLite fica no arquivo `finance.db` na raiz do projeto. Esse arquivo é
local e não é versionado. A configuração padrão pode ser alterada por meio de
`DATABASE_URL` (veja `.env.example`).

`npm run db:setup` aplica as migrations e carrega os dados iniciais. O seed é
idempotente: cria a conta principal e categorias padrão sem inserir transações
de exemplo.

## Backup e restauração

Em **Configurações → Backup → Limpar dados**, escolha limpar somente lançamentos/importações
(incluindo lançamentos manuais, preservando contas, categorias, regras e patrimônio)
ou resetar tudo (recriando apenas a conta principal e as categorias padrão).
Digite `LIMPAR` e confirme a operação. Antes de excluir, o Atlas salva um JSON
completo em `backups/atlas-pre-clear-*.json`. Se a cópia falhar, nada é apagado.
Os CSVs e backups existentes não são removidos.

Restaurar um JSON substitui toda a base pelo estado do arquivo, sem mesclar dados.
Para desfazer uma limpeza, selecione seu JSON de proteção no formulário de
restauração. A própria restauração também cria uma cópia do estado anterior.

Em **Configurações → Backup** (`/backup`), baixe um JSON versionado com transações, categorias, contas, regras e snapshots patrimoniais. O navegador salva o arquivo na pasta de downloads configurada no sistema.

Ao restaurar, o Atlas valida a versão e as referências antes de substituir dados. Antes da troca, salva uma cópia de proteção em `backups/atlas-pre-restore-<data>.json`, dentro da pasta do banco SQLite. Com a configuração padrão `file:./finance.db`, esse diretório fica na raiz do projeto. Guarde também os arquivos JSON baixados fora do computador para ter uma cópia independente.

Valores são armazenados em centavos inteiros (`BigInt`), nunca em ponto
flutuante. Datas de transação usam `DateTime` e devem ser tratadas como instantes
UTC. O Atlas ainda não inclui autenticação nem integrações externas.
