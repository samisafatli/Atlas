# Contexto do Atlas

Atualizado em 28/09/2026. Leia este documento antes de alterar regras financeiras.
Ele registra decisões do usuário, não substitui a inspeção do código e do banco atuais.

## Objetivo e período

Preferência de interface: manter telas concisas, sem blocos didáticos sobre regras internas ou avisos financeiros repetidos. As explicações ficam nesta documentação. Preservar mensagens de erro, estados vazios, indicações específicas de estimativa e consequências de ações destrutivas. Os avisos extensos de acompanhamento/histórico no dashboard foram removidos a pedido do usuário; o marco de setembro continua válido para regras e revisões de dados.

Aplicativo pessoal, inicialmente para o proprietário e futuramente sua namorada; não é um SaaS.
O acompanhamento deliberado começa em **setembro/2026**. Meses anteriores são histórico aproximado e não precisam ficar perfeitamente classificados. Não confundir essa data com certificação de que setembro ou meses seguintes estão completos.

O escopo é o Nubank: faturas do cartão e extratos da conta. Compras e parcelas usam a data dos arquivos; o resultado mensal combina essas despesas com o extrato e não equivale ao saldo bancário, ao caixa disponível ou à fatura a pagar. Fatura e extrato do período são necessários; importações parciais não fecham um mês.

## Decisões financeiras confirmadas

- Safatli Technologies: salário PJ relacionado ao trabalho na Monety.
- Entradas de Sami Safatli identificadas como Caixa: salário repassado, por decisão do usuário para este escopo. Ele paga o financiamento na Caixa e transfere o restante. Não importa extratos da Caixa. Não deduzir o financiamento novamente desse valor.
- Outros movimentos de Sami não são automaticamente salário. As saídas de setembro confirmadas como envio à própria Caixa foram corrigidas individualmente para transferência; não extrapolar para meses antigos sem confirmação.
- Aplicações e resgates RDB: movimentos de investimento, fora de receitas/despesas. Não inferir principal, rendimento ou propriedade da caixinha a partir desses movimentos.
- Pagamento da fatura: transferência, evitando contar a compra e o pagamento como duas despesas.
- Mouna é a mãe do usuário. Os valores recebidos são administrados para ela, não doações ou salário. BAP Administração, Claro e Prevent Senior no extrato foram confirmados como pagamentos dela. Nenhuma regra de propriedade deve ser aplicada a comerciantes do cartão por mera semelhança.
- A conta Itaú do usuário é usada pela mãe. Pix recebidos de “Sami Safatli” vindos do Itaú são dinheiro dela: regra fixa `MOTHER_INCOME` em `src/lib/personal-rules.ts` (somente entradas do extrato; saídas para o Itaú não são classificadas automaticamente). Confirmado em 01/10/2026 e aplicado também ao histórico: nove entradas de jan–set/2026, R$ 37.320, deixaram de contar como receita. A Aplicação RDB de R$ 5.000 em 27/09 foi confirmada como poupança da mãe; isso não define a propriedade de outras aplicações ou resgates RDB.
- O usuário às vezes adianta dinheiro à mãe. Os tipos `MOTHER_*` excluem os valores dos totais pessoais, mas **não implementam controle de dívida/reembolso entre eles**.
- Light/Naturgy são pagos para ambos. O usuário autorizou uma divisão aproximada no histórico quando havia dois pagamentos por fornecedor, conta e mês. Isso foi uma revisão pontual até 28/09/2026, não regra automática futura.
- A parte considerada pessoal fica em Moradia, com `ownershipEstimated=true`. A categoria “Moradia — divisão estimada” foi removida. Valores já estimados continuam sendo estimativas.
- Paula participa de gastos compartilhados: devoluções recebidas são `REFUND`; a parte paga pelo usuário a ela é `EXPENSE`. Setembro foi ajustado conforme confirmação. O reembolso do hotel de viagem futura foi registrado na data recebida, não transferido para o mês da viagem. “Gastos compartilhados” é aproximação de categoria quando a composição não foi separada. Não aplicar a todos os meses por nome sem revisar.
- Nabil é irmão do usuário. Um pagamento e uma devolução correspondentes de setembro foram confirmados como adiantamento integral e excluídos do resultado. Isso não autoriza uma regra genérica para todo Nabil.
- Reforma foi confirmada para pagamentos específicos; não presumir que todo Pix a esses profissionais será sempre reforma.

## Funcionamento e manutenção

