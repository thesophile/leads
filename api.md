# External Orders API

Read-only endpoints for external systems (ERP / accounting / reporting) backed
by the shared API key.

## Authentication

Send the API key (set via the `EXTERNAL_ORDERS_API_KEY` environment variable) as:

- `Authorization: Bearer <key>`, or
- `X-API-Key: <key>`

Requests without a valid key return `403`.

## Endpoint

### `GET /api/external/orders/`

Returns orders newest-first, paginated.

Query params:

| Param | Type | Description |
| --- | --- | --- |
| `page` | int | Page number (default `1`). |
| `page_size` | int | Results per page (default `20`). |
| `company` | string | Case-insensitive substring filter on the company name. |

Response shape:

```json
{
  "count": 12,
  "page": 1,
  "page_size": 20,
  "results": [
    {
      "order_id": "ORD-692711082026B",
      "company": "Acme Corp",
      "order_value": "45000",
      "order_date": "2026-09-25",
      "order_created_at": "2026-09-25T10:15:00.000000+05:30",
      "delivery_date": "2026-10-30",
      "sales_person": "Malavika"
    }
  ]
}
```

Field notes:

- `order_id` — order number normalized to a single `ORD-` prefix. The stored
  internal id may already carry an `ORDQTN` / `QTN` / `ORD` marker (orders
  derived from a quotation keep the quotation's id); that marker is stripped
  and re-applied once, so consuming systems always see a stable shape:
  `ORDQTN692711082026B` → `ORD-692711082026B`, `QTN-030001` → `ORD-030001`,
  `ORD-1` → `ORD-1`.
- `order_value` — order net value (after discount), as stored.
- `order_date` / `delivery_date` — ISO dates (`YYYY-MM-DD`); empty when unset.
- `order_created_at` — ISO 8601 timestamp of when the order record was created
  (the true "time of order creation" backing the Age column; `order_date` is
  often empty because it is free-text).
- `delivery_date` — internal expected delivery date, manually entered on the Manage Orders screen. It is **not** shown to clients or included in the order form / proposal / PDF.
- `sales_person` — the telecaller who changed the lead status to "Quotation Requested".

### `GET /api/external/customers/`

Read-only shared customers master (`transactions_clientdetail`), used by
Account Soft for the Customers section. Returns every client-detail row across
tenants, newest-first, paginated.

Query params:

| Param | Type | Description |
| --- | --- | --- |
| `page` | int | Page number (default `1`). |
| `page_size` | int | Results per page (default `100`, max `500`). |

Response shape (DRF-style paginated envelope):

```json
{
  "count": 12,
  "page": 1,
  "page_size": 100,
  "next": "https://<base>/api/external/customers/?page=2&page_size=100",
  "previous": null,
  "results": [
    {
      "id": "CD-000123",
      "customer_id": "ACM-1f2a9c",
      "company": "Acme Corp",
      "client_name": "Alice",
      "mobile": "9447000001",
      "email": "a@acme.com",
      "category": "Hospital",
      "status": "Details Complete"
    }
  ]
}
```

Field notes:

- `id` — primary key of `transactions_clientdetail` (one record per order).
- `customer_id` — stable, unique id **per company**: 3-letter prefix from the
  company name (inappropriate combinations avoided) + 6 hex chars derived from
  the name, e.g. `ACM-1f2a9c`. All client-detail rows of the same company
  share one `customer_id`, so the same customer across multiple orders has a
  single id. Use this as the customer key, not `id`.
- `company` — the customer's company name.
- `client_name` — customer contact name (`client_name` column).
- `mobile` / `email` — customer contact details.
- `category` — service category (blank when unset).
- `status` — one of the `transactions_clientdetail.status` values, e.g. `Details Pending`, `Details Complete`, `In Progress`, `Completed`, `Paid`.