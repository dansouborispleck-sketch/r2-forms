# Changements attendus côté backend (`r2-forms-backend`)

La nouvelle interface (une seule page, paiement Gumroad par carte) attend les routes
ci-dessous. Toutes les routes `/api/*` marquées 🔒 exigent le jeton Supabase
(`Authorization: Bearer …`), comme aujourd'hui.

## Tarifs

| Cas | Prix |
| --- | --- |
| Premier formulaire du compte (toute taille) | gratuit |
| Génération (payée **avant** l'analyse) | 5 $ |
| Complément si le questionnaire dépasse 100 questions | +5 $ |

Le solde, les recharges, FedaPay et Kora disparaissent.

## Gumroad

- Un seul produit Gumroad à **5 $** (prix fixe, sans « pay what you want »).
  Le complément est un second achat du même produit.
- Dans les réglages Gumroad → *Advanced* → *Ping*, configurer l'URL
  `https://r2-forms-backend.onrender.com/api/gumroad/ping`.
- L'URL de checkout passe l'identifiant de commande :
  `https://<vendeur>.gumroad.com/l/<produit>?wanted=true&order_id=<id>&email=<email>`.
  Gumroad le renvoie dans le ping sous `url_params[order_id]`.
- Le ping n'est pas signé : vérifier `seller_id`, `product_id`, `price` (500 cents)
  et `refunded`, puis confirmer la vente via l'API (`GET /v2/sales/:sale_id` avec le
  jeton d'accès Gumroad) avant de marquer la commande payée. Une `sale_id` ne paie
  qu'une seule commande.

## Routes

### `POST /api/orders` 🔒
Corps : `{ kind, analysisId? }`. `kind` vaut `generation`, `supplement`,
`redeploy` ou `translation`.

Réponse : `{ orderId, free, amountUsd, checkoutUrl }`.
- `generation` : `free: true` si l'utilisateur n'a jamais utilisé son essai gratuit
  (la commande est alors directement à l'état `paid` et marquée « essai gratuit »).
- `supplement` : exige un `analysisId` appartenant à l'utilisateur et en attente de
  complément.
- `redeploy` / `translation` : prix à définir (renvoyer `free: true` pour gratuit).

### `GET /api/orders/:id` 🔒
`{ status: 'pending' | 'paid' | 'used' | 'refunded' }`. Seul le propriétaire peut
lire sa commande.

### `POST /api/gumroad/ping`
Webhook Gumroad (`application/x-www-form-urlencoded`), décrit ci-dessus.

### `POST /api/analyse` 🔒 (modifiée)
Corps habituel + `orderId`. La commande doit être `paid`, de type `generation`
et appartenir à l'utilisateur ; elle passe à `used`.
- Si le nombre de questions est ≤ 100, ou si la commande était l'essai gratuit :
  `{ status: 'ready', analysis_id, title, xlsform, media_associations, question_count }`.
- Sinon : `{ status: 'supplement_required', analysis_id, question_count }` **sans
  `xlsform`**. L'analyse est conservée côté serveur, invisible du client (pas de
  `xlsform_json` lisible dans `analyses` tant que le complément n'est pas payé).

Les champs `coherence_report`, `needs_review`, `warning` et `missing_choices_count`
ne sont plus utilisés par l'interface.

### `POST /api/analyse/release` 🔒 (nouvelle)
`{ analysisId, orderId }` : commande `supplement` payée pour cette analyse. Renvoie
la même forme que `status: 'ready'`.

### `POST /api/translate-xlsform` 🔒 (modifiée)
Accepte `orderId` (commande `translation`) au lieu de débiter un solde.

### `/api/redeploy-bill`
N'est plus appelée. Le redéploiement passe par une commande `redeploy`.

## Supabase

- `profiles.free_trial_used` (booléen, `false` par défaut) : l'interface s'en sert
  pour afficher « Offert » et éviter d'ouvrir la fenêtre de paiement inutilement.
- Table `orders` : `id`, `user_id`, `kind`, `analysis_id`, `status`, `free`,
  `amount_usd`, `gumroad_sale_id` (unique), `created_at`.
- `transactions` : enregistrer chaque paiement Gumroad avec `montant_usd` et
  `questionnaire_titre` (affichés dans « Mon compte → Paiements »).
- `analyses` / `deployments` : inchangées. L'historique et l'enregistrement des
  déploiements continuent de passer directement par Supabase.