- Next.js, Prisma 7 e SQLite. Banco local `finance.db` conforme `DATABASE_URL`; parar o servidor não apaga os dados. Código Git não transfere automaticamente banco ou backups.
- Migrações: `npx prisma migrate deploy --config prisma7.config.ts`; cliente: `npx prisma generate --config prisma7.config.ts`.
- Testes: `npm test` usa banco temporário isolado. Também executar `npm run lint` e `npm run build` para mudanças relevantes.
- Leia as APIs da versão instalada de Next em `node_modules/next/dist/docs/`.
- CSV de cartão e extrato, OFX e múltiplos arquivos são suportados. Identificador bancário prevalece na deduplicação. Sem identificador, ocorrências idênticas são contadas por arquivo; arquivos parciais separados podem continuar ambíguos. Prefira arquivos completos. Preserve fingerprints ao corrigir classificações manuais.
- `src/lib/transaction-types.ts`: tipos e impacto no resultado. `categoryType` define quando uma categoria é aplicável.
- `src/lib/personal-rules.ts`: regras pessoais fixas, diferentes das regras de categoria editáveis. Salários são atribuídos a categorias pelo nome; renomeá-las não atualiza automaticamente essas regras fixas.
- `src/lib/category-rules.ts`: regras de substring, sem distinção de maiúsculas; termo mais longo ganha. Alteram categoria, não tipo nem propriedade.
- Observação (`note`): texto opcional do usuário para lembrar o contexto de um lançamento. Aparece no lugar da descrição na lista, sem alterá-la; a descrição bancária continua sendo a base de regras, deduplicação e reparos. Na edição de uma parcela (“Parcela n/N”), o formulário sugere aplicar a mesma observação às outras parcelas da compra (mesma descrição base, total de parcelas, valor com até 1 centavo de diferença e datas mês a mês); casos ambíguos não são sugeridos.
- `/categorias`: criar, renomear e excluir categorias sem uso. Categorias de estorno são de despesa. Tipos sem categoria mostram “Não se aplica”; filtro “Sem categoria” só inclui os tipos categorizáveis.
- Backups JSON incluem dados e estimativas; operações destrutivas têm cópia de proteção. Fazer backup antes de revisões em lote. Não versionar banco, backups ou documentos financeiros pessoais.
- `scripts/review-tracking-start.mjs`: instalação explícita das regras específicas de setembro e correção de estornos de compra no débito desde 01/09/2026. Não executar automaticamente no startup. Preserva regras existentes (inclusive desabilitadas) e categorias já atribuídas.

## Próximas revisões

- Conferir setembro com fatura e extrato completos; separar tipo errado (afeta indicadores) de categoria ausente (afeta distribuição).
- Resolver somente ambiguidades confirmadas pelo usuário. Não classificar Pix por nome de pessoa ou intermediário de pagamentos sem contexto.
- Cobertura por mês: o dashboard mostra, para cartão e conta, quantos lançamentos importados existem no mês e o intervalo de dias (`src/lib/import-coverage.ts`); origem ausente aparece destacada. Isso indica o que foi importado, não certifica completude: lançamentos de cartão usam a data da compra, e manuais não entram. Abril e junho/2026 parecem não ter fatura completa.
- Regras pessoais configuráveis por pessoa antes de incluir a namorada. Adiado por decisão do usuário em 28/09/2026: não há plano de incluir a conta dela por enquanto; não priorizar.
- Ao restaurar backups muito antigos, revisar compatibilidade: eles podem reintroduzir categorias antigas; migrar o esquema não reexecuta transformações de dados já aplicadas.
- Registrar novas decisões aqui. Assistentes externos não têm acesso automático à conversa que originou essas regras.

## Revisão aplicada em 28/09/2026

- Instaladas 11 regras específicas para Uber Trip, Mundial (duas grafias), Netflix (duas grafias), Claude, Obramax, Sua Academia, Telefônica/Vivo (duas grafias) e metrô. Três lançamentos desde setembro receberam categoria; nenhuma categoria já atribuída foi substituída.
- O parser compartilhado por CSV de extrato e OFX agora reconhece créditos explicitamente descritos como estorno de compra no débito (inclusive ajuste). Na base revisada não havia correções desse tipo a aplicar desde setembro. Casos anteriores ficaram intactos por decisão de escopo.
- O dashboard chegou a distinguir histórico aproximado de período em acompanhamento, mas esses avisos foram removidos depois a pedido do usuário. `isApproximateMonth` (`src/lib/tracking-period.ts`) está sem uso na interface; `TRACKING_START_DATE` segue usado pela revisão de setembro.
- Setembro tinha 123 lançamentos, com fatura e extrato e última data registrada em 27/09. Na revisão havia 25 lançamentos categorizáveis sem categoria e duas atribuições de propriedade estimadas. Em consulta posterior no mesmo dia, nenhum lançamento categorizável desde setembro estava sem categoria e havia uma estimativa de propriedade desde setembro (dez no total); após a revisão do gás, duas desde setembro. Esses números são fotografias e devem ser consultados novamente no banco.
- Pendências de setembro resolvidas com o usuário em 28/09/2026 (decisões pontuais, não regras para outros meses):
  - COMFY (01/09, R$ 1.293,51): compra de uma cadeira. Despesa em Compras.
  - Luis Eduardo M P Carvalho (06/09, R$ 350,00): pagamento ao contador, feito da conta pessoal. Despesa em Outros. Os próximos pagamentos serão feitos pela PJ; não presumir que Pix a ele no extrato pessoal é contador sem confirmação.
  - PJBANK (08/09, R$ 767,85): condomínio do usuário. Despesa em Moradia. PJBANK é intermediário de boletos; não associar todo PJBANK a condomínio.
  - Gás Naturgy/CEG: três pagamentos (04/09: R$ 66,98 e R$ 66,72; 10/09: R$ 129,35). O usuário informou cerca de R$ 130 para cada um, sem precisar qual conta é de quem, e escolheu divisão estimada. Aplicado: R$ 129,35 como despesa pessoal em Moradia com `ownershipEstimated=true`; os dois de ~R$ 67 como `MOTHER_ESTIMATED_EXPENSE`. A atribuição de lados é arbitrária (diferença de R$ 4,35) e continua sendo estimativa.
- Cobertura do histórico aproximado: abril/2026 não tem lançamentos de cartão e junho/2026 tem apenas seis, o que sugere faturas ausentes. Outubro e novembro têm só as parcelas futuras de uma compra Mercado Livre, trazidas pela fatura. Comparações com esses meses são pouco confiáveis.
- Os testes de importação/reimportação, classificação limitada ao período e preservação de categorias manuais passaram; isso não substitui a conferência do mês com o usuário.
