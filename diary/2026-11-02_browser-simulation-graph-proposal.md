# Browser simulation graph proposal — 2026-11-02

The owner asked for a separate, discussion-stage mission after ChatGPT showed that live plant measurements alone did not reveal how Dr Aqualis connects to dosing equipment and water. I inspected mission 138's pure graph, mission 134's narrower schematic `getConnections()` reader, the browser report and the plant-model guidance, then wrote mission 141 as a technical proposal.

ChatGPT replied that its tool can only list open tabs and read their existing content. I revised the proposal: deep links and JavaScript queries are secondary adapters; the actual agent needs a compact atlas and automatically selected, self-contained fault bundles in the already open page. The brief asks for measured extraction limits, distinguishes executing bindings from schematic-only edges, and says plainly that an unseen silent fault cannot be guaranteed diagnosable if its graph facts are omitted. No runtime code was changed.
