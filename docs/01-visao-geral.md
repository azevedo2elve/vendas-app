# 01 — Visão Geral do Produto

## 📌 O que é o produto

O **Força de Vendas Offline** é um aplicativo mobile (React Native + Expo) voltado para microempreendedores individuais (MEIs), representantes comerciais autônomos e pequenas equipes de vendas externas que precisam registrar pedidos em campo — em regiões com internet instável ou inexistente — e emitir documentos profissionais na hora, sem depender de servidor.

O app resolve um problema muito concreto: vendedor visita cliente, monta o pedido, e precisa sair de lá com um PDF em mãos (ou enviado por WhatsApp) sem esperar sincronização com nuvem, sem travar por falta de sinal, e sem risco de perder a venda por causa de um app que exige conexão.

## 🎯 Proposta de valor

| Dor do microempreendedor | Como o app resolve |
|---|---|
| Internet instável em áreas rurais/periferia | Banco de dados 100% local (WatermelonDB/SQLite) — nenhuma operação do dia a dia depende de rede |
| Pedido feito no caderno, perdido ou ilegível | Cadastro estruturado de clientes/produtos com carrinho e cálculo automático de totais e descontos |
| Cliente pede confirmação imediata do pedido | PDF profissional gerado na hora, compartilhado via WhatsApp/e-mail direto do celular |
| Medo de perder dados do celular | Backup/restore local em JSON, sob controle do próprio usuário |
| Softwares de gestão são caros e complexos | App enxuto, focado no fluxo essencial: cliente → produto → pedido → PDF |

## 🔑 Princípio central: Offline-first

Diferente de apps que são "online com cache", este app é **offline por padrão** e só toca a rede em um único cenário: a validação/renovação da licença de uso quando ela vence (ver [docs/04-sistema-licenca.md](./04-sistema-licenca.md)). Todo o restante — cadastro de clientes, produtos, montagem de pedidos, geração de PDF — funciona sem qualquer chamada de rede.

Isso implica decisões de arquitetura específicas:
- Banco local (WatermelonDB) como única fonte de verdade em tempo de uso — não há sincronização com backend nos módulos de negócio.
- PDF gerado localmente no dispositivo (`expo-print`), não em um serviço remoto.
- Compartilhamento via intents nativos do sistema operacional (`expo-sharing`), não via API própria de envio.

## 👤 Persona principal

**O vendedor de rua / representante autônomo**
- Usa o celular como ferramenta de trabalho principal.
- Visita múltiplos clientes por dia, muitas vezes em áreas sem 4G/Wi-Fi confiável.
- Precisa de velocidade: cadastrar um pedido em menos de 2 minutos.
- Não tem paciência (nem necessidade) para telas complexas de ERP.
- Quer sair da visita com um documento em PDF já no WhatsApp do cliente.

## 🔄 Fluxo de uso típico (jornada do vendedor)

```text
1. Abre o app
   └─ Sistema valida licença localmente (sem rede, se ainda válida)

2. Tela inicial / Dashboard
   └─ Acesso rápido a: Clientes, Produtos, Nova Ordem de Venda

3. Nova Ordem de Venda
   ├─ Seleciona (ou cadastra na hora) o Cliente
   ├─ Adiciona Produtos ao carrinho
   │    └─ Define quantidade e desconto por item
   ├─ Revisa o Resumo (subtotal, descontos, total)
   └─ Confirma → Ordem persistida no WatermelonDB

4. Geração do documento
   ├─ App gera PDF A4 com dados da ordem
   └─ Abre menu nativo de compartilhamento
        ├─ Envia via WhatsApp direto para o contato do cliente
        └─ Ou envia por e-mail / salva localmente

5. Fim do dia
   └─ Vendedor pode exportar backup (JSON) dos dados do período
```

## 🧭 Fora de escopo (por design)

Para manter o app enxuto e verdadeiramente offline-first, os seguintes itens **não** fazem parte do escopo atual:
- Sincronização multi-dispositivo / multi-usuário em tempo real.
- Emissão fiscal (NF-e, NFC-e) — o documento gerado é uma **ordem de venda**, não uma nota fiscal.
- Controle de estoque avançado (reservas, múltiplos depósitos).
- Pagamentos integrados (gateway de pagamento, split, etc.).
- Dashboard analítico/BI em nuvem.

Esses itens podem vir a integrar um roadmap futuro, mas qualquer decisão de adicioná-los deve ser avaliada com cuidado para não comprometer o funcionamento 100% offline dos módulos essenciais.

## 📎 Documentos relacionados

- Arquitetura técnica: [docs/02-arquitetura.md](./02-arquitetura.md)
- Modelagem de dados: [docs/03-banco-de-dados.md](./03-banco-de-dados.md)
- Regras de licenciamento: [docs/04-sistema-licenca.md](./04-sistema-licenca.md)
- Telas e módulos: [docs/05-modulos-telas.md](./05-modulos-telas.md)
- Changelog: [docs/06-changelog-tarefas.md](./06-changelog-tarefas.md)
