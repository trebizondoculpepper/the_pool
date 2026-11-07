# Ordered object descriptions from kind and live state — issue #44

Research for the owner, 2026-11-07. This answers [issue #44](https://github.com/trebizondoculpepper/the_pool/issues/44), separately from facet coverage ([#43](explicit-facet-coverage.md)) and interaction classes (#19). The examples below used the live `newWorld()` snapshot and the existing `plantInventory`/`describeForWorld` readers at `833611a2`; they are test snapshots, not claims about the user's current save.

## Answer

Keep a structured fact set as the primary output and generate one optional short sentence from it. The order should be **identity and kind → verified physical properties → location and purpose → current operation → condition or fault → measured values**. Operation before condition lets a reader answer “what is it doing?” before “how healthy is it?”, and matches today's sand-filter wording. The order is a rendering rule, not the trait resolver's precedence rule. Omit an unsupported adjective rather than inventing size, colour, material or operating state to make a sentence sound complete.

Each fact should retain `source` (`kind-trait`, `kind-metadata`, `authored-specification`, `geometry`, `placement`, `world-model`, `sensor` or `derived-model`), the source key, and a simulation timestamp for live facts. A model-derived “seems clean” is not a direct sensor measurement. Distinguish `unknown` (a reader exists but has no value), `unavailable` (the model has no reader), and `not-applicable` (the property cannot apply). A `null` value alone loses that distinction.

## Prior art

| Primary source                                                                                                                                                                             | Established practice                                                                                                                          | Limit for this task                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Inform 7 kinds and conditional descriptions](https://ganelson.github.io/inform-website/book/WI_3_5.html) and [varying values](https://ganelson.github.io/inform-website/book/WI_8_1.html) | Kinds supply properties; description text can change with a thing's state.                                                                    | It generates prose, but does not itself give an AI a separately provenanced plant-fact record.                                                   |
| [Home Assistant state objects](https://www.home-assistant.io/docs/configuration/state_object/)                                                                                             | An entity has a current state, attributes, `unknown` and `unavailable`; attributes can include a unit, attribution and an assumed-state flag. | State and metadata can share one record, so The Pool should mark each fact's source rather than assuming every attribute is permanent.           |
| [openHAB semantic model](https://www.openhab.org/docs/tutorial/model.html)                                                                                                                 | Equipment, points and properties can be related to a location and used to generate a user interface.                                          | Not all items need the semantic model; a missing point should not be filled with guessed status.                                                 |
| [W3C PROV-O](https://www.w3.org/TR/prov-o/)                                                                                                                                                | Generated facts can be linked to source entities and generation time.                                                                         | A compact local `source` record is sufficient here; the full ontology is unnecessary unless facts leave the game for a larger provenance system. |

Conditional prose, structured live state, semantic equipment relationships and provenance are established separately. Their combination in one read-only browser report for this particular simulation is the proposed local design; the survey does not establish a universal English adjective order.

## Current project seams

`src/game/plant/equipment-kinds.ts` gives each kind its `type`, `purpose`, brand, traits and a status policy. `component-descriptions.ts` supplies tag, ordinal, room and template. `component-status.ts` binds supported tags to world state and leaves an unbound item without a status rather than calling it Off. The diagnostics report already has `stateAvailable` for indexed equipment. These are good inputs for one fact assembler, with the prose and browser-readable report as two renderings of that assembler. Geometry may provide dimensions, but it should not be treated as proof of colour or material when a texture or lighting changes them; only vetted specifications or authored metadata should label those properties.

## Four worked examples

| Subject                    | Proven facts from today's code                                                                                                                                                               | Deliberately omitted                                                                                                              | Short sentence at the test snapshot                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `PL2-F1`, sand filter      | Kind `sand-filter`, `cylindrical`, `floor-standing`, Lidoluxe (`kind`); Plant Room 2 and ordinal 1 (`catalogue`); filtering and bed seems clean (`world-model` through `filterConditionOf`). | Exact size, white colour and metal material: no verified semantic value.                                                          | “PL2-F1 is the first sand filter in Plant Room 2; it is filtering, and its bed seems clean.”       |
| `PL2-OZ1`, ozone generator | Kind `ozone-generator`, `box-like`, `floor-standing`, Trioxa (`kind`); Plant Room 2 (`catalogue`); power service derived from ports (`audit`).                                               | Current running state: `status: none` and no reliable description binding. Exact size, colour and material also unavailable.      | “PL2-OZ1 is the ozone generator in Plant Room 2.”                                                  |
| A `sign` kind              | `panel-like`, `wall-mounted`, `fixed`, `readable` (`kind`).                                                                                                                                  | Its words and room require a particular placed sign; generic kind data cannot supply them. No operation or condition is modelled. | “A wall-mounted sign.” Only a placed instance may be described more specifically.                  |
| A `software-box` kind      | `box-like`, `holdable`, `rackable`, `stackable` (`kind`); title may come from its bound instance.                                                                                            | Its present support or room after pickup requires live item location; artwork is not verified material/colour metadata.           | “A software box.” A bound title and current location may be added only when their readers resolve. |

The existing description reader returned “The 1st sand filter in Plant Room 2: the tank is filtering, and seems clean” for `PL2-F1` and “The only ozone generator in Plant Room 2” for `PL2-OZ1`. These examples demonstrate that operation and condition are already available for some equipment, while a missing reader remains missing.

One possible structured output for `PL2-F1` at that snapshot is:

```json
{
  "id": "PL2-F1",
  "kind": "sand-filter",
  "simulationTimeSeconds": 0,
  "facts": [
    {
      "key": "form",
      "value": "cylindrical",
      "source": "kind-trait",
      "sourceKey": "sand-filter/filter-like"
    },
    {
      "key": "location",
      "value": "Plant Room 2",
      "source": "placement",
      "sourceKey": "PL2-F1"
    },
    {
      "key": "operation",
      "value": "filtering",
      "source": "world-model",
      "sourceKey": "pool_02/filter_1"
    },
    {
      "key": "bedCondition",
      "value": "seems clean",
      "source": "derived-model",
      "sourceKey": "filterConditionOf"
    }
  ],
  "missing": [
    { "key": "colour", "reason": "unavailable" },
    { "key": "material", "reason": "unavailable" },
    { "key": "dimensions", "reason": "unavailable" }
  ],
  "summary": "PL2-F1 is the first sand filter in Plant Room 2; it is filtering, and its bed seems clean."
}
```

The `sourceKey` values in this sketch identify the responsible model path or reader; implementation should use the project's actual stable path identifiers, rather than copying this illustrative `pool_02/filter_1` string as an existing graph address.

## Recommended follow-up

Build a pure `objectFacts(subject, world)` selector from the registry, catalogue, model and existing diagnostics readers. Render the structured facts and the short sentence from that one selector; do not keep a second description state. Test a changing sand-filter bed, an ozone unit without a reader, a placed sign with known text, and a moved software box. In the browser report, include the fact keys and source labels as selectable DOM text, with a bounded count of subjects per section so a read-only agent can see what was reported and what was unavailable. This research does not implement the selector.
