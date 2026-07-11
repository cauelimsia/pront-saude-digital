# ADR-0004 — SSE (não WebSocket) para tempo real

Data: 2026-07-11 · Status: aceita

## Decisão
Tempo real via Server-Sent Events: worker publica eventos pequenos
(`opportunity.activated|updated|expired`) no canal Redis pub/sub; a API os
retransmite em `GET /surebets/stream`; o dashboard refaz o fetch da lista ao
receber um evento.

## Justificativa
Fluxo é unidirecional (servidor→cliente); SSE tem reconexão automática nativa
no `EventSource`, atravessa proxies HTTP e dispensa protocolo adicional.
Payload mínimo no stream evita divergência entre stream e REST.

## Consequências
Se surgir necessidade bidirecional (ex.: colaboração), reavaliar WebSocket.
