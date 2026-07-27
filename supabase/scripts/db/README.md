# Operações de banco do Ritmika

Todas as operações Supabase do Ritmika devem ficar nesta árvore e ser
executadas por um script versionado:

- `read/`: consultas somente leitura, com saída compacta.
- `write/`: migrações e escritas explícitas, com confirmação local.

Os scripts carregam `SUPABASE_DB_URL` de `/Users/pedroduarte/Documents/ritmika/.env`
sem imprimir o valor. Para usar outro arquivo de ambiente, defina
`RITMIKA_DB_ENV_FILE` antes da chamada.

## Leitura operacional

O check canônico reúne a janela do dashboard, o schema de evidências, as
referências históricas e as contagens operacionais em uma única consulta:

```bash
bash supabase/scripts/db/read/run.sh \
  supabase/scripts/db/read/verify_operational_state.sql
```

## Escrita/migration

Escritas não aceitam SQL arbitrário por padrão. Cada migration deve ter um
wrapper nomeado em `write/`, e o wrapper exige confirmação explícita antes de
chamar o executor:

```bash
bash supabase/scripts/db/write/apply_historical_evidence_refs.sh
```

Não colocar credenciais, respostas de clientes ou URLs privadas neste
diretório. O Koncluí continua sendo somente fonte de leitura.
