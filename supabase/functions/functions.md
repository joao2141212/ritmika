# functions.md

Mapa canônico das Edge Functions do Ritmika.

## Subpastas

- `invite-user/`: convite autenticado de usuário com criação coordenada de Auth, membership e profile. Usa `SUPABASE_SECRET_KEY` apenas no runtime da função.
- `koru-chat/`: assistente Koru e leitura administrativa necessária ao contexto. Usa `SUPABASE_SECRET_KEY` apenas no runtime da função.

O frontend chama as funções com a sessão do usuário em `Authorization` e a chave pública em `apikey`. A secret `sb_secret_` nunca é JWT, nunca é enviada ao navegador e nunca deve ser colocada em `Authorization: Bearer`.
