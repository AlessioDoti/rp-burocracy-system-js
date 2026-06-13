# Postman collection

`burocracy-system.postman_collection.json` — import in Postman via **File → Import** (or drag the file into the Postman window).

## Variables

The collection ships with four collection-level variables. Override them in the **Variables** tab of the collection, or let the test scripts update them automatically.

| Variable      | Default                  | Auto-set by                       |
|---------------|--------------------------|-----------------------------------|
| `base_url`    | `http://localhost:8081`  | (manual)                          |
| `category_id` | `1`                      | `POST /category`                  |
| `activity_id` | `1`                      | `POST /activity/:categoryId`      |
| `tax_id`      | `1`                      | `POST /tax/:activityId`           |

## Suggested order

Run the requests inside each folder in the order they appear:

1. `Health → GET /health` — confirms the DB is reachable.
2. `Category → POST /category` — creates a category, sets `category_id`.
3. `Activity → POST /activity/:categoryId` — creates an activity, sets `activity_id`.
4. `Tax → POST /tax/:activityId` — files a declaration, sets `tax_id`.
5. All `GET` and `PATCH`/`DELETE` requests can then use `{{category_id}}`, `{{activity_id}}`, `{{tax_id}}`.

## Person System dependency

`POST /tax/:activityId` now requires `userId` instead of `managerName`/`managerSurname`/`personUuid`.
The burocracy system resolves the person UUID by calling the Person System (`GET /person/by-user/:userId` on port 8082).
Make sure the Person System is running on `http://localhost:8082` and that the userId exists.
Import `be/rp-person-system/postman/person-system.postman_collection.json` to test the person endpoints and create persons with known userIds.

## Collection Runner

The collection also runs end-to-end via **Runner → Burocracy System → Run**. Each request carries a `pm.test` assertion on the response code, so a failed run highlights which step broke.
